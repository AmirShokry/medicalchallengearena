/**
 * @fileoverview The authoring playbook surfaced via the `author_usmle_cases`
 * MCP prompt. It adapts the dashboard's canonical question-generation rules
 * (assets/question-generation-prompt.md) to the connector workflow: check the
 * DB first, host images with the `upload_image` tool (no curl), send cases as
 * JSON tool args, preview, then commit on user approval.
 *
 * The validation rules below are the human-readable mirror of `xmlImportSchema`
 * (the single source of truth) — the connector re-validates against it, so any
 * violation is rejected by preview_cases with a specific message.
 */
export const AUTHORING_GUIDE = `You are authoring USMLE-style cases and adding them to the Medical Challenge Arena via this connector. Follow this workflow exactly.

## Workflow
1. **Check the database.** Call \`list_systems_and_categories\` and choose an EXISTING system + category (names are case-sensitive). If the user's target doesn't exist, show them the available options and ask — you cannot create systems/categories here.
2. **Invent accurate content.** Write medically accurate USMLE cases at the requested step (STEP 1 / 2 / 3). Each case = a clinical stem + one or more questions, each question with choices and an explanation. If the user didn't specify counts, choose sensible numbers and say what you chose.
3. **Images / diagrams (optional).** If a case benefits from an image (ECG, histology, algorithm, etc.), generate a clean **SVG** and host it: call \`upload_image\` with \`{ svg }\` (or \`{ base64 }\` for a raster image). Use the returned https URL. Never inline raw SVG or data: URIs into the cases — only hosted http(s) URLs are accepted.
4. **Preview.** Call \`preview_cases\` with \`system\`, \`category\`, \`caseType\`, and \`cases\` (structured JSON — preferred). The user sees an interactive preview. If validation fails, fix the reported issues and preview again.
5. **Revise on request.** If the user wants changes, regenerate and call \`preview_cases\` again (a new draft).
6. **Commit only after approval.** When the user confirms, call \`commit_cases\` with the \`draftId\` from the preview. This APPENDS the cases (nothing existing is changed). Do not call commit_cases on your own initiative.

## Case JSON shape (preferred input to preview_cases)
\`\`\`json
{
  "body": "Clinical stem / vignette.",
  "imgUrls": ["https://i.imghippo.com/files/....svg"],
  "questions": [
    {
      "type": "default",
      "body": "The question prompt.",
      "isStudyMode": false,
      "imgUrls": [],
      "explanation": "Why the correct answer is correct (and others wrong).",
      "explanationImgUrls": [],
      "choices": [
        { "body": "Correct answer", "isCorrect": true, "explanation": "optional" },
        { "body": "Distractor 1" },
        { "body": "Distractor 2" },
        { "body": "Distractor 3" }
      ]
    }
  ]
}
\`\`\`

### Tabular questions
For matrix/table questions set \`"type": "tabular"\`, add \`header\` as an array of column labels, and make every choice \`body\` an array of cells with the SAME length as \`header\`:
\`\`\`json
{
  "type": "tabular",
  "body": "Match each disorder to its lab pattern:",
  "header": ["Disorder", "TSH", "Free T4"],
  "explanation": "Primary hypothyroidism: high TSH, low free T4.",
  "choices": [
    { "body": ["Primary hypothyroidism", "High", "Low"], "isCorrect": true },
    { "body": ["Secondary hypothyroidism", "Low", "Low"] },
    { "body": ["Subclinical hypothyroidism", "High", "Normal"] }
  ]
}
\`\`\`

## Rules (preview_cases rejects any violation)
1. At least one case; each case needs a non-empty stem (\`body\`) and at least one question.
2. Each question needs a non-empty \`body\` and a non-empty \`explanation\`.
3. Each question needs **at least 2 choices** and **exactly one** with \`isCorrect: true\`.
4. \`type\` is "default" or "tabular". Default questions must NOT have a \`header\`. Tabular questions REQUIRE a \`header\`, and every choice must have the same number of cells as the header has columns.
5. \`isStudyMode: true\` is allowed only when the case has more than one question.
6. Images must be hosted http(s) URLs (use \`upload_image\`). Choices cannot have images.
7. \`caseType\` (STEP) and the system/category come from the tool arguments, not the case body.

Keep medical content correct and exam-appropriate. Prefer concise, single-best-answer questions unless the user asks otherwise.`;
