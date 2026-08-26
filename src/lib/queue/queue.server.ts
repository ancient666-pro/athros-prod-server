import { logger } from "@/lib/observability/logger.server";
import { QUEUES, type EnqueueOptions, type Job, type QueueName } from "./queue";

/**
 * Queue driver contract. Default driver is Postgres (`public.job_queue`), which
 * is durable across isolates; a Redis driver can be installed with `setQueueDriver`.
 */
export interface QueueDriver {
  enqueue(
    queue: QueueName,
    payload: Record<string, unknown>,
    options?: EnqueueOptions,
  ): Promise<string>;
  claim(queue: QueueName, limit: number): Promise<Job[]>;
  complete(jobId: string): Promise<void>;
  fail(jobId: string, error: string, attempts: number, maxAttempts: number): Promise<void>;
  depth(): Promise<number>;
}

const WORKER_ID = `worker-${crypto.randomUUID().slice(0, 8)}`;
const BACKOFF_MS = [5_000, 30_000, 120_000, 600_000, 1_800_000];

class PostgresQueueDriver implements QueueDriver {
  private async db() {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return supabaseAdmin;
  }

  async enqueue(
    queue: QueueName,
    payload: Record<string, unknown>,
    options: EnqueueOptions = {},
  ): Promise<string> {
    const db = await this.db();
    const { data, error } = await db
      .from("job_queue")
      .insert({
        queue,
        payload: payload as never,
        run_at: (options.runAt ?? new Date()).toISOString(),
        priority: options.priority ?? 0,
        max_attempts: options.maxAttempts ?? 5,
      })
      .select("id")
      .single();
    if (error) throw new Error(`enqueue failed: ${error.message}`);
    return data.id;
  }

  async claim(queue: QueueName, limit: number): Promise<Job[]> {
    const db = await this.db();
    const { data, error } = await db
      .from("job_queue")
      .select("id, queue, payload, attempts, max_attempts")
      .eq("queue", queue)
      .eq("status", "pending")
      .lte("run_at", new Date().toISOString())
      .order("priority", { ascending: false })
      .order("run_at", { ascending: true })
      .limit(limit);
    if (error) throw new Error(`claim failed: ${error.message}`);

    const claimed: Job[] = [];
    for (const row of data ?? []) {
      // Optimistic lock: only the isolate that flips `pending -> running` owns it.
      const { data: locked } = await db
        .from("job_queue")
        .update({
          status: "running",
          locked_at: new Date().toISOString(),
          locked_by: WORKER_ID,
          attempts: row.attempts + 1,
        })
        .eq("id", row.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (!locked) continue;
      claimed.push({
        id: row.id,
        queue: row.queue as QueueName,
        payload: (row.payload ?? {}) as Record<string, unknown>,
        attempts: row.attempts + 1,
        maxAttempts: row.max_attempts,
      });
    }
    return claimed;
  }

  async complete(jobId: string): Promise<void> {
    const db = await this.db();
    await db
      .from("job_queue")
      .update({ status: "completed", completed_at: new Date().toISOString(), locked_by: null })
      .eq("id", jobId);
  }

  async fail(jobId: string, error: string, attempts: number, maxAttempts: number): Promise<void> {
    const db = await this.db();
    const exhausted = attempts >= maxAttempts;
    const delay = BACKOFF_MS[Math.min(attempts - 1, BACKOFF_MS.length - 1)] ?? 60_000;
    await db
      .from("job_queue")
      .update({
        status: exhausted ? "failed" : "pending",
        last_error: error.slice(0, 1000),
        run_at: new Date(Date.now() + delay).toISOString(),
        locked_by: null,
        locked_at: null,
      })
      .eq("id", jobId);
  }

  async depth(): Promise<number> {
    const db = await this.db();
    const { count } = await db
      .from("job_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    return count ?? 0;
  }
}

let driver: QueueDriver = new PostgresQueueDriver();

export function setQueueDriver(next: QueueDriver): void {
  driver = next;
}

export type JobHandler = (job: Job) => Promise<void>;

const handlers = new Map<QueueName, JobHandler>();

export function registerJobHandler(queue: QueueName, handler: JobHandler): void {
  handlers.set(queue, handler);
}

export function enqueue(
  queue: QueueName,
  payload: Record<string, unknown>,
  options?: EnqueueOptions,
): Promise<string> {
  return driver.enqueue(queue, payload, options);
}

export interface DrainResult {
  processed: number;
  failed: number;
}

/** Processes due jobs for one queue (or every queue) — safe to call from cron. */
export async function drainQueues(queue?: QueueName, batchSize = 10): Promise<DrainResult> {
  const targets: QueueName[] = queue ? [queue] : [...QUEUES];
  const log = logger.channel("queue");
  let processed = 0;
  let failed = 0;

  for (const name of targets) {
    const handler = handlers.get(name);
    if (!handler) continue;
    const jobs = await driver.claim(name, batchSize);
    for (const job of jobs) {
      try {
        await handler(job);
        await driver.complete(job.id);
        processed += 1;
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        await driver.fail(job.id, message, job.attempts, job.maxAttempts);
        log.error(`job failed: ${name}`, error, { jobId: job.id, attempts: job.attempts });
      }
    }
  }

  return { processed, failed };
}

export function queueDepth(): Promise<number> {
  return driver.depth();
}
