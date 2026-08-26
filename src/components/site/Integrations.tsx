import type { CSSProperties } from "react";
import { Reveal } from "./primitives";
import { FrameworkLogo } from "./FrameworkLogo";

const rowOne = [
  "Kotlin",
  "Java",
  "Swift",
  "Flutter",
  "React Native",
  "Firebase",
  "Supabase",
  "PostgreSQL",
  "Node.js",
  "NestJS",
  "Docker",
  "Kubernetes",
  "Redis",
  "MongoDB",
  "Sentry",
  "GitHub",
  "GitLab",
];

const rowTwo = [
  "Bitbucket",
  "OpenAI",
  "ChatGPT",
  "Claude",
  "Gemini",
  "Anthropic",
  "Stripe",
  "Razorpay",
  "Google Maps",
  "AWS",
  "Azure",
  "GCP",
  "Play Store",
  "App Store",
  "Figma",
  "Linear",
  "Jira",
];

function Row({
  items,
  duration,
  reverse,
}: {
  items: string[];
  duration: string;
  reverse?: boolean;
}) {
  return (
    <div className="marquee-mask overflow-hidden">
      <div
        className="flex w-max animate-marquee gap-3"
        style={
          {
            "--marquee-duration": duration,
            animationDirection: reverse ? "reverse" : "normal",
          } as CSSProperties
        }
      >
        {[...items, ...items].map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="flex items-center gap-2 rounded-2xl border border-border bg-card/70 px-5 py-3 text-[13.5px] font-medium whitespace-nowrap backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.06] hover:border-nv/60 hover:shadow-[0_14px_40px_-16px_var(--nv)]"
          >
            <FrameworkLogo name={item} className="h-4 w-4" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Integrations() {
  return (
    <section className="relative border-y border-border/70 py-16 sm:py-20">
      <Reveal className="mx-auto mb-8 max-w-6xl px-5 text-center">
        <p className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
          The stack we ship with
        </p>
      </Reveal>
      <div className="grid gap-3">
        <Row items={rowOne} duration="46s" />
        <Row items={rowTwo} duration="54s" reverse />
      </div>
    </section>
  );
}
