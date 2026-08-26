import { z } from "zod";

/** Client-safe password policy. Used by both the UI and the server. */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

const COMMON = [
  "password",
  "qwerty",
  "letmein",
  "welcome",
  "admin",
  "athros",
  "123456",
  "iloveyou",
];

export interface PasswordStrength {
  readonly score: 0 | 1 | 2 | 3 | 4;
  readonly label: "very weak" | "weak" | "fair" | "strong" | "excellent";
  readonly failures: readonly string[];
  readonly acceptable: boolean;
}

export function evaluatePassword(password: string): PasswordStrength {
  const failures: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) {
    failures.push(`Use at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  if (password.length > PASSWORD_MAX_LENGTH) failures.push("Password is too long");
  if (!/[a-z]/.test(password)) failures.push("Add a lowercase letter");
  if (!/[A-Z]/.test(password)) failures.push("Add an uppercase letter");
  if (!/[0-9]/.test(password)) failures.push("Add a number");
  if (!/[^A-Za-z0-9]/.test(password)) failures.push("Add a symbol");
  if (/(.)\1{2,}/.test(password)) failures.push("Avoid repeating the same character");
  if (COMMON.some((entry) => password.toLowerCase().includes(entry))) {
    failures.push("Avoid common words");
  }

  const variety =
    Number(/[a-z]/.test(password)) +
    Number(/[A-Z]/.test(password)) +
    Number(/[0-9]/.test(password)) +
    Number(/[^A-Za-z0-9]/.test(password));
  const lengthBonus = password.length >= 20 ? 2 : password.length >= 16 ? 1 : 0;
  const raw = Math.max(0, Math.min(4, variety + lengthBonus - failures.length));
  const score = raw as PasswordStrength["score"];

  const labels: PasswordStrength["label"][] = ["very weak", "weak", "fair", "strong", "excellent"];

  return {
    score,
    label: labels[score] ?? "very weak",
    failures,
    acceptable: failures.length === 0,
  };
}

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH)
  .max(PASSWORD_MAX_LENGTH)
  .refine((value) => evaluatePassword(value).acceptable, {
    message: "Password does not meet the security policy",
  });

/** Account-lock policy. */
export const LOCK_POLICY = {
  maxFailedAttempts: 5,
  lockMinutes: 15,
  attemptWindowMinutes: 15,
  passwordHistorySize: 5,
  passwordMaxAgeDays: 180,
} as const;
