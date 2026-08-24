import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Lock, LockOpen } from "lucide-react";
import { getAdminOverview, setDeliveryLock, setProjectProgress } from "@/lib/portal.functions";
import { PortalShell } from "@/components/portal/PortalShell";
import { ProvisionClientCard } from "@/components/portal/ProvisionClientCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";



export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Portal — Athros" },
      {
        name: "description",
        content: "Athros internal portal: manage client projects, progress and build unlocks.",
      },
      { property: "og:title", content: "Admin Portal — Athros" },
      { property: "og:description", content: "Manage client projects, progress and build unlocks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const queryClient = useQueryClient();
  const fetchOverview = useServerFn(getAdminOverview);
  const saveProgress = useServerFn(setProjectProgress);
  const toggleLock = useServerFn(setDeliveryLock);
  const [drafts, setDrafts] = useState<Record<string, number>>({});

  const { data, isPending, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => fetchOverview(),
    retry: false,
  });

  const progressMutation = useMutation({
    mutationFn: (input: { projectId: string; progress: number }) => saveProgress({ data: input }),
    onSuccess: () => {
      toast.success("Progress updated");
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (mutationError: Error) => toast.error(mutationError.message),
  });

  const lockMutation = useMutation({
    mutationFn: (input: { id: string; unlocked: boolean }) => toggleLock({ data: input }),
    onSuccess: () => {
      toast.success("Delivery updated");
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (mutationError: Error) => toast.error(mutationError.message),
  });

  if (isPending) {
    return (
      <PortalShell isAdmin subtitle="Admin portal">
        <div className="grid h-64 place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-nv" />
        </div>
      </PortalShell>
    );
  }

  if (error || !data) {
    return (
      <PortalShell subtitle="Admin portal">
        <p className="mt-6 rounded-2xl border border-border p-6 text-[14px] text-muted-foreground">
          This area is restricted to Athros staff accounts.
        </p>
      </PortalShell>
    );
  }

  const clientName = (clientId: string) =>
    data.clients.find((client) => client.id === clientId)?.full_name ?? "Unassigned client";

  return (
    <PortalShell isAdmin subtitle="Admin portal">
      <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        Delivery control
      </h1>
      <p className="mt-2 text-[14px] text-muted-foreground">
        {data.clients.length} clients · {data.projects.length} projects · {data.deliveries.length} builds
      </p>

      <div className="mt-8">
        <ProvisionClientCard
          onCreated={() => queryClient.invalidateQueries({ queryKey: ["admin-overview"] })}
        />
      </div>



      <section className="mt-8 grid gap-4">
        {data.projects.map((project) => {
          const draft = drafts[project.id] ?? project.progress;
          const projectDeliveries = data.deliveries.filter(
            (delivery) => delivery.project_id === project.id,
          );
          return (
            <article key={project.id} className="glass rounded-3xl border border-border p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                    {clientName(project.client_id)}
                  </p>
                  <h2 className="font-display mt-1 text-xl font-semibold tracking-tight">
                    {project.name}
                  </h2>
                </div>
                <Badge variant="outline" className="rounded-full capitalize">
                  {project.status.replace(/_/g, " ")}
                </Badge>
              </div>

              <Progress value={project.progress} className="mt-4 h-1.5" />

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={draft}
                  onChange={(event) =>
                    setDrafts((prev) => ({ ...prev, [project.id]: Number(event.target.value) }))
                  }
                  className="w-24"
                />
                <Button
                  size="sm"
                  disabled={progressMutation.isPending}
                  onClick={() =>
                    progressMutation.mutate({
                      projectId: project.id,
                      progress: Math.max(0, Math.min(100, draft)),
                    })
                  }
                >
                  Save progress
                </Button>
              </div>

              {projectDeliveries.length > 0 ? (
                <ul className="mt-5 grid gap-2">
                  {projectDeliveries.map((delivery) => (
                    <li
                      key={delivery.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3"
                    >
                      <span className="text-[14px]">
                        {delivery.label}
                        <span className="ml-2 font-mono text-[11px] text-muted-foreground uppercase">
                          {delivery.kind}
                        </span>
                      </span>
                      <Button
                        size="sm"
                        variant={delivery.unlocked ? "outline" : "default"}
                        disabled={lockMutation.isPending}
                        onClick={() =>
                          lockMutation.mutate({ id: delivery.id, unlocked: !delivery.unlocked })
                        }
                      >
                        {delivery.unlocked ? (
                          <>
                            <LockOpen className="h-3.5 w-3.5" /> Unlocked
                          </>
                        ) : (
                          <>
                            <Lock className="h-3.5 w-3.5" /> Unlock
                          </>
                        )}
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          );
        })}
        {data.projects.length === 0 ? (
          <p className="rounded-2xl border border-border p-6 text-[14px] text-muted-foreground">
            No client projects yet.
          </p>
        ) : null}
      </section>
    </PortalShell>
  );
}
