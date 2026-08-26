import { motion, useInView } from "motion/react";
import { useRef } from "react";
import {
  Activity,
  BellRing,
  CreditCard,
  FileDown,
  GitBranch,
  MessageSquare,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { Reveal, SectionHeading } from "./primitives";

const features = [
  {
    icon: Activity,
    title: "Sprint Progress",
    copy: "Live percentage per module — no status meetings, no guessing.",
  },
  {
    icon: FileDown,
    title: "APK / IPA Delivery",
    copy: "Signed builds unlocked the moment a milestone is approved.",
  },
  {
    icon: GitBranch,
    title: "Release Timeline",
    copy: "Every commit, build and deployment mapped to your roadmap.",
  },
  {
    icon: MessageSquare,
    title: "Issue Desk",
    copy: "Raise a bug, get an owner and an ETA in the same thread.",
  },
  {
    icon: CreditCard,
    title: "Payments & Invoices",
    copy: "Milestone invoices, receipts and balances in one ledger.",
  },
  {
    icon: ShieldCheck,
    title: "Audit & Access",
    copy: "Role-based access for founders, investors and your team.",
  },
];

const modules = [
  { name: "Authentication", value: 100 },
  { name: "Payments", value: 82 },
  { name: "Native Android", value: 68 },
  { name: "Native iOS", value: 54 },
  { name: "Admin Dashboard", value: 35 },
];

function DashboardMock() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });

  return (
    <div ref={ref} className="glass-card relative overflow-hidden p-5 shadow-[var(--shadow-float)]">
      <div className="pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,var(--nv-soft),transparent_70%)] opacity-60 blur-3xl" />

      <div className="relative z-10 flex items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-nv text-[11px] font-bold text-[oklch(0.18_0.03_130)]">
            A
          </span>
          <div>
            <p className="text-[13px] font-semibold">Command Center</p>
            <p className="font-mono text-[10.5px] tracking-wide text-muted-foreground uppercase">
              Project · Helios Fintech
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-nv/40 bg-nv/10 px-2.5 py-1 text-[10.5px] font-semibold">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-nv" />
          On track
        </span>
      </div>

      <div className="relative z-10 mt-4 grid grid-cols-3 gap-2.5">
        {[
          ["Day", "4 / 7"],
          ["Modules", "12"],
          ["Open issues", "3"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-border bg-card/60 p-3">
            <p className="font-display text-lg font-semibold">{value}</p>
            <p className="text-[11px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="relative z-10 mt-4 grid gap-3">
        {modules.map((module, index) => (
          <div key={module.name}>
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-medium">{module.name}</span>
              <span className="font-mono text-[11px] text-muted-foreground">{module.value}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
              <motion.div
                className="h-full rounded-full bg-gradient-nv"
                initial={{ width: 0 }}
                animate={inView ? { width: `${module.value}%` } : { width: 0 }}
                transition={{
                  duration: 1.1,
                  delay: 0.15 + index * 0.12,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-10 mt-4 flex items-center justify-between rounded-2xl border border-border bg-card/60 p-3">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-nv" />
          <div>
            <p className="text-[12.5px] font-semibold">helios-v0.8.2.apk</p>
            <p className="text-[11px] text-muted-foreground">Milestone 3 · 42.8 MB</p>
          </div>
        </div>
        <span className="rounded-full bg-gradient-nv px-3 py-1.5 text-[11px] font-semibold text-[oklch(0.18_0.03_130)]">
          Unlocked
        </span>
      </div>

      <div className="relative z-10 mt-3 flex items-center gap-2 text-[11.5px] text-muted-foreground">
        <BellRing className="h-3.5 w-3.5 text-nv" />
        Push notification module deployed to staging · 12 min ago
      </div>
    </div>
  );
}

export function CommandCenter() {
  return (
    <section id="command-center" className="relative overflow-hidden py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-10 -z-10 mx-auto h-[380px] max-w-4xl rounded-full bg-[radial-gradient(circle,var(--nv-soft),transparent_70%)] opacity-40 blur-3xl" />

      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading
          eyebrow="Client Command Center"
          title="Watch your product get built — in real time."
          subtitle="Every client gets a private dashboard: sprint progress, builds, issues, payments and delivery in a single authority view."
        />

        <div className="mt-16 grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <Reveal y={36}>
            <DashboardMock />
          </Reveal>

          <div className="grid gap-3 sm:grid-cols-2">
            {features.map((feature, index) => (
              <Reveal key={feature.title} delay={0.06 + index * 0.06}>
                <article className="glass-card h-full p-5 transition-colors hover:border-nv/50">
                  <feature.icon className="h-4.5 w-4.5 text-nv" />
                  <h3 className="mt-3 text-[14.5px] font-semibold">{feature.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                    {feature.copy}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
