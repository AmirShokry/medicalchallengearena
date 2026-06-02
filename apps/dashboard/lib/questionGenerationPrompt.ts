/**
 * Builds and downloads the AI question-generation prompt for the text-editor
 * mode. The prompt body is bundled from `assets/question-generation-prompt.md`;
 * a small header is prepended at download time, pre-filled with the current
 * page's system / category / exam-style and the configured image API key, plus
 * an editable "Extra notes" placeholder.
 */
import promptBody from "@/assets/question-generation-prompt.md?raw";
import type { CaseTypes } from "@/components/entry/Input/Index.vue";

export type PromptContext = {
  system: string;
  category: string;
  caseType: CaseTypes;
  imageApiKey: string;
};

/** "STEP 1" -> "USMLE-Step 1" */
function examStyle(caseType: CaseTypes): string {
  return `USMLE-${caseType.replace(/STEP/i, "Step")}`;
}

export function buildGenerationPrompt(ctx: PromptContext): string {
  const header =
    [
      `IMAGE_API_KEY="${ctx.imageApiKey}"`,
      `---`,
      `Target cases expected output:`,
      `Exam style: ${examStyle(ctx.caseType)}`,
      `System: ${ctx.system}`,
      `Category: ${ctx.category}`,
      `Extra notes: "<PUT YOUR EXTRA NOTES HERE>"`,
      ``,
      `---`,
      ``,
      ``,
    ].join("\n") + promptBody;
  return header;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Trigger a client-side download of the assembled prompt as a .md file. */
export function downloadGenerationPrompt(ctx: PromptContext): void {
  const content = buildGenerationPrompt(ctx);
  const filename = `mca-prompt-${slug(ctx.system)}-${slug(ctx.category)}.md`;
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
