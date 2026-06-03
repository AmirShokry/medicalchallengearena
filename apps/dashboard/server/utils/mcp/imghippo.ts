/**
 * @fileoverview Server-side image hosting for the MCP connector.
 *
 * Claude in the browser cannot run `curl`, so the connector exposes an
 * `upload_image` tool that proxies to imghippo using the SAME endpoint and API
 * key the dashboard's client uploader uses
 * (`components/ui/image-upload/ImageUploadTrigger.vue`):
 *   POST https://api.imghippo.com/v1/upload   (multipart: api_key + file)
 *   → { success, data: { url } }
 *
 * Claude typically generates an SVG diagram; we upload it as `image/svg+xml`
 * (renders fine in an <img>). Raster images can be passed as base64.
 *
 * `xmlImportSchema` only accepts http(s) image URLs, so we verify the returned
 * URL is http(s) before handing it back.
 */

const IMGHIPPO_ENDPOINT = "https://api.imghippo.com/v1/upload";

export type UploadImageInput = {
  /** SVG markup (preferred for Claude-generated diagrams). */
  svg?: string;
  /** Raw base64 OR a full `data:<mime>;base64,...` URL (for raster images). */
  base64?: string;
  /** MIME type for base64 input. Defaults to image/png. */
  mimeType?: string;
  /** Optional file name (extension is derived from the MIME type otherwise). */
  filename?: string;
};

const EXT_BY_MIME: Record<string, string> = {
  "image/svg+xml": "svg",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

function extForMime(mime: string): string {
  return EXT_BY_MIME[mime.toLowerCase()] ?? "png";
}

/** Build the {bytes/text, contentType, filename} to upload from the input. */
function resolveFile(input: UploadImageInput): {
  blob: Blob;
  filename: string;
} {
  if (input.svg && input.svg.trim()) {
    const filename = input.filename || "image.svg";
    return {
      blob: new Blob([input.svg], { type: "image/svg+xml" }),
      filename: filename.endsWith(".svg") ? filename : `${filename}.svg`,
    };
  }

  if (input.base64 && input.base64.trim()) {
    let raw = input.base64.trim();
    let mime = input.mimeType || "image/png";
    const dataUrl = /^data:([^;]+);base64,(.*)$/is.exec(raw);
    if (dataUrl) {
      mime = dataUrl[1];
      raw = dataUrl[2];
    }
    const bytes = Buffer.from(raw, "base64");
    if (bytes.length === 0)
      throw new Error("base64 image data is empty or invalid.");
    const ext = extForMime(mime);
    const filename = input.filename || `image.${ext}`;
    return {
      blob: new Blob([bytes], { type: mime }),
      filename,
    };
  }

  throw new Error("Provide either `svg` markup or `base64` image data.");
}

/**
 * Upload one image to imghippo and return its hosted https URL.
 * @throws on network errors, an unsuccessful response, or a non-http(s) URL.
 */
export async function uploadImage(
  apiKey: string,
  input: UploadImageInput
): Promise<{ url: string }> {
  if (!apiKey || apiKey === "No API Key Found")
    throw new Error(
      "Image upload is not configured (missing IMAGE_API_KEY on the server)."
    );

  const { blob, filename } = resolveFile(input);

  const form = new FormData();
  form.append("api_key", apiKey);
  form.append("file", blob, filename);

  let res: Response;
  try {
    res = await fetch(IMGHIPPO_ENDPOINT, { method: "POST", body: form });
  } catch (e) {
    throw new Error(`Failed to reach the image host: ${(e as Error).message}`);
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Image host returned a non-JSON response (HTTP ${res.status}).`);
  }

  const url: string | undefined = data?.data?.url ?? data?.url;
  if (!res.ok || data?.success === false || !url) {
    const reason =
      data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(`Image upload failed: ${reason}`);
  }

  if (!/^https?:\/\//i.test(url))
    throw new Error(`Image host returned a non-http(s) URL: ${url}`);

  return { url };
}
