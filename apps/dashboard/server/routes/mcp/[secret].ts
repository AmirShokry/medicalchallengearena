/**
 * @fileoverview Remote MCP connector endpoint (stateless Streamable HTTP).
 *
 * URL: POST https://<dashboard-origin>/mcp/<MCP_SECRET>
 *
 * Auth = secret capability URL: Claude.ai's browser connector dialog only
 * accepts OAuth or no-auth (no static token field), so the endpoint is gated by
 * an unguessable path segment. A wrong/absent secret returns 404 (so the route's
 * existence isn't revealed). The server is append-only.
 *
 * Stateless: a fresh McpServer + transport per request, JSON responses
 * (enableJsonResponse) so there's no long-lived SSE for proxies to buffer.
 * All cross-call state lives in Redis drafts. h3 1.15's toWebRequest feeds the
 * SDK's Web-standard transport, and the returned Web Response is sent by Nitro.
 */
import {
  defineEventHandler,
  toWebRequest,
  getRequestHost,
  createError,
} from "h3";
import { timingSafeEqual } from "node:crypto";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { buildMcpServer } from "@/server/utils/mcp/server";

/** Constant-time string comparison that won't leak length-mismatch via timing. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) {
    // Compare against self to keep timing roughly constant, then fail.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig();
  const secret = (cfg.mcpSecret as string) || "";
  const provided = (event.context.params?.secret as string) ?? "";

  // Capability-URL gate. Unconfigured or wrong secret → 404 (don't reveal it).
  if (!secret || !safeEqual(provided, secret))
    throw createError({ statusCode: 404, statusMessage: "Not Found" });

  // Optional Host allowlist (DNS-rebinding hardening). Secret is the primary gate.
  const allowedHosts = String(cfg.mcpAllowedHosts || "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  if (allowedHosts.length) {
    const host = getRequestHost(event);
    if (!allowedHosts.includes(host))
      throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }

  // Stateless: GET (SSE) / DELETE (session end) are not supported.
  if (event.method !== "POST")
    throw createError({ statusCode: 405, statusMessage: "Method Not Allowed" });

  const imageApiKey = (cfg.public.imageApiKey as string) || "";

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true, // JSON, not SSE
  });
  const server = buildMcpServer({ imageApiKey });

  // Clean up the per-request server/transport once the response is flushed.
  event.node.res.once("close", () => {
    void transport.close();
    void server.close();
  });

  await server.connect(transport);
  return await transport.handleRequest(toWebRequest(event));
});
