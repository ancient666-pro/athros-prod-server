import { Check, Flame, ArrowRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { MagneticButton, Reveal } from "./primitives";
import { cn } from "@/lib/utils";

export type PricingTier = {
  name: string;
  price: string;
  priceNote?: string;
  /** Comparable value anchor, e.g. "₹3,40,000" — rendered above the price. */
  worth?: string;
  meta: string;
  blurb?: string;
  cta: string;
  features: string[];
  featured?: boolean;
};

function FeatureList({ items, tone }: { items: string[]; tone: "nv" | "fire" }) {
  return (
    <ul className="relative z-10 mt-6 grid gap-2.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-[13.5px] leading-snug">
          <Check
            className={
              tone === "fire"
                ? "mt-0.5 h-3.5 w-3.5 shrink-0 text-[oklch(0.32_0.08_45)]"
                : "mt-0.5 h-3.5 w-3.5 shrink-0 text-nv"
            }
          />
          <span className={tone === "fire" ? "text-[oklch(0.24_0.04_45)]" : ""}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function getPackageKey(name: string): "mvp" | "production_ready" | "enterprise" {
  if (name.toLowerCase().includes("mvp")) return "mvp";
  if (name.toLowerCase().includes("enterprise")) return "enterprise";
  return "production_ready";
}

export function PricingCard({ tier, delay = 0 }: { tier: PricingTier; delay?: number }) {
  const tone = tier.featured ? "fire" : "nv";
  const navigate = useNavigate();
  const packageKey = getPackageKey(tier.name);

  const handleClick = () => {
    navigate({ to: "/booking", search: { package: packageKey } });
  };

  return (
    <Reveal delay={delay} y={tier.featured ? 44 : 26} className="h-full">
      <article
        className={cn("relative h-full", tier.featured && "lg:scale-[1.03]")}
        onClick={handleClick}
        style={{ cursor: "pointer" }}
      >
        {tier.featured ? (
          <>
            <div className="absolute -inset-[1.5px] rounded-[calc(var(--radius)+14px)] fire-surface opacity-90 blur-[1px]" />
            <div className="absolute -inset-6 rounded-[3rem] bg-[radial-gradient(circle,var(--fire-amber),transparent_70%)] opacity-40 blur-2xl" />
          </>
        ) : null}

        <div
          className={cn(
            "relative flex h-full flex-col justify-between overflow-hidden p-7",
            tier.featured
              ? "noise rounded-[calc(var(--radius)+12px)] fire-surface shadow-[var(--shadow-float)]"
              : "glass-card",
          )}
        >
          <div className="relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3
                className={cn(
                  "font-mono text-[11px] tracking-[0.2em] uppercase",
                  tier.featured ? "text-[oklch(0.28_0.06_45)]" : "text-muted-foreground",
                )}
              >
                {tier.name}
              </h3>
              {tier.featured ? (
                <span className="relative inline-flex shrink-0 items-center gap-1.5 overflow-hidden rounded-full bg-[oklch(0.2_0.03_40)] px-3 py-1 text-[10.5px] font-semibold tracking-wide text-[oklch(0.95_0.1_85)]">
                  <Flame className="h-3 w-3" />
                  MOST POPULAR
                  <span className="pointer-events-none absolute inset-y-0 w-full bg-[linear-gradient(100deg,transparent_0%,oklch(1_0_0/45%)_50%,transparent_100%)] animate-shimmer" />
                </span>
              ) : null}
            </div>

            {tier.worth ? (
              <p
                className={cn(
                  "mt-3 text-[12px]",
                  tier.featured ? "text-[oklch(0.3_0.05_45)]" : "text-muted-foreground",
                )}
              >
                Included worth <span className="line-through">{tier.worth}</span>
                <span className="ml-1.5 font-semibold">Today from</span>
              </p>
            ) : null}

            <p
              className={cn(
                "font-display mt-3 text-4xl font-semibold",
                tier.featured && "text-[oklch(0.18_0.03_40)]",
              )}
            >
              {tier.price}
              {tier.priceNote ? (
                <span
                  className={cn(
                    "ml-2 align-middle text-[13px] font-medium",
                    tier.featured ? "text-[oklch(0.3_0.05_45)]" : "text-muted-foreground",
                  )}
                >
                  {tier.priceNote}
                </span>
              ) : null}
            </p>

            {tier.blurb ? <p className="mt-2 text-[13.5px] font-semibold">{tier.blurb}</p> : null}

            <p
              className={cn(
                "mt-1.5 text-[13px]",
                tier.featured ? "text-[oklch(0.28_0.05_45)]" : "text-muted-foreground",
              )}
            >
              {tier.meta}
            </p>

            <MagneticButton
              href={`/booking?package=${packageKey}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate({ to: "/booking", search: { package: packageKey } });
              }}
              variant={tier.featured ? "primary" : "ghost"}
              className={cn(
                "mt-6 w-full",
                tier.featured && "bg-[oklch(0.18_0.03_40)] text-[oklch(0.96_0.08_85)]",
              )}
            >
              {tier.cta}
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </MagneticButton>

            <FeatureList items={tier.features} tone={tone} />
          </div>

          {tier.featured
            ? Array.from({ length: 12 }).map((_, index) => (
                <span
                  key={index}
                  className="pointer-events-none absolute h-1 w-1 rounded-full bg-[oklch(1_0_0/70%)]"
                  style={{
                    left: `${(index * 29) % 96}%`,
                    top: `${(index * 47) % 92}%`,
                    animation: `float-y ${5 + (index % 4)}s ease-in-out ${index * 0.3}s infinite`,
                  }}
                />
              ))
            : null}
        </div>
      </article>
    </Reveal>
  );
}
