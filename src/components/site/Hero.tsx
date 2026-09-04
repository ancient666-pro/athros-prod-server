import { motion } from "motion/react";
import { ArrowUpRight, Rocket } from "lucide-react";
import { useEffect, useState } from "react";
import { AICore } from "./AICore";
import { MagneticButton, Reveal, scrollToSection } from "./primitives";

const rotating = ["Build.", "Launch.", "Scale.", "Powered by AI."];

const badges = [
  "MVP Delivered in 48 Hours",
  "Native Android",
  "Native iOS",
  "Play Store Ready",
  "App Store Ready",
  "CI/CD Enabled",
  "Backend Included",
  "Managed Deployment",
];

function RotatingWord() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex((value) => (value + 1) % rotating.length), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="relative inline-flex h-[1.2em] overflow-hidden align-bottom">
      <motion.span
        key={rotating[index]}
        initial={{ y: "100%", opacity: 0, filter: "blur(8px)" }}
        animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-gradient-nv"
      >
        {rotating[index]}
      </motion.span>
    </span>
  );
}

export function Hero() {
  return (
    <section id="home" className="noise relative overflow-hidden pt-32 pb-10 sm:pt-40">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="grid-bg absolute inset-0 opacity-70" />
        <div className="absolute -top-40 left-[8%] h-[420px] w-[420px] animate-float rounded-full bg-[radial-gradient(circle,var(--nv-soft),transparent_65%)] blur-3xl" />
        <div className="absolute top-24 right-[4%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,oklch(0.93_0.05_215),transparent_68%)] opacity-70 blur-3xl" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 font-mono text-[11px] tracking-[0.16em] uppercase backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-nv opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-nv" />
              </span>
              AI native app studio · 2 slots left this month
            </span>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="mt-6 text-4xl leading-[1.02] font-semibold sm:text-5xl md:text-[3.7rem]">
              Launch Your Native App Before Your Competitors Even Start.
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="font-display mt-4 text-xl font-semibold tracking-tight sm:text-2xl">
              <RotatingWord />
            </p>
          </Reveal>

          <Reveal delay={0.24}>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
              We transform your startup idea into production-ready native Android and iOS
              applications. From MVP in 48 hours to enterprise-grade platforms delivered within days
              — built by experienced engineers, not just AI.
            </p>
          </Reveal>

          <Reveal delay={0.32}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <MagneticButton
                href="#pricing"
                onClick={(event) => {
                  event.preventDefault();
                  scrollToSection("#pricing");
                }}
              >
                <Rocket className="h-4 w-4" />
                Unleash Your Empire
              </MagneticButton>
              <MagneticButton href="tel:+918454094362" variant="ghost">
                Book a Strategy Call
                <ArrowUpRight className="h-4 w-4" />
              </MagneticButton>
            </div>
          </Reveal>

          <Reveal delay={0.4}>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-border pt-6">
              {[
                ["48h", "MVP delivery"],
                ["120+", "Apps shipped"],
                ["99.9%", "Uptime SLA"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="font-display text-2xl font-semibold">{value}</dt>
                  <dd className="text-xs text-muted-foreground">{label}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>

        <Reveal delay={0.2} y={40} className="-my-10 lg:my-0">
          <AICore />
        </Reveal>
      </div>

      <div className="marquee-mask mt-16 overflow-hidden border-y border-border/70 py-4">
        <div
          className="flex w-max animate-marquee gap-3"
          style={{ "--marquee-duration": "48s" } as React.CSSProperties}
        >
          {[...badges, ...badges].map((badge, index) => (
            <span
              key={`${badge}-${index}`}
              className="flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-2 text-[13px] font-medium whitespace-nowrap backdrop-blur"
            >
              <span className="text-nv">✓</span>
              {badge}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
