import { createFileRoute } from "@tanstack/react-router";

/** Public health check: GET /api/public/health */
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const start = Date.now();
        const checks: Record<string, { status: "ok" | "degraded" | "down"; latencyMs?: number }> =
          {};

        // Check database connectivity
        try {
          const dbStart = Date.now();
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.from("currencies").select("code").limit(1);
          checks.database = {
            status: error ? "down" : "ok",
            latencyMs: Date.now() - dbStart,
          };
        } catch (e) {
          checks.database = { status: "down" };
        }

        // Check storage connectivity
        try {
          const storageStart = Date.now();
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.storage.from("documents").list("", { limit: 1 });
          checks.storage = {
            status: error ? "degraded" : "ok",
            latencyMs: Date.now() - storageStart,
          };
        } catch (e) {
          checks.storage = { status: "degraded" };
        }

        const allOk = Object.values(checks).every((c) => c.status === "ok");
        const status = allOk ? 200 : 503;

        return new Response(
          JSON.stringify({
            status: allOk ? "healthy" : "degraded",
            version: process.env.npm_package_version ?? "unknown",
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV ?? "unknown",
            checks,
            latencyMs: Date.now() - start,
          }),
          {
            status,
            headers: {
              "content-type": "application/json; charset=utf-8",
              "cache-control": "no-store",
            },
          },
        );
      },
    },
  },
});
