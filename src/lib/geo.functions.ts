import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

/**
 * Server-side region hint. Reads edge geo headers; returns null when unavailable
 * so the client can fall back to timezone/locale detection.
 */
export const getVisitorRegion = createServerFn({ method: "GET" }).handler(async () => {
  const country =
    getRequestHeader("cf-ipcountry") ??
    getRequestHeader("x-vercel-ip-country") ??
    getRequestHeader("cloudfront-viewer-country") ??
    getRequestHeader("x-country-code") ??
    getRequestHeader("x-geo-country") ??
    getRequestHeader("x-appengine-country") ??
    getRequestHeader("geoip-country-code") ??
    null;

  if (!country || country === "XX" || country.length !== 2) return { country: null };
  return { country: country.toUpperCase() };
});
