import { BadgeCheck, Boxes, Cpu, Gauge, LifeBuoy, Rocket, ShieldCheck, Users } from "lucide-react";
import { Reveal, SectionHeading } from "./primitives";

const cards = [
  {
    icon: Cpu,
    title: "AI Accelerated Development",
    body: "Agentic tooling handles scaffolding and boilerplate so engineers spend their hours on product logic.",
  },
  {
    icon: Gauge,
    title: "Native Performance",
    body: "Kotlin and Swift where it matters. 60fps interactions, cold starts under a second.",
  },
  {
    icon: Boxes,
    title: "Pixel Perfect UI",
    body: "Design systems built to spec — tokens, motion, and states documented before code ships.",
  },
  {
    icon: Rocket,
    title: "Scalable Architecture",
    body: "Modular domains, typed contracts, and infrastructure that survives your Series A traffic.",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Security",
    body: "RLS, secret rotation, audit trails, and penetration-tested release candidates.",
  },
  {
    icon: Users,
    title: "Dedicated Engineers",
    body: "A named architect and squad on your sprint board — not an anonymous outsourcing pool.",
  },
  {
    icon: BadgeCheck,
    title: "Deployment Included",
    body: "Play Store and App Store submission, signing, screenshots, and review handling done for you.",
  },
  {
    icon: LifeBuoy,
    title: "Post Launch Support",
    body: "Crash monitoring, performance budgets, and a support window that starts at 90 days.",
  },
];

export function WhyUs() {
  return (
    <section id="services" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading
          eyebrow="Why us"
          title={
            <>
              Why founders choose <span className="text-gradient-nv">Athros</span>
            </>
          }
          subtitle="Eight commitments that make the difference between a demo and a business."
        />

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card, index) => (
            <Reveal key={card.title} delay={index * 0.05}>
              <article className="glass-card group h-full p-6 transition-transform duration-500 hover:-translate-y-1.5">
                <div className="relative z-10">
                  <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-nv/35 bg-nv-soft/75 text-nv shadow-[0_2px_8px_-2px_var(--nv-soft)] backdrop-blur-sm transition-all duration-300 group-hover:border-nv/70 group-hover:shadow-[0_4px_14px_-3px_var(--nv)]">
                    <card.icon className="relative z-10 h-5 w-5 text-nv transition-transform duration-300 group-hover:scale-105 stroke-[1.8]" />
                    {/* Subtle icon reflection shimmer on card hover */}
                    <span className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(115deg,transparent_20%,oklch(1_0_0/45%)_50%,transparent_80%)] opacity-0 transition-all duration-700 ease-out group-hover:translate-x-full group-hover:opacity-100" />
                  </div>
                  <h3 className="mt-5 text-base font-semibold">{card.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                    {card.body}
                  </p>
                </div>
                <span className="pointer-events-none absolute -right-10 -bottom-10 h-28 w-28 rounded-full bg-[radial-gradient(circle,var(--nv-soft),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
