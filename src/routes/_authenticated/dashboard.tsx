import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Clock,
  CreditCard,
  Download,
  Loader2,
  Lock,
  Smartphone,
} from "lucide-react";
import { getMyPortal } from "@/lib/portal.functions";
import { PortalShell } from "@/components/portal/PortalShell";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { mailtoHref, siteConfig, telHref } from "@/lib/site-config";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Client Dashboard — Athros" },
      {
        name: "description",
        content:
          "Your Athros command center: sprint progress, milestone timeline, issues, payments and build delivery.",
      },
      { property: "og:title", content: "Client Dashboard — Athros" },
      {
        property: "og:description",
        content: "Sprint progress, issues, payments and build delivery in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

const statusIcon = (status: string) =>
  status === "done" || status === "completed" ? (
    <CheckCircle2 className="h-4 w-4 text-nv" />
  ) : status === "in_progress" ? (
    <Clock className="h-4 w-4 text-nv" />
  ) : (
    <Circle className="h-4 w-4 text-muted-foreground" />
  );

function DashboardPage() {
  const fetchPortal = useServerFn(getMyPortal);
  const { data, isPending, error } = useQuery({
    queryKey: ["portal"],
    queryFn: () => fetchPortal(),
  });

  if (isPending) {
    return (
      <PortalShell subtitle="Client command center">
        <div className="grid h-64 place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-nv" />
        </div>
      </PortalShell>
    );
  }

  if (error || !data) {
    return (
      <PortalShell subtitle="Client command center">
        <p className="mt-6 rounded-2xl border border-border p-6 text-[14px] text-muted-foreground">
          We couldn’t load your workspace. Refresh, or reach us at{" "}
          <a className="text-nv" href={mailtoHref}>
            {siteConfig.supportEmail}
          </a>
          .
        </p>
      </PortalShell>
    );
  }

  const { project, milestones, issues, payments, deliveries, profile, isAdmin, booking } = data;
  const openIssues = issues.filter((issue) => issue.status !== "resolved").length;
  const paid = payments.filter((payment) => payment.status === "paid").length;

  return (
    <PortalShell isAdmin={isAdmin} subtitle="Client command center">
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {project ? project.name : `Welcome, ${profile?.full_name ?? "founder"}`}
          </h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            {project
              ? (project.summary ?? "Live status of your native build.")
              : "Your project workspace is being set up by our delivery team."}
          </p>
        </div>
        {project ? (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-full capitalize">
              {project.status.replace(/_/g, " ")}
            </Badge>
            {(project.platforms ?? []).map((platform) => (
              <Badge key={platform} className="rounded-full bg-nv/15 text-foreground">
                {platform}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      {!project ? (
        <div className="glass mt-8 rounded-3xl border border-border p-8">
          <h2 className="font-display text-xl font-semibold">Nothing here yet</h2>
          <p className="mt-2 max-w-xl text-[14px] text-muted-foreground">
            As soon as your engagement kicks off, this workspace fills with sprint progress,
            milestone timeline, issue tracking, payment schedule and signed builds.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild>
              <a href={siteConfig.bookingUrl} target="_blank" rel="noreferrer">
                Book a discovery call
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={telHref}>Call {siteConfig.supportPhone}</a>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Sprint progress" value={`${project.progress}%`}>
              <Progress value={project.progress} className="mt-3 h-1.5" />
            </StatCard>
            <StatCard
              label="Milestones done"
              value={`${milestones.filter((milestone) => milestone.status === "done").length}/${milestones.length}`}
            />
            <StatCard label="Open issues" value={String(openIssues)} />
            <StatCard label="Payments settled" value={`${paid}/${payments.length}`} />
          </div>

          {/* Project Services — read-only snapshot of what was booked */}
          {booking && (
            <div className="mt-6 glass rounded-3xl border border-border p-6">
              <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                Project Services
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge className="rounded-full capitalize">
                  {(booking.package as string).replace(/_/g, " ")}
                </Badge>
                <span className="text-xs text-muted-foreground">{booking.currency}</span>
              </div>

              {Array.isArray(booking.selected_services) &&
                (
                  booking.selected_services as Array<{
                    serviceId: string;
                    serviceLabel: string;
                    planId: string;
                    planName: string;
                    currency: string;
                    subtotalCents: number;
                    isRecurring: boolean;
                    deliveryDuration: string;
                    allocationHours?: string | null;
                  }>
                ).length > 0 && (
                  <ul className="mt-4 space-y-2">
                    {(
                      booking.selected_services as Array<{
                        serviceId: string;
                        serviceLabel: string;
                        planId: string;
                        planName: string;
                        currency: string;
                        subtotalCents: number;
                        isRecurring: boolean;
                        deliveryDuration: string;
                        allocationHours?: string | null;
                      }>
                    ).map((svc, i) => (
                      <li
                        key={`${svc.serviceId}-${svc.planId}-${i}`}
                        className="flex items-center justify-between rounded-xl border border-border px-4 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium">{svc.serviceLabel}</p>
                          <p className="text-xs text-muted-foreground">
                            {svc.planName}
                            {svc.isRecurring
                              ? ` · ${svc.allocationHours ?? "Monthly"}`
                              : ` · ${svc.deliveryDuration}`}
                          </p>
                        </div>
                        <span className="font-mono text-sm">
                          {svc.subtotalCents > 0
                            ? `${svc.currency} ${(svc.subtotalCents / 100).toLocaleString()}`
                            : "Custom quote"}
                          {svc.isRecurring ? "/mo" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-border p-3 text-center">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Total
                  </p>
                  <p className="mt-1 font-mono text-base font-semibold">
                    {booking.currency}{" "}
                    {((booking.full_amount_cents as number) / 100).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-nv/40 bg-nv/10 p-3 text-center">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-nv font-semibold">
                    Token ({booking.token_percentage}%)
                  </p>
                  <p className="mt-1 font-mono text-base font-bold">
                    {booking.currency}{" "}
                    {((booking.token_amount_cents as number) / 100).toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3 text-center">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Balance
                  </p>
                  <p className="mt-1 font-mono text-base font-semibold">
                    {booking.currency}{" "}
                    {(
                      ((booking.full_amount_cents as number) -
                        (booking.token_amount_cents as number)) /
                      100
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Tabs defaultValue="timeline" className="mt-10">
            <TabsList className="flex-wrap">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="delivery">Delivery</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-6">
              <Panel empty={milestones.length === 0} emptyText="No milestones published yet.">
                <ol className="relative ml-2 border-l border-border pl-6">
                  {milestones.map((milestone) => (
                    <li key={milestone.id} className="relative pb-6 last:pb-0">
                      <span className="absolute -left-[31px] grid h-6 w-6 place-items-center rounded-full border border-border bg-card">
                        {statusIcon(milestone.status)}
                      </span>
                      <p className="text-[14.5px] font-medium">{milestone.title}</p>
                      {milestone.detail ? (
                        <p className="mt-1 text-[13.5px] text-muted-foreground">
                          {milestone.detail}
                        </p>
                      ) : null}
                      <p className="mt-1 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
                        {milestone.status.replace(/_/g, " ")}
                        {milestone.due_date ? ` · due ${milestone.due_date}` : ""}
                      </p>
                    </li>
                  ))}
                </ol>
              </Panel>
            </TabsContent>

            <TabsContent value="issues" className="mt-6">
              <Panel empty={issues.length === 0} emptyText="No issues reported. Clean build.">
                <ul className="grid gap-3">
                  {issues.map((issue) => (
                    <li
                      key={issue.id}
                      className="flex items-start justify-between gap-4 rounded-2xl border border-border p-4"
                    >
                      <div>
                        <p className="flex items-center gap-2 text-[14.5px] font-medium">
                          <AlertTriangle className="h-4 w-4 text-nv" /> {issue.title}
                        </p>
                        {issue.detail ? (
                          <p className="mt-1 text-[13.5px] text-muted-foreground">{issue.detail}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <Badge variant="outline" className="rounded-full capitalize">
                          {issue.status.replace(/_/g, " ")}
                        </Badge>
                        <span className="font-mono text-[11px] text-muted-foreground uppercase">
                          {issue.severity}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            </TabsContent>

            <TabsContent value="payments" className="mt-6">
              <Panel empty={payments.length === 0} emptyText="No invoices scheduled yet.">
                <ul className="grid gap-3">
                  {payments.map((payment) => (
                    <li
                      key={payment.id}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4"
                    >
                      <div>
                        <p className="flex items-center gap-2 text-[14.5px] font-medium">
                          <CreditCard className="h-4 w-4 text-nv" /> {payment.label}
                        </p>
                        <p className="mt-1 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
                          {payment.due_date ? `due ${payment.due_date}` : "no due date"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[15px] font-semibold">
                          {payment.currency} {(payment.amount_cents / 100).toLocaleString()}
                        </p>
                        <Badge variant="outline" className="mt-1 rounded-full capitalize">
                          {payment.status}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            </TabsContent>

            <TabsContent value="delivery" className="mt-6">
              <Panel empty={deliveries.length === 0} emptyText="No builds released yet.">
                <ul className="grid gap-3 sm:grid-cols-2">
                  {deliveries.map((delivery) => (
                    <li key={delivery.id} className="rounded-2xl border border-border p-4">
                      <p className="flex items-center gap-2 text-[14.5px] font-medium">
                        <Smartphone className="h-4 w-4 text-nv" /> {delivery.label}
                      </p>
                      <p className="mt-1 font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
                        {delivery.kind}
                        {delivery.version ? ` · v${delivery.version}` : ""}
                      </p>
                      {delivery.unlocked && delivery.download_url ? (
                        <Button asChild size="sm" className="mt-3">
                          <a href={delivery.download_url} target="_blank" rel="noreferrer">
                            <Download className="h-3.5 w-3.5" /> Download
                          </a>
                        </Button>
                      ) : (
                        <p className="mt-3 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                          <Lock className="h-3.5 w-3.5" /> Locked — released after milestone
                          sign-off
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </Panel>
            </TabsContent>
          </Tabs>
        </>
      )}
    </PortalShell>
  );
}

function StatCard({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl border border-border p-5">
      <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="font-display mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {children}
    </div>
  );
}

function Panel({
  empty,
  emptyText,
  children,
}: {
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-3xl border border-border p-6">
      {empty ? <p className="text-[14px] text-muted-foreground">{emptyText}</p> : children}
    </div>
  );
}
