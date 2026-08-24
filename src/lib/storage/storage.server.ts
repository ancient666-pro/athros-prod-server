import { badRequest, forbidden } from "@/lib/api/errors";
import { logger } from "@/lib/observability/logger.server";
import {
  STORAGE_BUCKETS,
  buildObjectPath,
  type BucketName,
  type UploadRequest,
} from "./buckets";

/**
 * Signed upload/download issuance for private buckets. Every call validates
 * MIME type + size against the bucket contract, and runs the scan hook.
 * Storage RLS is still the final authority on object access.
 */

export interface ScanResult {
  readonly clean: boolean;
  readonly reason?: string;
}

/** Virus-scan hook interface — swap in ClamAV/VirusTotal without touching call sites. */
export interface VirusScanner {
  scan(input: { bucket: BucketName; path: string; contentType: string; size: number }): Promise<ScanResult>;
}

class PassthroughScanner implements VirusScanner {
  async scan(): Promise<ScanResult> {
    return { clean: true };
  }
}

let scanner: VirusScanner = new PassthroughScanner();

export function setVirusScanner(next: VirusScanner): void {
  scanner = next;
}

function assertUploadAllowed(request: UploadRequest): void {
  const config = STORAGE_BUCKETS[request.bucket];
  if (request.size > config.maxBytes) {
    throw badRequest(`File exceeds the ${Math.round(config.maxBytes / 1024 / 1024)}MB limit`);
  }
  const type = request.contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!(config.mimeTypes as readonly string[]).includes(type)) {
    throw badRequest(`Unsupported file type: ${type || "unknown"}`);
  }
}

function scopeId(request: UploadRequest, userId: string): string {
  const config = STORAGE_BUCKETS[request.bucket];
  if (config.scope === "user") return userId;
  if (!request.projectId) throw badRequest("projectId is required for this bucket");
  return request.projectId;
}

export interface SignedUpload {
  readonly bucket: BucketName;
  readonly path: string;
  readonly token: string;
  readonly maxBytes: number;
  readonly optimizeImages: boolean;
}

/** Issues a one-shot signed upload URL. Caller must already be authorized. */
export async function createSignedUpload(
  request: UploadRequest,
  userId: string,
  version = 1,
): Promise<SignedUpload> {
  assertUploadAllowed(request);
  const path = buildObjectPath({
    scopeId: scopeId(request, userId),
    fileName: request.fileName,
    version,
  });

  const scan = await scanner.scan({
    bucket: request.bucket,
    path,
    contentType: request.contentType,
    size: request.size,
  });
  if (!scan.clean) throw forbidden(scan.reason ?? "File rejected by security scan");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage
    .from(request.bucket)
    .createSignedUploadUrl(path);
  if (error || !data) throw badRequest(error?.message ?? "Could not create upload URL");

  const config = STORAGE_BUCKETS[request.bucket];
  return {
    bucket: request.bucket,
    path: data.path,
    token: data.token,
    maxBytes: config.maxBytes,
    optimizeImages: config.optimizeImages,
  };
}

export interface SignedDownload {
  readonly url: string;
  readonly expiresAt: string;
}

/**
 * Issues a short-lived signed download URL. Images are served through the
 * transform pipeline so thumbnails never ship full-size originals.
 */
export async function createSignedDownload(
  bucket: BucketName,
  path: string,
  expiresIn = 600,
  transform?: { width: number; quality?: number },
): Promise<SignedDownload> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const optimize = STORAGE_BUCKETS[bucket].optimizeImages && transform;
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(
    path,
    expiresIn,
    optimize
      ? { transform: { width: transform.width, quality: transform.quality ?? 78, resize: "contain" } }
      : undefined,
  );
  if (error || !data) throw badRequest(error?.message ?? "Could not create download URL");
  return {
    url: data.signedUrl,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}

export async function removeObject(bucket: BucketName, path: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.storage.from(bucket).remove([path]);
  if (error) throw badRequest(error.message);
}

/** Next version number for a versioned object family within a scope folder. */
export async function nextVersion(bucket: BucketName, scopeFolder: string): Promise<number> {
  if (!STORAGE_BUCKETS[bucket].versioned) return 1;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage.from(bucket).list(scopeFolder, { limit: 1000 });
  return (data?.length ?? 0) + 1;
}

/** Retention sweep for buckets with a retention window. Called by the storage-cleanup job. */
export async function cleanupExpiredObjects(): Promise<{ removed: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const log = logger.channel("app");
  let removed = 0;

  for (const [name, config] of Object.entries(STORAGE_BUCKETS)) {
    if (!config.retentionDays) continue;
    const cutoff = Date.now() - config.retentionDays * 86_400_000;
    const { data: folders } = await supabaseAdmin.storage.from(name).list("", { limit: 1000 });
    for (const folder of folders ?? []) {
      const { data: files } = await supabaseAdmin.storage
        .from(name)
        .list(folder.name, { limit: 1000 });
      const stale = (files ?? [])
        .filter((file) => new Date(file.created_at ?? Date.now()).getTime() < cutoff)
        .map((file) => `${folder.name}/${file.name}`);
      if (stale.length === 0) continue;
      const { error } = await supabaseAdmin.storage.from(name).remove(stale);
      if (error) log.warn("storage cleanup partial failure", { bucket: name, error: error.message });
      else removed += stale.length;
    }
  }

  return { removed };
}

export async function storageHealthy(): Promise<boolean> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage.from("documents").list("", { limit: 1 });
    return !error;
  } catch {
    return false;
  }
}
