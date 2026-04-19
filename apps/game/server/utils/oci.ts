/**
 * Oracle Cloud Infrastructure (OCI) Object Storage helpers.
 *
 * Generates Pre-Authenticated Requests (PARs) for direct browser-to-bucket
 * uploads, and helpers for building public object URLs and deleting objects.
 *
 * Required env vars (set via `nuxt.config.ts -> runtimeConfig`):
 *   OCI_TENANCY_OCID
 *   OCI_USER_OCID
 *   OCI_FINGERPRINT
 *   OCI_PRIVATE_KEY            (PEM contents OR a file path)
 *   OCI_PRIVATE_KEY_PASSPHRASE (optional)
 *   OCI_REGION                 (e.g. "me-jeddah-1")
 *   OCI_NAMESPACE              (object storage namespace)
 *   OCI_BUCKET_NAME            (e.g. "bucket-20260308-1833")
 */
import * as common from "oci-common";
import * as objectstorage from "oci-objectstorage";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

interface OciConfig {
  tenancy: string;
  user: string;
  fingerprint: string;
  privateKey: string;
  passphrase: string | undefined;
  region: string;
  namespace: string;
  bucket: string;
}

let cachedClient: objectstorage.ObjectStorageClient | null = null;
let cachedConfig: OciConfig | null = null;

function getOciConfig(): OciConfig {
  if (cachedConfig) return cachedConfig;
  const cfg = useRuntimeConfig();
  const required = [
    "OCI_TENANCY_OCID",
    "OCI_USER_OCID",
    "OCI_FINGERPRINT",
    "OCI_PRIVATE_KEY",
    "OCI_REGION",
    "OCI_NAMESPACE",
    "OCI_BUCKET_NAME",
  ] as const;
  for (const k of required) {
    if (!cfg[k]) throw new Error(`Missing OCI env var: ${k}`);
  }
  cachedConfig = {
    tenancy: cfg.OCI_TENANCY_OCID as string,
    user: cfg.OCI_USER_OCID as string,
    fingerprint: cfg.OCI_FINGERPRINT as string,
    privateKey: cfg.OCI_PRIVATE_KEY as string,
    passphrase: (cfg.OCI_PRIVATE_KEY_PASSPHRASE as string) || undefined,
    region: cfg.OCI_REGION as string,
    namespace: cfg.OCI_NAMESPACE as string,
    bucket: cfg.OCI_BUCKET_NAME as string,
  };
  return cachedConfig;
}

function getClient() {
  if (cachedClient) return cachedClient;
  const c = getOciConfig();

  // Allow `OCI_PRIVATE_KEY` to be either the raw PEM contents or a file path.
  let privateKey: string;
  if (c.privateKey.includes("BEGIN")) {
    privateKey = c.privateKey.replace(/\\n/g, "\n");
  } else {
    const candidates = isAbsolute(c.privateKey)
      ? [c.privateKey]
      : [
          resolve(process.cwd(), c.privateKey),
          resolve(process.cwd(), "apps/game", c.privateKey),
        ];
    const found = candidates.find((p) => existsSync(p));
    if (!found) {
      throw new Error(
        `OCI_PRIVATE_KEY file not found. Tried: ${candidates.join(", ")}. ` +
          `Either set an absolute path (e.g. C:/Users/.../private.pem) or place the file at one of these locations.`
      );
    }
    privateKey = readFileSync(found, "utf-8");
  }

  const provider = new common.SimpleAuthenticationDetailsProvider(
    c.tenancy,
    c.user,
    c.fingerprint,
    privateKey,
    c.passphrase ?? null,
    common.Region.fromRegionId(c.region)
  );
  cachedClient = new objectstorage.ObjectStorageClient({
    authenticationDetailsProvider: provider,
  });
  return cachedClient;
}

export function buildPublicObjectUrl(objectName: string): string {
  const c = getOciConfig();
  return `https://objectstorage.${c.region}.oraclecloud.com/n/${c.namespace}/b/${c.bucket}/o/${encodeURIComponent(objectName)}`;
}

/**
 * Creates an upload Pre-Authenticated Request (PAR) for a single object.
 * Returns both the `uploadUrl` (PUT to it) and the public `objectUrl`.
 */
export async function createUploadPar(opts: {
  objectName: string;
  /** PAR lifetime in minutes. Defaults to 15. */
  ttlMinutes?: number;
}): Promise<{ uploadUrl: string; objectUrl: string; objectName: string }> {
  const c = getOciConfig();
  const client = getClient();
  const ttl = opts.ttlMinutes ?? 15;
  const expiresAt = new Date(Date.now() + ttl * 60 * 1000);

  const res = await client.createPreauthenticatedRequest({
    namespaceName: c.namespace,
    bucketName: c.bucket,
    createPreauthenticatedRequestDetails: {
      name: `upload-${opts.objectName}-${Date.now()}`,
      objectName: opts.objectName,
      accessType:
        objectstorage.models.CreatePreauthenticatedRequestDetails.AccessType
          .ObjectWrite,
      timeExpires: expiresAt,
    },
  });

  const par = res.preauthenticatedRequest;
  // `accessUri` is the relative path; prepend the region host.
  const uploadUrl = `https://objectstorage.${c.region}.oraclecloud.com${par.accessUri}`;

  return {
    uploadUrl,
    objectUrl: buildPublicObjectUrl(opts.objectName),
    objectName: opts.objectName,
  };
}

/**
 * Deletes an object from the bucket. Safe to call even if it doesn't exist.
 */
export async function deleteObject(objectName: string): Promise<void> {
  const c = getOciConfig();
  const client = getClient();
  try {
    await client.deleteObject({
      namespaceName: c.namespace,
      bucketName: c.bucket,
      objectName,
    });
  } catch (err: any) {
    if (err?.statusCode === 404) return;
    throw err;
  }
}

/**
 * Extracts the object name (path within the bucket) from a public OCI URL,
 * or returns null if the URL doesn't belong to our bucket.
 */
export function extractObjectNameFromUrl(url: string): string | null {
  try {
    const c = getOciConfig();
    const u = new URL(url);
    const marker = `/n/${c.namespace}/b/${c.bucket}/o/`;
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(u.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}
