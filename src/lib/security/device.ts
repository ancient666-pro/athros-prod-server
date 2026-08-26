/** Device/user-agent parsing and fingerprinting. Client-safe (pure functions). */
export interface DeviceInfo {
  readonly browser: string;
  readonly os: string;
  readonly device: string;
}

export function parseUserAgent(userAgent: string | null): DeviceInfo {
  const ua = userAgent ?? "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Safari\//.test(ua) && /Version\//.test(ua)
          ? "Safari"
          : /Firefox\//.test(ua)
            ? "Firefox"
            : ua
              ? "Other"
              : "Unknown";

  const os = /Windows NT/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /(iPhone|iPad|iPod)/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Unknown";

  const device = /iPad|Tablet/.test(ua)
    ? "Tablet"
    : /Mobile|iPhone|Android/.test(ua)
      ? "Mobile"
      : "Desktop";

  return { browser, os, device };
}

/** Stable, non-PII device fingerprint derived from request-shaped inputs. */
export async function fingerprint(parts: {
  userAgent: string | null;
  acceptLanguage: string | null;
  platform?: string | null;
}): Promise<string> {
  const input = [parts.userAgent ?? "", parts.acceptLanguage ?? "", parts.platform ?? ""].join("|");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)]
    .slice(0, 16)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
