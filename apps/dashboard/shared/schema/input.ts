import { z } from "zod";

/**
 * Case types (USMLE steps) — the value comes from the entry page's selector,
 * NOT from the imported XML.
 */
export const CASE_TYPES = ["STEP 1", "STEP 2", "STEP 3"] as const;
/** Question types. Tabular questions carry a tab-delimited `header`. */
export const QUESTION_TYPES = ["Default", "Tabular"] as const;

export const inputSchema = z.object({
  id: z.number().int().min(1, "Case ID is required"),
  body: z.string().trim().min(1, "Case cannot be empty"),
  type: z.enum(["STEP 1", "STEP 2", "STEP 3"], {
    message: "Case type is required",
  }),
  imgUrls: z.array(z.string()).optional().default([]),
  category_id: z.number().int().nullable(),
  questions: z.array(
    z.object({
      id: z.number().int().min(1, "Question ID is required"),
      type: z.enum(["Default", "Tabular"], {
        message: "Question type is required",
      }),
      body: z.string().trim().min(1, "Question cannot be empty"),
      header: z.string().optional().nullable(),
      imgUrls: z.array(z.string()).optional().default([]),
      isStudyMode: z.boolean().optional().nullable().default(false),
      explanation: z.string().trim().min(1, "Explanation cannot be empty"),
      explanationImgUrls: z.array(z.string()).optional().default([]),

      choices: z
        .array(
          z.object({
            id: z.number().int().min(1, "Choice ID is required"),
            body: z.string().trim().min(1, "Choice cannot be empty"),
            isCorrect: z.boolean().optional().nullable(),
            explanation: z.string().optional().nullable(),
          })
        )
        .min(2, "At least 2 choices are required")
        .refine(
          (choices) => choices.some((choice) => choice.isCorrect),
          "At least one choice must be marked as correct"
        ),
    })
  ),
});

/**
 * ──────────────────────────────────────────────────────────────────────────
 * Bulk XML import (text-editor mode)
 * ──────────────────────────────────────────────────────────────────────────
 *
 * This schema is the single source of truth for the text-editor data-entry
 * flow. It is used by:
 *   • the frontend, to validate the parsed XML before showing the preview, and
 *   • the backend (`block.addMany`), as the authoritative DB-facing validation.
 *
 * The parser (`lib/parseCasesXml.ts`) normalizes the raw XML into the shape
 * below: question/case types are capitalized to match the DB enums, the
 * `correct` / `study-mode` attributes are coerced to booleans, and tabular
 * `header` / `choice` cells are joined with TAB (`\t`) exactly as the GUI
 * stores them.
 *
 * `type` (STEP) and `category_id` are NOT part of the XML — they come from the
 * current page and are attached before validation.
 */
/**
 * Image URLs must be real, hosted http(s) links. `z.url()` alone accepts
 * `javascript:`/`data:` URIs (the URL constructor parses them), which would be
 * rendered into an <a href> in the gallery — so we require an http(s) scheme.
 */
const imageUrlSchema = z
  .string()
  .trim()
  .url("Every <image> must be a valid URL")
  .refine(
    (u) => /^https?:\/\//i.test(u),
    "Image URLs must start with http:// or https://"
  );

const xmlChoiceSchema = z.object({
  body: z.string().trim().min(1, "Choice text cannot be empty"),
  isCorrect: z.boolean().default(false),
  explanation: z
    .string()
    .trim()
    .min(1, "Choice explanation cannot be empty when present")
    .nullable()
    .optional(),
});

const xmlQuestionSchema = z
  .object({
    type: z.enum(QUESTION_TYPES, {
      message: 'Question "type" must be "default" or "tabular"',
    }),
    body: z.string().trim().min(1, "Question body cannot be empty"),
    header: z.string().trim().min(1).nullable().optional(),
    isStudyMode: z.boolean().default(false),
    imgUrls: z.array(imageUrlSchema).default([]),
    explanation: z.string().trim().min(1, "Explanation cannot be empty"),
    explanationImgUrls: z.array(imageUrlSchema).default([]),
    choices: z
      .array(xmlChoiceSchema)
      .min(2, "A question needs at least 2 choices"),
  })
  .superRefine((q, ctx) => {
    // Exactly one correct choice — mirrors the GUI's single-select radio.
    const correct = q.choices.filter((c) => c.isCorrect).length;
    if (correct !== 1)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `A question must have exactly one correct choice (found ${correct})`,
        path: ["choices"],
      });

    if (q.type === "Tabular") {
      if (!q.header || !q.header.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Tabular questions require a non-empty <header>",
          path: ["header"],
        });
      } else {
        const columns = q.header.split("\t").length;
        q.choices.forEach((c, i) => {
          const cells = c.body.split("\t").length;
          if (cells !== columns)
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Choice ${i + 1} has ${cells} cell(s) but the header defines ${columns} column(s). Use "|" to separate cells.`,
              path: ["choices", i, "body"],
            });
        });
      }
    } else if (q.header && q.header.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Default questions must not have a <header> (set type="tabular").',
        path: ["header"],
      });
    }
  });

const xmlCaseSchema = z
  .object({
    body: z.string().trim().min(1, "Case body cannot be empty"),
    imgUrls: z.array(imageUrlSchema).default([]),
    questions: z
      .array(xmlQuestionSchema)
      .min(1, "A case needs at least one question"),
  })
  .superRefine((c, ctx) => {
    // Study mode is only meaningful for multi-question cases (matches the GUI,
    // which disables/clears the toggle when a case has a single question).
    if (c.questions.length <= 1 && c.questions.some((q) => q.isStudyMode))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'study-mode="true" requires the case to have more than one question',
        path: ["questions"],
      });
  });

export const xmlImportSchema = z.object({
  category_id: z.number().int().nullable(),
  type: z.enum(CASE_TYPES, { message: "Case type is required" }),
  cases: z.array(xmlCaseSchema).min(1, "Provide at least one <case>"),
});

export type XmlChoiceInput = z.infer<typeof xmlChoiceSchema>;
export type XmlQuestionInput = z.infer<typeof xmlQuestionSchema>;
export type XmlCaseInput = z.infer<typeof xmlCaseSchema>;
export type XmlImportInput = z.infer<typeof xmlImportSchema>;
