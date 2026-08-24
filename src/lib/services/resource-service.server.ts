import { badRequest, forbidden } from "@/lib/api/errors";
import type { RequestContext } from "@/lib/api/context.server";
import { requirePermission } from "@/lib/api/context.server";
import type { ListQuery, Page } from "@/lib/api/pagination";
import type { ResourceConfig } from "@/lib/api/resources";
import { ResourceRepository, type Row } from "@/lib/repositories/resource-repository.server";
import { recordAudit } from "./audit.server";

/**
 * Business rules for a resource collection: permission gates, server-owned
 * field injection, sensitive-column redaction, and audit logging.
 * RLS remains the final authority on which rows are visible or writable.
 */
export class ResourceService {
  private readonly repo: ResourceRepository;

  constructor(
    private readonly ctx: RequestContext,
    private readonly config: ResourceConfig,
  ) {
    this.repo = new ResourceRepository(ctx.db, config);
  }

  private redact(row: Row): Row {
    if (this.ctx.identity.isAdmin || this.config.sensitive.length === 0) return row;
    const clone: Row = { ...row };
    for (const column of this.config.sensitive) delete clone[column];
    return clone;
  }

  private rejectServerOwned(values: Row): void {
    const blocked = this.config.serverOwnedFields.filter((field) => field in values);
    if (blocked.length > 0) {
      throw badRequest(`These fields are managed by the server: ${blocked.join(", ")}`);
    }
  }

  async list(query: ListQuery): Promise<Page<Row>> {
    requirePermission(this.ctx.identity, this.config.permissions.read);
    const page = await this.repo.list(query);
    return { ...page, data: page.data.map((row) => this.redact(row)) };
  }

  async get(id: string): Promise<Row> {
    requirePermission(this.ctx.identity, this.config.permissions.read);
    return this.redact(await this.repo.findById(id));
  }

  async create(input: unknown): Promise<Row> {
    const schema = this.config.createSchema;
    if (!schema) throw forbidden("This resource cannot be created through the API");
    requirePermission(this.ctx.identity, this.config.permissions.write);

    const parsed = schema.parse(input);
    this.rejectServerOwned(parsed);

    const values: Row = { ...parsed, ...this.ownershipDefaults() };
    const created = await this.repo.create(values);

    await recordAudit(this.ctx.db, this.ctx.identity, {
      action: `${this.config.name}.create`,
      entity: this.config.table,
      entityId: typeof created["id"] === "string" ? created["id"] : null,
      newValue: created,
    });

    return this.redact(created);
  }

  async update(id: string, input: unknown): Promise<Row> {
    const schema = this.config.updateSchema;
    if (!schema) throw forbidden("This resource cannot be modified through the API");
    requirePermission(this.ctx.identity, this.config.permissions.write);

    const parsed = schema.parse(input);
    this.rejectServerOwned(parsed);
    if (Object.keys(parsed).length === 0) throw badRequest("No updatable fields supplied");

    const before = await this.repo.findById(id);
    const updated = await this.repo.update(id, parsed);

    await recordAudit(this.ctx.db, this.ctx.identity, {
      action: `${this.config.name}.update`,
      entity: this.config.table,
      entityId: id,
      oldValue: before,
      newValue: updated,
    });

    return this.redact(updated);
  }

  /** Columns the server owns on insert, derived from the session. */
  private ownershipDefaults(): Row {
    const { userId } = this.ctx.identity;
    switch (this.config.name) {
      case "requirements":
        return { created_by: userId };
      case "enhancements":
        return { requested_by: userId };
      case "issues":
        return { reported_by: userId };
      case "meetings":
        return { created_by: userId };
      default:
        return {};
    }
  }
}
