import { z } from "zod";

/** Query contract shared by every collection endpoint. Client-safe. */
export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).max(100_000).default(0),
  /** Opaque cursor: ISO timestamp of the last seen row (keyset pagination). */
  cursor: z.string().datetime().optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
  projectId: z.string().uuid().optional(),
  status: z.string().trim().min(1).max(40).optional(),
  q: z.string().trim().min(1).max(120).optional(),
});

export type ListQuery = z.infer<typeof listQuerySchema>;

export interface Page<T> {
  data: T[];
  meta: {
    limit: number;
    offset: number;
    total: number | null;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

export function parseListQuery(url: URL): ListQuery {
  const raw = Object.fromEntries(url.searchParams.entries());
  return listQuerySchema.parse(raw);
}
