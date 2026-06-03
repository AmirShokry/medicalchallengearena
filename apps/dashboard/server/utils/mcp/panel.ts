/**
 * @fileoverview Server-side definition of the `ui://preview` MCP App resource.
 *
 * The panel HTML is SELF-CONTAINED: the UI bundle (built from `mcp/panel.entry.ts`
 * by `mcp/build-panel.mjs` into `panel.generated.ts`) is inlined into the
 * document. MCP App resources are loaded into a sandboxed iframe as a whole
 * document, and a single self-contained file is the pattern that reliably renders
 * in claude.ai — it avoids depending on a cross-origin script fetch.
 *
 * CSP: `resourceDomains` maps to img-src/script-src/etc. The script is inline
 * (part of the document), so the only external resource we must allow is imghippo,
 * where `upload_image` hosts case/question images.
 */
import { PANEL_HTML } from "./panel.generated";

/** URI the preview tool points at and the resource is registered under. */
export const PREVIEW_RESOURCE_URI = "ui://med-arena/preview.html";

/** imghippo host where `upload_image` stores images (needed for img-src). */
const IMGHIPPO_ORIGIN = "https://i.imghippo.com";

/** The self-contained panel document. */
export function panelHtml(): string {
  return PANEL_HTML;
}

/**
 * CSP domain allowlist for the panel. The bundle is inline, so only image hosts
 * need allowing. `resourceDomains` rejects a bare "*", so we enumerate.
 */
export function panelCspResourceDomains(): string[] {
  return [IMGHIPPO_ORIGIN];
}
