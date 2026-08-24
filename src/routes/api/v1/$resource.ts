import { createFileRoute } from "@tanstack/react-router";

/** Versioned REST collection endpoint: /api/v1/<resource> */
export const Route = createFileRoute("/api/v1/$resource")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        (await import("@/lib/api/handler.server")).collectionHandler(request, params.resource),
      POST: async ({ request, params }) =>
        (await import("@/lib/api/handler.server")).collectionHandler(request, params.resource),
    },
  },
});
