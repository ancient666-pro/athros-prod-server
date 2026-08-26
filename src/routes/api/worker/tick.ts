import { createFileRoute } from "@tanstack/react-router";
import { runWorkerTick } from "@/lib/queue/handlers.server";

/** Worker cron tick: POST /api/worker/tick
 *  Protected by CRON_SECRET header to prevent unauthorized invocation.
 */
export const Route = createFileRoute("/api/worker/tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const cronSecret = process.env.CRON_SECRET;
        if (!cronSecret) {
          return new Response(
            JSON.stringify({ error: { code: "unconfigured", message: "Worker not configured" } }),
            { status: 503, headers: { "content-type": "application/json" } },
          );
        }

        const provided =
          request.headers.get("x-cron-secret") ??
          request.headers.get("authorization")?.replace("Bearer ", "");
        if (!provided || provided !== cronSecret) {
          return new Response(
            JSON.stringify({ error: { code: "unauthorized", message: "Invalid worker secret" } }),
            { status: 401, headers: { "content-type": "application/json" } },
          );
        }

        try {
          const result = await runWorkerTick();
          return new Response(
            JSON.stringify({ ok: true, ...result, timestamp: new Date().toISOString() }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "Worker tick failed";
          return new Response(JSON.stringify({ error: { code: "internal", message } }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
