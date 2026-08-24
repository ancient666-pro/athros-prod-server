/**
 * Structured logging + request metrics. Console is the transport of record
 * (platform log drain); durable rows go to `public.app_logs` for staff review.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogChannel = "app" | "db" | "security" | "audit" | "performance" | "webhook" | "email" | "queue";

export interface LogContext {
  readonly requestId?: string;
  readonly correlationId?: string;
  readonly userId?: string | null;
  readonly durationMs?: number;
  readonly [key: string]: unknown;
}

/** Pluggable sink so Sentry (or any APM) can be attached without touching call sites. */
export interface LogSink {
  write(entry: {
    level: LogLevel;
    channel: LogChannel;
    message: string;
    context: LogContext;
    error?: unknown;
  }): void | Promise<void>;
}

const SENSITIVE = /(password|token|secret|authorization|apikey|api_key|cookie)/i;

function scrub(context: LogContext): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    out[key] = SENSITIVE.test(key) ? "[redacted]" : value;
  }
  return out;
}

class ConsoleSink implements LogSink {
  write(entry: {
    level: LogLevel;
    channel: LogChannel;
    message: string;
    context: LogContext;
    error?: unknown;
  }): void {
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level: entry.level,
      channel: entry.channel,
      msg: entry.message,
      ...scrub(entry.context),
      ...(entry.error instanceof Error
        ? { err: entry.error.message, stack: entry.error.stack }
        : entry.error !== undefined
          ? { err: String(entry.error) }
          : {}),
    });
    if (entry.level === "error") console.error(line);
    else if (entry.level === "warn") console.warn(line);
    else console.info(line);
  }
}

/** Persists warn/error and security/audit entries into `app_logs`, best effort. */
class DatabaseSink implements LogSink {
  async write(entry: {
    level: LogLevel;
    channel: LogChannel;
    message: string;
    context: LogContext;
    error?: unknown;
  }): Promise<void> {
    const durable =
      entry.level === "error" ||
      entry.level === "warn" ||
      entry.channel === "security" ||
      entry.channel === "performance";
    if (!durable) return;

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("app_logs").insert({
        level: entry.level,
        channel: entry.channel,
        message: entry.message.slice(0, 2000),
        request_id: entry.context.requestId ?? null,
        correlation_id: entry.context.correlationId ?? null,
        user_id: entry.context.userId ?? null,
        duration_ms: entry.context.durationMs ?? null,
        context: scrub(entry.context) as never,
      });
    } catch {
      // Logging must never break the request path.
    }
  }
}

const sinks: LogSink[] = [new ConsoleSink(), new DatabaseSink()];

export function registerLogSink(sink: LogSink): void {
  sinks.push(sink);
}

function emit(
  level: LogLevel,
  channel: LogChannel,
  message: string,
  context: LogContext = {},
  error?: unknown,
): void {
  for (const sink of sinks) void sink.write({ level, channel, message, context, error });
}

export const logger = {
  debug: (message: string, context?: LogContext) => emit("debug", "app", message, context),
  info: (message: string, context?: LogContext) => emit("info", "app", message, context),
  warn: (message: string, context?: LogContext) => emit("warn", "app", message, context),
  error: (message: string, error?: unknown, context?: LogContext) =>
    emit("error", "app", message, context, error),
  channel: (channel: LogChannel) => ({
    info: (message: string, context?: LogContext) => emit("info", channel, message, context),
    warn: (message: string, context?: LogContext) => emit("warn", channel, message, context),
    error: (message: string, error?: unknown, context?: LogContext) =>
      emit("error", channel, message, context, error),
  }),
};

const SLOW_MS = 750;

/** Times an operation and reports anything slower than the threshold. */
export async function measure<T>(
  name: string,
  operation: () => Promise<T>,
  context: LogContext = {},
): Promise<T> {
  const started = Date.now();
  try {
    return await operation();
  } finally {
    const durationMs = Date.now() - started;
    if (durationMs >= SLOW_MS) {
      emit("warn", "performance", `slow operation: ${name}`, { ...context, durationMs });
    }
  }
}
