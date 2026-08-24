import { createFileRoute } from "@tanstack/react-router";

/** Versioned REST item endpoint: /api/v1/<resource>/<id> */
export const Route = createFileRoute("/api/v1/$resource/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        (await import("@/lib/api/handler.server")).itemHandler(request, params.resource, params.id),
      PATCH: async ({ request, params }) =>
        (await import("@/lib/api/handler.server")).itemHandler(request, params.resource, params.id),
    },
  },
});
