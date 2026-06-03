/**
 * @fileoverview Server-side builder for the `ui://preview` MCP App resource:
 * the tiny sandbox HTML and its CSP. The actual UI logic lives in the
 * pre-bundled `public/_mcp/panel.js` (built from `mcp/panel.entry.ts`).
 *
 * CSP model (MCP Apps): `resourceDomains` maps to script-src/img-src/etc. We
 * whitelist (1) the dashboard origin — so the sandbox iframe can load our
 * external panel script — and (2) imghippo, where `upload_image` hosts images,
 * so they render inside the panel. Inline scripts are blocked by the host CSP,
 * which is exactly why the script is external; styling is applied via CSSOM in
 * the bundle, which `style-src` does not govern.
 */

/** URI the preview tool points at and the resource is registered under. */
export const PREVIEW_RESOURCE_URI = "ui://med-arena/preview.html";

/** Path (relative to the dashboard origin) of the bundled panel script. */
export const PANEL_SCRIPT_PATH = "/_mcp/panel.js";

/** imghippo host where `upload_image` stores images. */
const IMGHIPPO_ORIGIN = "https://i.imghippo.com";

/** Minimal sandbox document: just loads the external, CSP-whitelisted bundle. */
export function panelHtml(scriptSrc: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Case preview</title>
</head>
<body>
<script src="${scriptSrc}"></script>
</body>
</html>`;
}

/** Full https URL of the bundled panel script for the given dashboard origin. */
export function panelScriptSrc(origin: string): string {
  return `${origin.replace(/\/$/, "")}${PANEL_SCRIPT_PATH}`;
}

/**
 * CSP domain allowlist for the panel: our origin (for the external script) and
 * imghippo (for images). `resourceDomains` rejects a bare "*", so we enumerate.
 */
export function panelCspResourceDomains(origin: string): string[] {
  const clean = origin.replace(/\/$/, "");
  return Array.from(new Set([clean, IMGHIPPO_ORIGIN]));
}
