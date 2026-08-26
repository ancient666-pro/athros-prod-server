/** Transport-agnostic API error taxonomy. Client-safe (no server imports). */
export type ApiErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "unprocessable"
  | "rate_limited"
  | "internal";

const STATUS: Record<ApiErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  unprocessable: 422,
  rate_limited: 429,
  internal: 500,
};

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: unknown;

  constructor(code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = STATUS[code];
    this.details = details ?? null;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new ApiError("bad_request", message, details);
export const unauthorized = (message = "Authentication required") =>
  new ApiError("unauthorized", message);
export const forbidden = (message = "You do not have access to this resource") =>
  new ApiError("forbidden", message);
export const notFound = (message = "Resource not found") => new ApiError("not_found", message);
export const rateLimited = (message = "Too many requests") => new ApiError("rate_limited", message);
