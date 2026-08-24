import { z } from "zod";
import { ApiError, badRequest, notFound } from "@/lib/api/errors";
import { authenticate, type RequestContext } from "@/lib/api/context.server";
import { parseListQuery } from "@/lib/api/pagination";
import { getResource } from "@/lib/api/resources";
import { checkRateLimit } from "@/lib/api/rate-limit.server";
import { ResourceService } from "@/lib/services/resource-service.server";

const SECURITY_HEADERS: Record<string, string> = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY",
  "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
  "strict-transport-security": "max-age=63072000; includeSubDomains",
};

const READ_LIMIT = { max: 120, windowMs: 60_000 };
const WRITE_LIMIT = { max: 30, windowMs: 60_000 };

function respond(body: unknown, status: number, extra?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...SECURITY_HEADERS, ...extra },
  });
}

function errorResponse(error: unknown): Response {
  if (error instanceof z.ZodError) {
    return respond(
      { error: { code: "unprocessable", message: "Validation failed", details: error.issues } },
      422,
    );
  }
  if (error instanceof ApiError) {
    return respond(
      { error: { code: error.code, message: error.message, details: error.details } },
      error.status,
    );
  }
  // Never leak internals to the caller.
  return respond({ error: { code: "internal", message: "Unexpected server error" } }, 500);
}

async function readJson(request: Request): Promise<unknown> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw badRequest("Expected application/json body");
  try {
    return await request.json();
  } catch {
    throw badRequest("Malformed JSON body");
  }
}

async function guard(request: Request, write: boolean): Promise<RequestContext> {
  const ctx = await authenticate(request);
  const budget = write ? WRITE_LIMIT : READ_LIMIT;
  const result = await checkRateLimit(
    `v1:${write ? "w" : "r"}:${ctx.identity.userId}`,
    budget.max,
    budget.windowMs,
  );
  if (!result.allowed) throw new ApiError("rate_limited", "Too many requests");
  return ctx;
}

/**
 * `/api/v1/<resource>` collection handler: GET (paginated list) and POST (create).
 * Mutations require a same-origin request to blunt cross-site form posts; the
 * bearer token is the primary authenticator.
 */
export async function collectionHandler(request: Request, resourceName: string): Promise<Response> {
  try {
    const config = getResource(resourceName);
    if (!config) throw notFound("Unknown resource");

    const method = request.method.toUpperCase();

    if (method === "GET") {
      const ctx = await guard(request, false);
      const query = parseListQuery(new URL(request.url));
      const page = await new ResourceService(ctx, config).list(query);
      return respond(page, 200);
    }

    if (method === "POST") {
      assertSameOrigin(request);
      const ctx = await guard(request, true);
      const created = await new ResourceService(ctx, config).create(await readJson(request));
      return respond({ data: created }, 201);
    }

    return respond({ error: { code: "bad_request", message: "Method not allowed" } }, 405, {
      allow: "GET, POST",
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/** `/api/v1/<resource>/<id>` item handler: GET and PATCH. */
export async function itemHandler(
  request: Request,
  resourceName: string,
  id: string,
): Promise<Response> {
  try {
    const config = getResource(resourceName);
    if (!config) throw notFound("Unknown resource");
    if (!z.string().uuid().safeParse(id).success) throw badRequest("Invalid resource id");

    const method = request.method.toUpperCase();

    if (method === "GET") {
      const ctx = await guard(request, false);
      const row = await new ResourceService(ctx, config).get(id);
      return respond({ data: row }, 200);
    }

    if (method === "PATCH") {
      assertSameOrigin(request);
      const ctx = await guard(request, true);
      const row = await new ResourceService(ctx, config).update(id, await readJson(request));
      return respond({ data: row }, 200);
    }

    return respond({ error: { code: "bad_request", message: "Method not allowed" } }, 405, {
      allow: "GET, PATCH",
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/** CSRF hardening: state-changing calls must originate from this deployment. */
function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return; // non-browser clients send a bearer token and no Origin
  const host = new URL(request.url).host;
  if (new URL(origin).host !== host) throw new ApiError("forbidden", "Cross-origin write blocked");
}
