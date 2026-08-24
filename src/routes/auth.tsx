import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy path — the portal now has separate client (/login) and staff (/admin/login) entries. */
export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    throw redirect({ to: "/login", replace: true });
  },
});
