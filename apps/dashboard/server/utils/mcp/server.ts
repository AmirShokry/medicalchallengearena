/**
 * @fileoverview Builds the MCP server for the question-authoring connector.
 *
 * A fresh server is built per HTTP request (stateless Streamable HTTP), so this
 * holds no per-connection state — all cross-call state lives in Redis drafts.
 *
 * Tools (append-only; no update/delete is ever exposed):
 *   • list_systems_and_categories — read the DB so Claude targets a real system/category
 *   • upload_image                — host a Claude-generated SVG/raster image (imghippo) → URL
 *   • preview_cases               — validate (JSON or XML) + stage a draft, return an
 *                                   interactive MCP App panel AND a markdown fallback
 *   • commit_cases                — append the reviewed draft via block.addMany (one txn)
 *
 * Plus an `author_usmle_cases` prompt (the authoring playbook) and the
 * `ui://preview` App resource (the review panel).
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { appRouter } from "@/server/trpc/routers";
import { CASE_TYPES, type XmlImportInput } from "@/shared/schema/input";
import {
  jsonCaseSchema,
  prepareImport,
  validateCases,
  listSystemsAndCategories,
  saveDraft,
  loadDraft,
  deleteDraft,
  type CaseIssue,
  type SystemWithCategories,
} from "./cases";
import { uploadImage } from "./imghippo";
import { buildPreviewHtml, countQuestions } from "./preview";
import { AUTHORING_GUIDE } from "./guide";

export type BuildServerOptions = {
  /** imghippo API key (runtimeConfig.public.imageApiKey). */
  imageApiKey: string;
};

/* ───────────────────────── helpers ───────────────────────── */

function textResult(text: string, structuredContent?: unknown): CallToolResult {
  return structuredContent === undefined
    ? { content: [{ type: "text", text }] }
    : { content: [{ type: "text", text }], structuredContent: structuredContent as Record<string, unknown> };
}

function errorResult(text: string): CallToolResult {
  return { isError: true, content: [{ type: "text", text }] };
}

function formatSystemsList(systems: SystemWithCategories[]): string {
  if (!systems.length) return "No systems exist yet.";
  return systems
    .map((s) => {
      const cats = s.categories.length
        ? s.categories.map((c) => c.name).join(", ")
        : "(no categories)";
      return `- ${s.name}: ${cats}`;
    })
    .join("\n");
}

function formatIssues(issues: CaseIssue[]): string {
  return issues.map((i) => `• ${i.where}: ${i.message}`).join("\n");
}

/* ───────────────────────── server ───────────────────────── */

export function buildMcpServer(opts: BuildServerOptions): McpServer {
  const server = new McpServer({
    name: "medical-challenge-arena",
    version: "1.0.0",
  });

  /* 1) list_systems_and_categories ---------------------------------- */
  server.registerTool(
    "list_systems_and_categories",
    {
      title: "List systems & categories",
      description:
        "List every system and its categories that exist on the platform. " +
        "ALWAYS call this first and target an existing system + category exactly " +
        "(names are case-sensitive). New systems/categories cannot be created here.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (): Promise<CallToolResult> => {
      const systems = await listSystemsAndCategories();
      return textResult(
        `Existing systems and their categories:\n\n${formatSystemsList(systems)}`,
        { systems }
      );
    }
  );

  /* 2) upload_image ------------------------------------------------- */
  server.registerTool(
    "upload_image",
    {
      title: "Upload image",
      description:
        "Host one image and return its public https URL, for use in case/question/" +
        "explanation images. Provide EITHER `svg` (preferred for generated diagrams) " +
        "OR `base64` (raster; may be a data: URL). Upload every image BEFORE preview_cases " +
        "and embed only the returned URLs (raw SVG/data URIs are rejected by validation).",
      inputSchema: {
        svg: z.string().optional().describe("SVG markup to host as image/svg+xml."),
        base64: z
          .string()
          .optional()
          .describe("Raw base64 or a full data:<mime>;base64,... URL."),
        mimeType: z
          .string()
          .optional()
          .describe("MIME type for base64 input (default image/png)."),
        filename: z.string().optional(),
      },
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    async (args): Promise<CallToolResult> => {
      try {
        const { url } = await uploadImage(opts.imageApiKey, args);
        return textResult(url, { url });
      } catch (e) {
        return errorResult((e as Error).message);
      }
    }
  );

  /* 3) preview_cases — validate, stage a draft, and return a complete styled
     HTML document for the host to render as an artifact (the side-panel review).
     We use an HTML artifact rather than the MCP Apps panel because claude.ai web
     reliably renders artifacts, whereas its MCP App (ui://) rendering has open
     bugs. The result is plain text content (no structuredContent → no JSON blob). */
  server.registerTool(
    "preview_cases",
    {
      title: "Preview cases",
      description:
        "Validate generated cases and show the user a VISUAL preview to review BEFORE anything " +
        "is saved. Provide `system`, `category` and `caseType`, plus the cases as EITHER `cases` " +
        "(structured JSON, preferred) OR `xml`. The result contains a complete HTML document that " +
        "you MUST render as an artifact for the user (do not paste the code). Returns a draftId; " +
        "once the user approves, call commit_cases with it. Nothing is written by this tool.",
      inputSchema: {
        system: z.string().describe("Existing system name (see list_systems_and_categories)."),
        category: z.string().describe("Existing category name within that system."),
        caseType: z.enum(CASE_TYPES).describe('USMLE step: "STEP 1", "STEP 2", or "STEP 3".'),
        cases: z
          .array(jsonCaseSchema)
          .optional()
          .describe("Structured cases (preferred). Provide this OR xml."),
        xml: z
          .string()
          .optional()
          .describe("Alternatively, a <cases>…</cases> XML document."),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args): Promise<CallToolResult> => {
      const { system, category, caseType, cases, xml } = args;

      // Resolve target + normalize (JSON or XML) + validate against xmlImportSchema.
      const prep = await prepareImport({ system, category, caseType, cases, xml });
      if (!prep.ok) {
        if (prep.needTarget) {
          const systems = await listSystemsAndCategories();
          return errorResult(
            `${prep.issues[0].message} Pick an existing pair:\n\n${formatSystemsList(systems)}`
          );
        }
        return errorResult(
          `These cases need fixing before they can be added:\n${formatIssues(prep.issues)}`
        );
      }

      // Stage a draft and build the styled HTML preview document.
      const draft = await saveDraft({
        system,
        category,
        category_id: prep.categoryId,
        type: caseType,
        cases: prep.cases,
      });
      const total = countQuestions(draft.cases);
      const html = buildPreviewHtml(draft);

      // Instruct the host to render the HTML as an artifact (the visual side
      // panel), and how to commit. The full document is included verbatim.
      const text =
        `Prepared a preview of ${draft.cases.length} case(s) / ${total} question(s) for ` +
        `**${draft.system} › ${draft.category}** (${draft.type}).\n\n` +
        "**Render this for the user as an HTML artifact** (type `text/html`) titled " +
        '"🩺 Case Preview" — show the rendered preview, do NOT paste the raw code. After it ' +
        "renders, ask the user to review and confirm.\n\n" +
        `When the user approves, call \`commit_cases\` with \`draftId: "${draft.id}"\` to append ` +
        "them (append-only — nothing existing is changed). To revise, change the cases and preview again.\n\n" +
        "```html\n" +
        html +
        "\n```";
      return { content: [{ type: "text", text }] };
    }
  );

  /* 4) commit_cases (append-only) ----------------------------------- */
  server.registerTool(
    "commit_cases",
    {
      title: "Commit cases (add to the website)",
      description:
        "Append a previewed batch to the website, all-or-nothing, after the user confirms. " +
        "PREFERRED: pass the `draftId` from preview_cases (shown in its output). FALLBACK: if " +
        "you don't have the draftId, pass the same `system`, `category`, `caseType` and `cases` " +
        "(or `xml`) you previewed — they are re-validated before insert. Only call this once the " +
        "user has approved the preview. APPENDS only; never edits or deletes existing content.",
      inputSchema: {
        draftId: z
          .string()
          .optional()
          .describe("The draftId from preview_cases (preferred path)."),
        system: z.string().optional().describe("Fallback: target system (if no draftId)."),
        category: z.string().optional().describe("Fallback: target category (if no draftId)."),
        caseType: z
          .enum(CASE_TYPES)
          .optional()
          .describe("Fallback: USMLE step (if no draftId)."),
        cases: z
          .array(jsonCaseSchema)
          .optional()
          .describe("Fallback: the cases to append (if no draftId)."),
        xml: z.string().optional().describe("Fallback: <cases> XML (if no draftId)."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ draftId, system, category, caseType, cases, xml }): Promise<CallToolResult> => {
      let toInsert: {
        category_id: number | null;
        type: (typeof CASE_TYPES)[number];
        cases: XmlImportInput["cases"];
      } | null = null;
      let ctx: { system: string; category: string; type: string } | null = null;
      let usedDraftId: string | null = null;

      // Preferred path: commit exactly what was staged under draftId.
      if (draftId) {
        const draft = await loadDraft(draftId);
        if (draft) {
          const validated = validateCases({
            category_id: draft.category_id,
            type: draft.type,
            cases: draft.cases,
          });
          if (!validated.ok)
            return errorResult(
              `The staged cases failed validation and were not added:\n${formatIssues(
                validated.issues
              )}`
            );
          toInsert = {
            category_id: draft.category_id,
            type: draft.type,
            cases: validated.data.cases,
          };
          ctx = { system: draft.system, category: draft.category, type: draft.type };
          usedDraftId = draftId;
        }
      }

      // Fallback path: the draftId wasn't available — re-validate provided content.
      if (!toInsert) {
        if (!system || !category || !caseType) {
          return errorResult(
            draftId
              ? `No pending preview was found for draftId "${draftId}" (it may have expired after ` +
                  "30 minutes or already been added). Re-run preview_cases, or call commit_cases " +
                  "again with system, category, caseType and the cases."
              : "Provide a `draftId` from preview_cases, or (system + category + caseType + cases) to commit directly."
          );
        }
        const prep = await prepareImport({ system, category, caseType, cases, xml });
        if (!prep.ok) {
          if (prep.needTarget) {
            const systems = await listSystemsAndCategories();
            return errorResult(
              `${prep.issues[0].message} Pick an existing pair:\n\n${formatSystemsList(systems)}`
            );
          }
          return errorResult(
            `These cases need fixing before they can be added:\n${formatIssues(prep.issues)}`
          );
        }
        toInsert = { category_id: prep.categoryId, type: caseType, cases: prep.cases };
        ctx = { system, category, type: caseType };
      }

      try {
        const caller = appRouter.createCaller({
          session: { user: { id: 0, role: "admin" } },
        } as any);
        await caller.block.addMany({
          category_id: toInsert.category_id,
          type: toInsert.type,
          cases: toInsert.cases as never,
        });
      } catch (e) {
        // Transaction rolled back — keep the draft (if any) so the user can retry.
        return errorResult(
          `Failed to add the cases (nothing was saved): ${(e as Error).message}`
        );
      }

      if (usedDraftId) await deleteDraft(usedDraftId);
      const questions = countQuestions(toInsert.cases);
      return textResult(
        `✅ Added ${toInsert.cases.length} case(s) and ${questions} question(s) to ` +
          `${ctx!.system} › ${ctx!.category} (${ctx!.type}).`,
        {
          added: true,
          cases: toInsert.cases.length,
          questions,
          system: ctx!.system,
          category: ctx!.category,
          caseType: ctx!.type,
        }
      );
    }
  );

  /* Prompt: the authoring playbook --------------------------------- */
  server.registerPrompt(
    "author_usmle_cases",
    {
      title: "Author USMLE cases",
      description:
        "Playbook for generating USMLE cases and adding them to a system/category via this connector.",
      argsSchema: {
        system: z.string().optional(),
        category: z.string().optional(),
        caseType: z.string().optional(),
        count: z.string().optional(),
        notes: z.string().optional(),
      },
    },
    (args) => {
      const ctx = [
        args.system ? `System: ${args.system}` : null,
        args.category ? `Category: ${args.category}` : null,
        args.caseType ? `Exam: USMLE ${args.caseType}` : null,
        args.count ? `Number of cases: ${args.count}` : null,
        args.notes ? `Notes: ${args.notes}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: ctx ? `${ctx}\n\n${AUTHORING_GUIDE}` : AUTHORING_GUIDE,
            },
          },
        ],
      };
    }
  );

  return server;
}
