import { Reveal, SectionHeading } from "./primitives";

const steps = [
  {
    step: "01",
    title: "Share Idea",
    body: "A 30-minute call. You describe the outcome; we return a scope and a date.",
  },
  {
    step: "02",
    title: "AI Blueprint",
    body: "Architecture, data model, and screen inventory generated and reviewed by an architect.",
  },
  {
    step: "03",
    title: "Engineering Sprint",
    body: "Daily builds, a shared board, and a dedicated engineer in your channel.",
  },
  {
    step: "04",
    title: "Launch",
    body: "Store submission, monitoring, CI/CD, and handover of the full repository.",
  },
];

export function Process() {
  return (
    <section id="process" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading
          eyebrow="Process"
          title="Four steps. Zero guesswork."
          subtitle="The same repeatable process behind every app we deliver."
        />

        <div className="relative mt-14 grid gap-4 md:grid-cols-4">
          <span className="pointer-events-none absolute top-[46px] right-6 left-6 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />
          {steps.map((item, index) => (
            <Reveal key={item.step} delay={index * 0.08}>
              <article className="group relative h-full rounded-3xl border border-border bg-card/60 p-6 backdrop-blur transition-all duration-500 hover:-translate-y-1.5 hover:border-nv/50 hover:shadow-[var(--shadow-elevated)]">
                <span className="font-display grid h-11 w-11 place-items-center rounded-2xl border border-border bg-background text-sm font-semibold transition-colors group-hover:border-nv group-hover:text-nv">
                  {item.step}
                </span>
                <h3 className="mt-5 text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
