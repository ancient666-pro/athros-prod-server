/**
 * Project lifecycle engine (pure, client-safe).
 * The allowed-transition graph is the single source of truth for both the
 * server transition helper and the admin UI.
 */
export const PROJECT_STATUSES = [
  "discovery",
  "requirements",
  "design",
  "development",
  "testing",
  "uat",
  "delivery",
  "live",
  "maintenance",
  "on_hold",
  "completed",
  "cancelled",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

/** Terminal states accept no further transitions. */
export const TERMINAL_STATUSES: readonly ProjectStatus[] = ["completed", "cancelled"];

const FORWARD: Record<ProjectStatus, readonly ProjectStatus[]> = {
  discovery: ["requirements", "cancelled", "on_hold"],
  requirements: ["design", "discovery", "on_hold", "cancelled"],
  design: ["development", "requirements", "on_hold", "cancelled"],
  development: ["testing", "design", "on_hold", "cancelled"],
  testing: ["uat", "development", "on_hold", "cancelled"],
  uat: ["delivery", "testing", "on_hold", "cancelled"],
  delivery: ["live", "uat", "on_hold", "cancelled"],
  live: ["maintenance", "completed", "on_hold"],
  maintenance: ["live", "completed", "on_hold"],
  on_hold: [
    "discovery",
    "requirements",
    "design",
    "development",
    "testing",
    "uat",
    "delivery",
    "live",
    "maintenance",
    "cancelled",
  ],
  completed: [],
  cancelled: [],
};

/** Progress floor per stage, used to keep the client-visible bar monotonic. */
export const STATUS_PROGRESS: Record<ProjectStatus, number> = {
  discovery: 5,
  requirements: 15,
  design: 30,
  development: 55,
  testing: 70,
  uat: 82,
  delivery: 92,
  live: 97,
  maintenance: 100,
  completed: 100,
  on_hold: 0,
  cancelled: 0,
};

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return typeof value === "string" && (PROJECT_STATUSES as readonly string[]).includes(value);
}

export function allowedTransitions(from: ProjectStatus): readonly ProjectStatus[] {
  return FORWARD[from];
}

export function canTransition(from: ProjectStatus, to: ProjectStatus): boolean {
  if (from === to) return false;
  return FORWARD[from].includes(to);
}

export interface TransitionCheck {
  readonly ok: boolean;
  readonly reason?: string;
}

export function validateTransition(from: ProjectStatus, to: ProjectStatus): TransitionCheck {
  if (from === to) return { ok: false, reason: `Project is already ${to}` };
  if (TERMINAL_STATUSES.includes(from)) {
    return { ok: false, reason: `${from} is a terminal status` };
  }
  if (!canTransition(from, to)) {
    return { ok: false, reason: `Cannot move from ${from} to ${to}` };
  }
  return { ok: true };
}

/** Progress never regresses except into a reset state (on_hold / cancelled). */
export function nextProgress(current: number, to: ProjectStatus): number {
  const floor = STATUS_PROGRESS[to];
  if (floor === 0) return current;
  return Math.max(current, floor);
}
