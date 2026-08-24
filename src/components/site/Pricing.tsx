import { PricingCard, type PricingTier } from "./PricingCard";
import { Reveal, SectionHeading } from "./primitives";
import { CURRENCIES, PRICING } from "@/lib/currency";
import { useCurrency } from "@/lib/use-currency";
import { cn } from "@/lib/utils";

const tiers: PricingTier[] = [
  {
    name: "MVP Pack",
    price: "$1,499",

    meta: "Validation · Investor demo · Hackathons · Early launch",
    cta: "Launch MVP",
    features: [
      "Native Android",
      "Essential Backend",
      "Authentication",
      "Core Features",
      "Firebase",
      "Supabase",
      "Basic Analytics",
      "Play Store Ready",
      "Delivery in 2 Days",
    ],
  },
  {
    name: "Production Ready",
    price: "$4,999",
    priceNote: "starting at",
    meta: "Delivered in 5–7 days · Android + iOS + backend",
    cta: "Build My Startup",
    featured: true,
    features: [
      "Everything in MVP",
      "Unlimited Screens",
      "Production Architecture",
      "Payments",
      "Push Notifications",
      "CI/CD",
      "Crash Monitoring + Sentry",
      "Analytics",
      "Play Store Deployment",
      "App Store Deployment",
      "Testing & Security",
      "Performance Optimization",
      "Offline Support",
      "Admin Dashboard",
      "PostgreSQL + Supabase",
      "Backend APIs & Cloud Functions",
      "Git Repository",
      "90 Days Support",
      "Priority Development",
      "Dedicated Engineer",
    ],
  },
  {
    name: "Enterprise Elite",
    price: "Custom",
    blurb: "Plug-and-play managed AI engineering team",
    meta: "Operate your entire application ecosystem through a dedicated team with centralized authority and complete lifecycle management.",
    cta: "Talk to Enterprise Team",
    features: [
      "Unlimited Modules",
      "Unlimited Integrations",
      "Dedicated Team",
      "Technical Architect",
      "AI Automation",
      "Security Audits",
      "Infrastructure Management",
      "Kubernetes",
      "Monitoring & SLA",
      "24×7 Support",
      "Scaling & Compliance",
      "White Label",
      "Custom AI Agents",
      "Internal Admin Portal",
      "Multi-tenant Architecture",
      "Single Authority Dashboard",
      "Cross-platform Ecosystem",
      "Full Ownership",
    ],
  },
];

export function Pricing() {
  const { currency, select } = useCurrency();
  const localized = PRICING[currency];

  const shown: PricingTier[] = tiers.map((tier, index) => {
    const priced = localized.tiers[index];
    if (!priced) return tier;
    return {
      ...tier,
      price: priced.price,
      ...(priced.worth ? { worth: priced.worth } : {}),
    };
  });

  return (
    <section id="pricing" className="noise relative overflow-hidden py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-1/4 -z-10 mx-auto h-[420px] max-w-3xl rounded-full bg-[radial-gradient(circle,oklch(0.93_0.09_75),transparent_70%)] opacity-70 blur-3xl" />

      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading
          eyebrow="Pricing"
          title="Fixed scope. Fixed price. Shipped."
          subtitle="No hourly billing games. Choose the outcome you need and we commit to the date."
        />

        <Reveal delay={0.08} className="mt-8 flex flex-col items-center gap-2">
          <div
            role="group"
            aria-label="Display currency"
            className="glass flex flex-wrap items-center justify-center gap-1 rounded-full p-1"
          >
            {CURRENCIES.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => select(code)}
                aria-pressed={currency === code}
                className={cn(
                  "rounded-full px-3 py-1.5 font-mono text-[11px] tracking-[0.12em] transition-colors",
                  currency === code
                    ? "bg-nv/15 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {code}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-muted-foreground">
            Prices shown in your local currency ({localized.label}).
          </p>
        </Reveal>

        <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
          {shown.map((tier, index) => (
            <PricingCard key={tier.name} tier={tier} delay={0.05 + index * 0.07} />
          ))}
        </div>

        <Reveal delay={0.2} className="mt-8 text-center">
          <p className="text-[13px] text-muted-foreground">
            Every plan includes source code ownership, documented architecture, project
            dashboard access, deployment, GitHub handover and a 30-day warranty.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

