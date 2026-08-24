import type { Db } from "@/lib/api/context.server";
import type { ListQuery, Page } from "@/lib/api/pagination";
import type { ResourceConfig } from "@/lib/api/resources";
import { ApiError, badRequest, notFound } from "@/lib/api/errors";

export type Row = Record<string, unknown>;

/**
 * Minimal structural view of the PostgREST builder so tables can be addressed
 * dynamically without `any`. Runtime object is the real Supabase builder.
 */
interface Query extends PromiseLike<{ data: Row[] | null; error: PgError | null; count: number | null }> {
  select(columns: string, options?: { count: "exact"; head?: boolean }): Query;
  insert(values: Row): Query;
  update(values: Row): Query;
  delete(): Query;
  eq(column: string, value: unknown): Query;
  lt(column: string, value: unknown): Query;
  gt(column: string, value: unknown): Query;
  or(filter: string): Query;
  order(column: string, options: { ascending: boolean }): Query;
  range(from: number, to: number): Query;
  limit(count: number): Query;
  maybeSingle(): PromiseLike<{ data: Row | null; error: PgError | null }>;
  single(): PromiseLike<{ data: Row | null; error: PgError | null }>;
}

interface PgError {
  message: string;
  code?: string;
  details?: string | null;
}

function table(db: Db, name: string): Query {
  return db.from(name as never) as unknown as Query;
}

function mapError(error: PgError): ApiError {
  switch (error.code) {
    case "23505":
      return new ApiError("conflict", "Record already exists");
    case "23503":
      return badRequest("Referenced record does not exist");
    case "23514":
    case "23502":
      return badRequest("The submitted values violate a data constraint");
    case "42501":
      return new ApiError("forbidden", "You do not have access to this resource");
    case "PGRST116":
      return notFound();
    default:
      return new ApiError("unprocessable", "The database rejected this operation");
  }
}

function escapeLike(value: string): string {
  return value.replace(/[%_,()]/g, " ").trim();
}

/**
 * Repository pattern over PostgREST. Enforces column projection, keyset or
 * offset pagination, and never issues unbounded queries (N+1 / full scans).
 */
export class ResourceRepository {
  constructor(
    private readonly db: Db,
    private readonly config: ResourceConfig,
  ) {}

  async list(query: ListQuery): Promise<Page<Row>> {
    const { config } = this;
    const ascending = query.order === "asc";

    let builder = table(this.db, config.table).select(config.select, { count: "exact" });

    if (query.projectId) {
      if (!config.projectColumn) throw badRequest("This resource cannot be filtered by project");
      builder = builder.eq(config.projectColumn, query.projectId);
    }
    if (query.status) builder = builder.eq("status", query.status);
    if (query.q && config.searchable.length > 0) {
      const term = escapeLike(query.q);
      if (term) {
        builder = builder.or(
          config.searchable.map((column) => `${column}.ilike.%${term}%`).join(","),
        );
      }
    }

    builder = builder.order(config.orderColumn, { ascending });

    // Cursor pagination is preferred for deep pages; offset remains for UI tables.
    if (query.cursor) {
      builder = ascending
        ? builder.gt(config.orderColumn, query.cursor)
        : builder.lt(config.orderColumn, query.cursor);
      builder = builder.limit(query.limit);
    } else {
      builder = builder.range(query.offset, query.offset + query.limit - 1);
    }

    const { data, error, count } = await builder;
    if (error) throw mapError(error);

    const rows = data ?? [];
    const last = rows.at(-1);
    const cursorValue = last?.[config.orderColumn];

    return {
      data: rows,
      meta: {
        limit: query.limit,
        offset: query.offset,
        total: count,
        nextCursor:
          rows.length === query.limit && typeof cursorValue === "string" ? cursorValue : null,
        hasMore:
          count === null ? rows.length === query.limit : query.offset + rows.length < count,
      },
    };
  }

  async findById(id: string): Promise<Row> {
    const { data, error } = await table(this.db, this.config.table)
      .select(this.config.select)
      .eq("id", id)
      .maybeSingle();
    if (error) throw mapError(error);
    if (!data) throw notFound();
    return data;
  }

  async create(values: Row): Promise<Row> {
    const { data, error } = await table(this.db, this.config.table)
      .insert(values)
      .select(this.config.select)
      .single();
    if (error) throw mapError(error);
    if (!data) throw new ApiError("internal", "Insert returned no row");
    return data;
  }

  async update(id: string, values: Row): Promise<Row> {
    const { data, error } = await table(this.db, this.config.table)
      .update(values)
      .eq("id", id)
      .select(this.config.select)
      .maybeSingle();
    if (error) throw mapError(error);
    if (!data) throw notFound();
    return data;
  }
}
