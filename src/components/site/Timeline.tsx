import { useState } from "react";
import { Reveal, SectionHeading } from "./primitives";
import { cn } from "@/lib/utils";

const steps = [
  { name: "Idea", detail: "Discovery call, scope map, and success metrics agreed in writing." },
  { name: "Architecture", detail: "Data model, API contracts, and infrastructure plan approved." },
  { name: "Design", detail: "Design system, key flows, and motion spec delivered in Figma." },
  { name: "Development", detail: "Daily builds on TestFlight and internal Play track." },
  { name: "QA", detail: "Automated suites, device matrix, and security review." },
  { name: "Deployment", detail: "Store submission, signing, CI/CD, and observability live." },
  { name: "Scale", detail: "Performance budgets, cost tuning, and roadmap iteration." },
];

const tiers = [
  { name: "MVP", time: "48 Hours", note: "Validate fast with a shippable core." },
  { name: "Production", time: "5–7 Days", note: "Full architecture, payments, and stores." },
  { name: "Enterprise", time: "Custom Roadmap", note: "Managed squad and lifecycle ownership." },
];

export function Timeline() {
  const [active, setActive] = useState(0);

  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading
          eyebrow="Delivery timeline"
          title="From first call to store listing"
          subtitle="A fixed pipeline with named owners at every stage. Hover a step to see what happens."
        />

        <div className="mt-14 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <Reveal>
            <ol className="relative">
              <span className="absolute top-0 bottom-0 left-[15px] w-px bg-border" />
              {steps.map((step, index) => (
                <li
                  key={step.name}
                  onMouseEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  tabIndex={0}
                  className="relative cursor-default pl-12 outline-none last:pb-0"
                >
                  <span
                    className={cn(
                      "absolute top-1.5 left-[8px] h-4 w-4 rounded-full border-2 transition-all duration-300",
                      active === index
                        ? "scale-125 border-nv bg-nv shadow-[0_0_0_6px_var(--nv-soft)]"
                        : "border-border bg-background",
                    )}
                  />
                  <div className="pb-7">
                    <h3
                      className={cn(
                        "text-[15px] font-semibold transition-colors",
                        active === index ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {step.name}
                    </h3>
                    <p
                      className={cn(
                        "overflow-hidden text-[13px] text-muted-foreground transition-all duration-500",
                        active === index ? "mt-1.5 max-h-16 opacity-100" : "max-h-0 opacity-0",
                      )}
                    >
                      {step.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>

          <div className="grid content-start gap-4">
            {tiers.map((tier, index) => (
              <Reveal key={tier.name} delay={index * 0.08}>
                <article className="glass-card p-6 transition-transform duration-500 hover:-translate-y-1">
                  <div className="relative z-10 flex items-baseline justify-between gap-4">
                    <h3 className="text-base font-semibold">{tier.name}</h3>
                    <span className="font-mono text-[13px] text-nv">{tier.time}</span>
                  </div>
                  <p className="relative z-10 mt-2 text-[13px] text-muted-foreground">
                    {tier.note}
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
