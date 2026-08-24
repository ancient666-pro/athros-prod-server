import { z } from "zod";

/** Durable queue names. Client-safe (types + names only). */
export const QUEUES = [
  "email",
  "notification",
  "webhook-retry",
  "invoice-generation",
  "session-cleanup",
  "storage-cleanup",
  "audit-cleanup",
  "payment",
] as const;

export type QueueName = (typeof QUEUES)[number];

export const jobPayloadSchema = z.record(z.string(), z.unknown());

export interface Job {
  readonly id: string;
  readonly queue: QueueName;
  readonly payload: Record<string, unknown>;
  readonly attempts: number;
  readonly maxAttempts: number;
}

export interface EnqueueOptions {
  readonly runAt?: Date;
  readonly priority?: number;
  readonly maxAttempts?: number;
}
