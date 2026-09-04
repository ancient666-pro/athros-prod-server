import { useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PricingCard, type PricingTier } from "./PricingCard";
import { Reveal, SectionHeading, MagneticButton } from "./primitives";
import { CURRENCIES, type CurrencyCode, formatCurrencyAmount } from "@/lib/currency";
import { useCurrency } from "@/lib/use-currency";
import {
  SERVICES,
  SERVICE_PLANS,
  type ServiceId,
  type SelectedServiceItem,
  calculateAggregateProjectPricing,
} from "@/lib/pricing-services";
import { cn } from "@/lib/utils";
import { ArrowRight, Check, Sparkles, X, Clock } from "lucide-react";

export function Pricing() {
  const navigate = useNavigate();
  const { currency, select } = useCurrency();
  const [activeService, setActiveService] = useState<ServiceId>("app");
  const [cart, setCart] = useState<Partial<Record<ServiceId, string>>>({
    app: "production_ready",
  });

  // Convert cart map to item list for authoritative calculations
  const cartItems: SelectedServiceItem[] = useMemo(() => {
    return Object.entries(cart).map(([serviceId, planId]) => ({
      serviceId: serviceId as ServiceId,
      planId,
    }));
  }, [cart]);

  // Server-safe aggregate calculations (15% token, 85% balance, integer minor units)
  const aggregate = useMemo(() => {
    return calculateAggregateProjectPricing(cartItems, currency);
  }, [cartItems, currency]);

  // Plans for the currently active service tab
  const activePlans = SERVICE_PLANS[activeService] || SERVICE_PLANS.app;

  // Toggle plan in cart
  const handleTogglePlan = (serviceId: ServiceId, planId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      if (next[serviceId] === planId) {
        // If clicking already selected, and user has multiple services, allow removing
        if (Object.keys(next).length > 1) {
          delete next[serviceId];
        }
      } else {
        next[serviceId] = planId;
      }
      return next;
    });
  };

  const handleRemoveService = (serviceId: ServiceId) => {
    setCart((prev) => {
      if (Object.keys(prev).length <= 1) return prev; // keep at least 1
      const next = { ...prev };
      delete next[serviceId];
      return next;
    });
  };

  // Convert service plans to PricingTier format
  const activeTiers: PricingTier[] = activePlans.map((plan) => {
    const pricing = plan.pricing[currency] ?? plan.pricing.USD;
    return {
      name: plan.name,
      price: pricing.price,
      worth: pricing.worth,
      meta: plan.meta,
      blurb: plan.blurb,
      cta: plan.cta,
      features: plan.features,
      featured: plan.featured,
      deliveryDuration: plan.deliveryDuration,
      commercialStatus: plan.commercialStatus,
      commercialNote: plan.commercialNote,
      serviceId: plan.serviceId,
      planId: plan.id,
    };
  });

  const handleProceedToBooking = () => {
    // Primary app package or first item
    const appPlan = cart.app || "production_ready";
    const packageParam =
      appPlan === "mvp" || appPlan === "production_ready" || appPlan === "enterprise"
        ? appPlan
        : "production_ready";

    // Encode selected services
    const servicesParam = Object.entries(cart)
      .map(([s, p]) => `${s}:${p}`)
      .join(",");

    navigate({
      to: "/booking",
      search: {
        package: packageParam,
        services: servicesParam,
      },
    });
  };

  return (
    <section id="pricing" className="noise relative overflow-hidden py-24 sm:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-1/4 -z-10 mx-auto h-[420px] max-w-3xl rounded-full bg-[radial-gradient(circle,oklch(0.93_0.09_75),transparent_70%)] opacity-70 blur-3xl" />

      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading
          eyebrow="Pricing"
          title="Fixed scope. Fixed price. Shipped."
          subtitle="No hourly billing games. Choose the outcome you need and we commit to the date."
        />

        {/* CHANGE 2: Compact Service Selector directly ABOVE Currency Switch */}
        <div className="mt-10 flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-2">
            <span className="font-mono text-[11px] font-medium tracking-[0.18em] uppercase text-muted-foreground">
              What do you need?
            </span>
            <div
              role="tablist"
              aria-label="Select service to view packages"
              className="glass flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-2xl p-1.5 shadow-sm sm:rounded-full"
            >
              {SERVICES.map((service) => {
                const isCurrent = activeService === service.id;
                const isSelectedInCart = Boolean(cart[service.id]);
                return (
                  <button
                    key={service.id}
                    type="button"
                    role="tab"
                    aria-selected={isCurrent}
                    onClick={() => setActiveService(service.id)}
                    className={cn(
                      "group relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-all duration-200",
                      isCurrent
                        ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                    )}
                  >
                    <span className="text-sm">{service.icon}</span>
                    <span>{service.label}</span>
                    {isSelectedInCart ? (
                      <span
                        className={cn(
                          "flex h-2 w-2 rounded-full",
                          isCurrent ? "bg-nv" : "bg-nv/80",
                        )}
                        title="Included in project"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Currency Switch preserved below service selector */}
          <Reveal delay={0.06} className="flex flex-col items-center gap-1.5">
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
                    "rounded-full px-3 py-1 font-mono text-[11px] tracking-[0.12em] transition-colors",
                    currency === code
                      ? "bg-nv/15 text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {code}
                </button>
              ))}
            </div>
            <p className="text-[11.5px] text-muted-foreground">
              Prices shown in your local currency ({currency}).
            </p>
          </Reveal>
        </div>

        {/* Pricing Cards for Active Service */}
        <div className="mt-10 grid items-stretch gap-6 lg:grid-cols-3">
          {activeTiers.map((tier, index) => {
            const isSelected = cart[activeService] === tier.planId;
            return (
              <PricingCard
                key={`${activeService}-${tier.name}`}
                tier={tier}
                delay={0.04 + index * 0.06}
                isSelectedInCart={isSelected}
                onToggleCart={() => tier.planId && handleTogglePlan(activeService, tier.planId)}
              />
            );
          })}
        </div>

        {/* CHANGE 2B, 2C, 2D, 2E, 2F: Compact Summary & Multi-Service Project Cart Panel */}
        <Reveal delay={0.15} className="mt-12">
          <div className="relative overflow-hidden rounded-[2rem] border border-border/80 bg-card/75 p-6 shadow-xl backdrop-blur-xl sm:p-8">
            <div className="pointer-events-none absolute -top-24 right-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,var(--nv-soft),transparent_70%)] opacity-50 blur-2xl" />

            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              {/* Left Column: Selected Services & Timeline */}
              <div className="max-w-xl space-y-3.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-nv/20 text-nv">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <h4 className="font-display text-base font-semibold text-foreground">
                    Your Project Configuration
                  </h4>
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                    {aggregate.items.length} {aggregate.items.length === 1 ? "service" : "services"}
                  </span>
                </div>

                {/* Selected Service Badges */}
                <div className="flex flex-wrap gap-2">
                  {aggregate.items.map((item) => (
                    <span
                      key={`${item.serviceId}-${item.planId}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm"
                    >
                      <span>{item.serviceIcon}</span>
                      <span className="font-semibold">{item.planName}</span>
                      <span className="text-muted-foreground">({item.priceFormatted})</span>
                      {aggregate.items.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveService(item.serviceId)}
                          aria-label={`Remove ${item.planName}`}
                          className="ml-1 text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      ) : null}
                    </span>
                  ))}
                </div>

                {/* Multi-service Delivery Timeline (Change 3) */}
                <div className="flex items-start gap-2 rounded-xl bg-secondary/50 p-2.5 text-xs text-muted-foreground">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-nv" />
                  <div>
                    <span className="font-medium text-foreground">
                      Estimated Delivery: {aggregate.estimatedTimeline.totalDaysText}
                    </span>
                    {aggregate.estimatedTimeline.additionalDaysText ? (
                      <span className="ml-1 text-[11.5px]">
                        ({aggregate.estimatedTimeline.baseDaysText} base{" "}
                        {aggregate.estimatedTimeline.additionalDaysText} for additional services)
                      </span>
                    ) : null}
                    <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                      Timeline dynamically extends as scope is added so all components undergo full
                      QA & compliance.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Pricing Breakdown (15% Token & 85% Balance) */}
              <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/60 p-5 sm:min-w-[280px]">
                <div className="flex items-baseline justify-between gap-4 text-xs">
                  <span className="text-muted-foreground">One-Time Project Total:</span>
                  <span className="font-mono text-sm font-semibold text-foreground">
                    {aggregate.hasCustomPlan && aggregate.oneTimeTotalAmountCents === 0
                      ? "Custom Quote"
                      : aggregate.hasCustomPlan
                        ? `From ${formatCurrencyAmount(aggregate.oneTimeTotalAmountCents, currency)} + Custom`
                        : formatCurrencyAmount(aggregate.oneTimeTotalAmountCents, currency)}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-4 border-t border-border/50 pt-2 text-xs">
                  <span className="font-medium text-nv">Booking Token (15%):</span>
                  <span className="font-mono text-base font-bold text-nv">
                    {aggregate.oneTimeTotalAmountCents > 0
                      ? formatCurrencyAmount(aggregate.tokenAmountCents, currency)
                      : "Quote Required"}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-4 text-[11px] text-muted-foreground">
                  <span>Remaining Balance (85%):</span>
                  <span className="font-mono">
                    {aggregate.oneTimeTotalAmountCents > 0
                      ? formatCurrencyAmount(aggregate.balanceAmountCents, currency)
                      : "Milestone-based"}
                  </span>
                </div>

                {aggregate.hasRecurringPlan && aggregate.maintenanceMonthlyCents > 0 ? (
                  <div className="flex items-baseline justify-between gap-4 border-t border-border/50 pt-2 text-xs">
                    <div>
                      <span className="font-medium text-foreground block">
                        Recurring Maintenance:
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Billed separately / month
                      </span>
                    </div>
                    <span className="font-mono font-semibold text-foreground">
                      {formatCurrencyAmount(aggregate.maintenanceMonthlyCents, currency)}/mo
                    </span>
                  </div>
                ) : null}

                <MagneticButton
                  onClick={handleProceedToBooking}
                  className="mt-2 w-full bg-gradient-nv text-[oklch(0.18_0.03_130)] shadow-sm"
                >
                  Book Project (15% Token)
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </MagneticButton>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.2} className="mt-8 text-center">
          <p className="text-[13px] text-muted-foreground">
            Every plan includes source code ownership, documented architecture, project dashboard
            access, deployment, GitHub handover and a 30-day warranty.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
