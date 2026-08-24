import { z } from "zod";

/** Bucket catalogue with upload constraints. Client-safe. */
export const STORAGE_BUCKETS = {
  avatars: {
    scope: "user",
    maxBytes: 2 * 1024 * 1024,
    mimeTypes: ["image/png", "image/jpeg", "image/webp", "image/avif"],
    optimizeImages: true,
    versioned: false,
    retentionDays: null,
  },
  requirements: {
    scope: "project",
    maxBytes: 25 * 1024 * 1024,
    mimeTypes: [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
      "text/plain",
      "text/markdown",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    optimizeImages: false,
    versioned: true,
    retentionDays: null,
  },
  enhancements: {
    scope: "project",
    maxBytes: 25 * 1024 * 1024,
    mimeTypes: ["application/pdf", "image/png", "image/jpeg", "image/webp", "text/plain"],
    optimizeImages: false,
    versioned: true,
    retentionDays: null,
  },
  deliveries: {
    scope: "project",
    maxBytes: 512 * 1024 * 1024,
    mimeTypes: [
      "application/vnd.android.package-archive",
      "application/octet-stream",
      "application/zip",
      "application/gzip",
    ],
    optimizeImages: false,
    versioned: true,
    retentionDays: null,
  },
  documents: {
    scope: "project",
    maxBytes: 50 * 1024 * 1024,
    mimeTypes: [
      "application/pdf",
      "text/plain",
      "text/markdown",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    optimizeImages: false,
    versioned: true,
    retentionDays: null,
  },
  "meeting-recordings": {
    scope: "project",
    maxBytes: 1024 * 1024 * 1024,
    mimeTypes: ["video/mp4", "video/webm", "audio/mpeg", "audio/mp4", "audio/webm"],
    optimizeImages: false,
    versioned: false,
    retentionDays: 365,
  },
  "project-assets": {
    scope: "project",
    maxBytes: 100 * 1024 * 1024,
    mimeTypes: [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/svg+xml",
      "application/pdf",
      "application/zip",
    ],
    optimizeImages: true,
    versioned: true,
    retentionDays: null,
  },
} as const satisfies Record<string, BucketConfig>;

export interface BucketConfig {
  readonly scope: "user" | "project";
  readonly maxBytes: number;
  readonly mimeTypes: readonly string[];
  readonly optimizeImages: boolean;
  readonly versioned: boolean;
  readonly retentionDays: number | null;
}

export type BucketName = keyof typeof STORAGE_BUCKETS;

export const bucketNameSchema = z.enum(
  Object.keys(STORAGE_BUCKETS) as [BucketName, ...BucketName[]],
);

export const uploadRequestSchema = z.object({
  bucket: bucketNameSchema,
  /** Project id for project-scoped buckets; ignored for `avatars`. */
  projectId: z.string().uuid().optional(),
  fileName: z
    .string()
    .trim()
    .min(1)
    .max(180)
    .regex(/^[\w .()-]+$/, "File name may only contain letters, numbers, spaces, . _ - ( )"),
  contentType: z.string().trim().min(3).max(160),
  size: z.number().int().min(1).max(1024 * 1024 * 1024),
});

export type UploadRequest = z.infer<typeof uploadRequestSchema>;

export const downloadRequestSchema = z.object({
  bucket: bucketNameSchema,
  path: z.string().trim().min(3).max(400),
  expiresIn: z.number().int().min(30).max(86_400).default(600),
});

/** Deterministic object key: `<scope-id>/<yyyy-mm>/<version>-<slug>`. */
export function buildObjectPath(input: {
  scopeId: string;
  fileName: string;
  version?: number;
}): string {
  const stamp = new Date().toISOString().slice(0, 7);
  const slug = input.fileName
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const version = input.version ?? 1;
  return `${input.scopeId}/${stamp}/v${version}-${Date.now().toString(36)}-${slug}`;
}
