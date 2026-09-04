import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSearch } from "@tanstack/react-router";
import { createBooking, verifyBookingPayment } from "@/lib/booking/booking.functions";
import { CURRENCIES, PRICING, type CurrencyCode } from "@/lib/currency";
import { useCurrency } from "@/lib/use-currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  CheckCircle2,
  Check,
  Flame,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Reveal } from "./primitives";
import { formatCurrencyAmount } from "@/lib/currency";
import {
  calculateAggregateProjectPricing,
  type SelectedServiceItem,
  type ServiceId,
} from "@/lib/pricing-services";

interface PackageTier {
  readonly value: "mvp" | "production_ready" | "enterprise";
  readonly label: string;
  readonly description: string;
  readonly meta: string;
  readonly featured?: boolean;
}

const packageTiers: readonly PackageTier[] = [
  {
    value: "mvp",
    label: "MVP Pack",
    description: "Validation · Investor demo · Early launch",
    meta: "Delivered in 3 Days · Essential Backend + Auth",
  },
  {
    value: "production_ready",
    label: "Production Ready",
    description: "Full product · Android + iOS + Backend",
    meta: "Delivered in 5–7 Days · Android + iOS + Payments",
    featured: true,
  },
  {
    value: "enterprise",
    label: "Enterprise Elite",
    description: "Managed AI engineering team",
    meta: "Dedicated Team · 24×7 Support · Architecture",
  },
] as const;

interface Region {
  readonly code: "IN" | "US" | "GB" | "DE" | "FR" | "AE" | "SG";
  readonly name: string;
  readonly currency: CurrencyCode;
}

const regions: readonly Region[] = [
  { code: "IN", name: "India", currency: "INR" },
  { code: "US", name: "United States", currency: "USD" },
  { code: "GB", name: "United Kingdom", currency: "GBP" },
  { code: "DE", name: "Germany", currency: "EUR" },
  { code: "FR", name: "France", currency: "EUR" },
  { code: "AE", name: "United Arab Emirates", currency: "AED" },
  { code: "SG", name: "Singapore", currency: "SGD" },
] as const;

const bookingFormSchema = z.object({
  package: z.enum(["mvp", "production_ready", "enterprise"]),
  region: z.enum(["IN", "US", "GB", "DE", "FR", "AE", "SG"]),
  currency: z.enum(["INR", "USD", "GBP", "EUR", "AED", "SGD"]),
  customer_name: z.string().trim().min(2, "Please enter your full name").max(100),
  customer_email: z.string().trim().email("Enter a valid email address").max(255),
  customer_phone: z.string().trim().max(32).optional(),
  company_name: z.string().trim().max(120).optional(),
  project_summary: z
    .string()
    .trim()
    .min(10, "Please provide a brief project summary (min 10 characters)")
    .max(2000),
  estimated_requirements: z.string().trim().max(2000).optional(),
  preferred_contact_method: z.string().trim().max(40).optional(),
  company_website: z.string().trim().max(300).optional().or(z.literal("")),
  existing_app_url: z.string().trim().max(300).optional().or(z.literal("")),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

function getPackageIndex(pkg: "mvp" | "production_ready" | "enterprise"): number {
  return pkg === "mvp" ? 0 : pkg === "production_ready" ? 1 : 2;
}

function calculateTokenBreakdown(fullPrice: string) {
  if (fullPrice === "Custom") {
    return {
      fullPrice: "Custom",
      tokenPrice: "Custom",
      balancePrice: "Custom",
      isCustom: true,
    };
  }

  const match = fullPrice.match(/([\d,]+)/);
  if (!match || !match[1]) {
    return {
      fullPrice,
      tokenPrice: fullPrice,
      balancePrice: fullPrice,
      isCustom: false,
    };
  }

  const num = parseInt(match[1].replace(/,/g, ""), 10);
  const token = Math.round(num * 0.15);
  const balance = num - token;
  const prefix = fullPrice.replace(match[1], "").trim();

  return {
    fullPrice,
    tokenPrice: prefix ? `${prefix} ${token.toLocaleString()}` : token.toLocaleString(),
    balancePrice: prefix ? `${prefix} ${balance.toLocaleString()}` : balance.toLocaleString(),
    isCustom: false,
  };
}

export function BookingForm({
  initialPackage: propPackage,
  initialServices: propServices,
}: {
  initialPackage?: "mvp" | "production_ready" | "enterprise";
  initialServices?: string;
} = {}) {
  let initialPkg = propPackage;
  let initialServicesParam = propServices;
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    if (!initialPkg) {
      const p = params.get("package");
      if (p === "mvp" || p === "production_ready" || p === "enterprise") {
        initialPkg = p;
      }
    }
    if (!initialServicesParam) {
      const s = params.get("services");
      if (s) initialServicesParam = s;
    }
  }
  const initialPackage = initialPkg ?? "production_ready";

  const { currency: detectedCurrency, select: selectCurrency } = useCurrency();
  const [step, setStep] = useState<"details" | "checkout" | "success">("details");
  const [selectedPackage, setSelectedPackage] = useState<PackageTier>(() => {
    return (packageTiers.find((p) => p.value === initialPackage) ?? packageTiers[1])!;
  });
  const [selectedRegion, setSelectedRegion] = useState<Region>(() => {
    return (regions.find((r) => r.currency === detectedCurrency) ?? regions[0])!;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referenceLinksText, setReferenceLinksText] = useState("");
  const [checkoutData, setCheckoutData] = useState<{
    bookingId: string;
    bookingNumber: string;
    razorpayOrderId: string;
    razorpayKeyId: string;
    amount: number;
    currency: string;
    booking: { package: string; tokenAmount: number; fullAmount: number; currency: string };
  } | null>(null);

  // Parse multi-service items
  const multiServices: SelectedServiceItem[] = useMemo(() => {
    if (!initialServicesParam) return [];
    return initialServicesParam
      .split(",")
      .map((pair) => {
        const [s, p] = pair.split(":");
        if (!s || !p) return null;
        return { serviceId: s as ServiceId, planId: p };
      })
      .filter((item): item is SelectedServiceItem => item !== null);
  }, [initialServicesParam]);

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      package: selectedPackage.value,
      region: selectedRegion.code,
      currency: selectedRegion.currency,
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      company_name: "",
      project_summary: "",
      estimated_requirements: "",
      preferred_contact_method: "email",
      company_website: "",
      existing_app_url: "",
    },
  });

  // Preload Razorpay checkout script on mount
  useEffect(() => {
    if (typeof window !== "undefined" && !(window as unknown as { Razorpay?: unknown }).Razorpay) {
      const existing = document.getElementById("razorpay-sdk-script");
      if (!existing) {
        const script = document.createElement("script");
        script.id = "razorpay-sdk-script";
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.head.appendChild(script);
      }
    }
  }, []);

  // Sync initial detected currency with region
  useEffect(() => {
    if (detectedCurrency) {
      const match = regions.find((r) => r.currency === detectedCurrency);
      if (match && form.getValues("currency") !== detectedCurrency) {
        setSelectedRegion(match);
        form.setValue("region", match.code);
        form.setValue("currency", detectedCurrency);
      }
    }
  }, [detectedCurrency, form]);

  // Sync package when prop changes
  useEffect(() => {
    if (propPackage) {
      const match = packageTiers.find((p) => p.value === propPackage);
      if (match) {
        setSelectedPackage(match);
        form.setValue("package", match.value);
      }
    }
  }, [propPackage, form]);

  const currentCurrency = (form.watch("currency") as CurrencyCode) || detectedCurrency || "USD";
  const localized = PRICING[currentCurrency] ?? PRICING.USD;

  const currentPackageValue = form.watch("package");
  const currentPackage: PackageTier = useMemo(() => {
    return packageTiers.find((p) => p.value === currentPackageValue) ?? packageTiers[1]!;
  }, [currentPackageValue]);

  const pricingBreakdown = useMemo(() => {
    const pkgIndex = getPackageIndex(currentPackage.value);
    const priced = localized.tiers[pkgIndex];
    const fullPrice = priced?.price ?? "$0";
    return calculateTokenBreakdown(fullPrice);
  }, [currentPackage.value, localized]);

  const multiAggregate = useMemo(() => {
    if (multiServices.length === 0) return null;
    return calculateAggregateProjectPricing(multiServices, currentCurrency);
  }, [multiServices, currentCurrency]);

  const handleSelectPackage = (tier: PackageTier) => {
    setSelectedPackage(tier);
    form.setValue("package", tier.value);
  };

  const handleRegionChange = (regionCode: Region["code"]) => {
    const r = regions.find((item) => item.code === regionCode);
    if (!r) return;
    setSelectedRegion(r);
    form.setValue("region", r.code);
    form.setValue("currency", r.currency);
    selectCurrency(r.currency);
  };

  const handleCurrencyChange = (currencyCode: CurrencyCode) => {
    form.setValue("currency", currencyCode);
    selectCurrency(currencyCode);
    const matchedRegion = regions.find((r) => r.currency === currencyCode);
    if (matchedRegion) {
      setSelectedRegion(matchedRegion);
      form.setValue("region", matchedRegion.code);
    }
  };

  const launchRazorpayModal = (
    data: {
      bookingId: string;
      bookingNumber: string;
      razorpayOrderId: string;
      razorpayKeyId: string;
      amount: number;
      currency: string;
      booking: { package: string; tokenAmount: number; fullAmount: number; currency: string };
    },
    formData: BookingFormData,
  ) => {
    const startCheckout = () => {
      const RazorpayConstructor = (
        window as unknown as {
          Razorpay: new (opts: Record<string, unknown>) => { open: () => void };
        }
      ).Razorpay;

      if (!RazorpayConstructor) {
        toast.error("Payment gateway could not be loaded. Please click 'Pay via Razorpay' below.");
        return;
      }

      const pkgLabel =
        packageTiers.find((p) => p.value === data.booking.package)?.label ?? selectedPackage.label;

      const options = {
        key: data.razorpayKeyId,
        amount: data.amount,
        currency: data.currency,
        name: "Athros",
        description: `${pkgLabel} — 15% Token Payment`,
        order_id: data.razorpayOrderId,
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await verifyBookingPayment({
              data: {
                bookingId: data.bookingId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              },
            });
            toast.success("Payment verified! Your project workspace is being prepared.");
            setStep("success");
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Payment verification failed. Contact support.",
            );
          }
        },
        prefill: {
          name: formData.customer_name,
          email: formData.customer_email,
          contact: formData.customer_phone ?? "",
        },
        theme: { color: "#76b900" },
        modal: {
          ondismiss: () => {
            toast.info("Payment window closed. You can retry when ready.");
          },
        },
      };

      const rzp = new RazorpayConstructor(options);
      rzp.open();
    };

    if (typeof window !== "undefined" && (window as unknown as { Razorpay?: unknown }).Razorpay) {
      startCheckout();
    } else {
      const existingScript = document.getElementById("razorpay-sdk-script");
      if (existingScript) {
        existingScript.addEventListener("load", startCheckout);
      } else {
        const script = document.createElement("script");
        script.id = "razorpay-sdk-script";
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = startCheckout;
        script.onerror = () => {
          toast.error("Failed to load payment gateway. Please refresh and try again.");
        };
        document.body.appendChild(script);
      }
    }
  };

  const onSubmit = async (data: BookingFormData) => {
    setIsSubmitting(true);
    try {
      const links = referenceLinksText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        package: data.package,
        region: data.region,
        currency: data.currency,
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone || undefined,
        company_name: data.company_name || undefined,
        project_summary: data.project_summary,
        estimated_requirements: data.estimated_requirements || undefined,
        preferred_contact_method: data.preferred_contact_method || undefined,
        company_website: data.company_website || undefined,
        existing_app_url: data.existing_app_url || undefined,
        reference_links: links,
        selected_services: multiServices.length > 0 ? multiServices : undefined,
      };

      const result = await createBooking({ data: payload });
      setCheckoutData(result);
      setStep("checkout");
      // Seamlessly open the payment gateway
      launchRazorpayModal(result, data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRazorpayPayment = () => {
    if (!checkoutData) return;
    launchRazorpayModal(checkoutData, form.getValues());
  };

  if (step === "details") {
    return (
      <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-3xl mx-auto space-y-8">
        {/* Section Header */}
        <Reveal>
          <div className="text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Let's build your app.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Select your package, share your brief, and secure your project slot with a 15% token.
            </p>
          </div>
        </Reveal>

        {/* Compact Package Selector Tabs */}
        <Reveal delay={0.05}>
          <div className="space-y-3">
            <Label className="text-xs font-mono tracking-wider uppercase text-muted-foreground">
              Select Package Tier
            </Label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {packageTiers.map((tier) => {
                const isSelected = currentPackage.value === tier.value;
                const pkgIndex = getPackageIndex(tier.value);
                const priced = localized.tiers[pkgIndex];
                return (
                  <button
                    key={tier.value}
                    type="button"
                    onClick={() => handleSelectPackage(tier)}
                    className={cn(
                      "relative flex flex-col items-start rounded-2xl border p-4 text-left transition-all duration-200",
                      isSelected
                        ? "border-nv bg-nv/10 shadow-[0_0_20px_rgba(118,185,0,0.15)] ring-1 ring-nv"
                        : "border-border bg-card/60 hover:border-nv/40 hover:bg-card/90",
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="font-medium text-sm text-foreground flex items-center gap-1.5">
                        {tier.label}
                        {tier.featured && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-fire/15 px-1.5 py-0.5 text-[9px] font-bold text-fire">
                            <Flame className="h-2.5 w-2.5" /> POPULAR
                          </span>
                        )}
                      </span>
                      {isSelected && (
                        <span className="grid h-4 w-4 place-items-center rounded-full bg-nv text-white">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                    <span className="font-display text-lg font-semibold text-foreground mt-1">
                      {priced?.price ?? "$0"}
                    </span>
                    <span className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                      {tier.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* Selected Package Summary Card */}
        <Reveal delay={0.08}>
          <div className="glass-card p-5 space-y-4 rounded-3xl border border-nv/20">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
              <div className="flex items-center gap-3">
                {currentPackage.featured ? (
                  <div className="grid h-10 w-10 place-items-center rounded-2xl fire-surface text-foreground shadow-sm">
                    <Flame className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-nv/15 text-nv shadow-sm font-bold">
                    {currentPackage.label.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-foreground text-base flex items-center gap-2">
                    {currentPackage.label}
                    {currentPackage.featured && (
                      <span className="rounded-full bg-fire/20 px-2 py-0.5 text-[10px] font-semibold text-fire">
                        Most Popular
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground">{currentPackage.meta}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Select
                  value={form.watch("region")}
                  onValueChange={(val) => handleRegionChange(val as Region["code"])}
                >
                  <SelectTrigger className="h-8 text-xs w-[130px]">
                    <SelectValue placeholder="Region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((r) => (
                      <SelectItem key={r.code} value={r.code}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={form.watch("currency")}
                  onValueChange={(val) => handleCurrencyChange(val as CurrencyCode)}
                >
                  <SelectTrigger className="h-8 text-xs w-[90px]">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Multi-Service Selection Display if applicable */}
            {multiAggregate && multiAggregate.items.length > 0 ? (
              <div className="rounded-2xl border border-nv/30 bg-nv/5 p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-nv" /> Selected Project Services (
                    {multiAggregate.items.length}):
                  </span>
                  <span className="text-[11.5px] font-mono text-muted-foreground">
                    Estimated Delivery: {multiAggregate.estimatedTimeline.totalDaysText}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {multiAggregate.items.map((item) => (
                    <span
                      key={`${item.serviceId}-${item.planId}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs text-foreground shadow-xs"
                    >
                      <span>{item.serviceIcon}</span>
                      <span className="font-semibold">{item.planName}</span>
                      <span className="text-muted-foreground">({item.priceFormatted})</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Authoritative Financial Breakdown */}
            {!pricingBreakdown.isCustom || (multiAggregate && !multiAggregate.hasCustomPlan) ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-1">
                <div className="rounded-2xl bg-secondary/50 p-3.5">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                    Total Project Value
                  </span>
                  <span className="font-display text-lg font-semibold text-foreground mt-0.5 block">
                    {multiAggregate
                      ? formatCurrencyAmount(multiAggregate.totalAmountCents, currentCurrency)
                      : pricingBreakdown.fullPrice}
                  </span>
                  <span className="text-[11px] text-muted-foreground">Fixed Scope & Price</span>
                </div>

                <div className="rounded-2xl bg-nv/10 border border-nv/30 p-3.5">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-nv font-semibold block">
                    Token to Start (15%)
                  </span>
                  <span className="font-display text-lg font-bold text-foreground mt-0.5 block">
                    {multiAggregate
                      ? formatCurrencyAmount(multiAggregate.tokenAmountCents, currentCurrency)
                      : pricingBreakdown.tokenPrice}
                  </span>
                  <span className="text-[11px] text-muted-foreground">Due now to secure slot</span>
                </div>

                <div className="rounded-2xl bg-secondary/50 p-3.5">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground block">
                    Remaining Balance (85%)
                  </span>
                  <span className="font-display text-lg font-semibold text-foreground mt-0.5 block">
                    {multiAggregate
                      ? formatCurrencyAmount(multiAggregate.balanceAmountCents, currentCurrency)
                      : pricingBreakdown.balancePrice}
                  </span>
                  <span className="text-[11px] text-muted-foreground">Due on milestones</span>
                </div>

                {multiAggregate?.hasRecurringPlan && multiAggregate.maintenanceMonthlyCents > 0 ? (
                  <div className="col-span-1 sm:col-span-3 rounded-2xl border border-border/60 bg-secondary/30 p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="font-semibold text-foreground">
                        Recurring Maintenance Retainer:
                      </span>
                      <span className="text-muted-foreground ml-1.5">
                        Billed monthly after deployment (strictly excluded from 15% project token)
                      </span>
                    </div>
                    <span className="font-mono font-bold text-foreground">
                      {formatCurrencyAmount(
                        multiAggregate.maintenanceMonthlyCents,
                        currentCurrency,
                      )}
                      /mo
                    </span>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl bg-secondary/50 p-4 text-center">
                <p className="font-medium text-foreground text-sm">
                  Enterprise Elite is tailored for full engineering team operations.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Submit your brief below to talk directly with our technical architect team.
                </p>
              </div>
            )}
          </div>
        </Reveal>

        {/* Project Details Form */}
        <Reveal delay={0.12}>
          <div className="glass-card p-6 sm:p-8 space-y-6 rounded-3xl">
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">
                Project Details
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tell us about your project. We'll set up your private dashboard workspace.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="customer_name">Full Name *</Label>
                <Input
                  id="customer_name"
                  placeholder="Steve Jobs"
                  {...form.register("customer_name")}
                  aria-invalid={!!form.formState.errors.customer_name}
                />
                {form.formState.errors.customer_name && (
                  <p className="text-xs text-destructive" role="alert">
                    {form.formState.errors.customer_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="customer_email">Work Email *</Label>
                <Input
                  id="customer_email"
                  type="email"
                  placeholder="steve@apple.com"
                  {...form.register("customer_email")}
                  aria-invalid={!!form.formState.errors.customer_email}
                />
                {form.formState.errors.customer_email && (
                  <p className="text-xs text-destructive" role="alert">
                    {form.formState.errors.customer_email.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="customer_phone">Phone / WhatsApp</Label>
                <Input
                  id="customer_phone"
                  placeholder="+91 98765 43210"
                  {...form.register("customer_phone")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="company_name">Company / Startup Name</Label>
                <Input
                  id="company_name"
                  placeholder="Acme Technologies"
                  {...form.register("company_name")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="project_summary">Project Summary & Core Idea *</Label>
              <Textarea
                id="project_summary"
                placeholder="Describe your vision, target audience, primary workflows, and key features..."
                rows={4}
                {...form.register("project_summary")}
                aria-invalid={!!form.formState.errors.project_summary}
              />
              {form.formState.errors.project_summary && (
                <p className="text-xs text-destructive" role="alert">
                  {form.formState.errors.project_summary.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="estimated_requirements">
                Key Requirements & Deliverables (Optional)
              </Label>
              <Textarea
                id="estimated_requirements"
                placeholder="e.g., Supabase Auth, Razorpay/Stripe, Push Notifications, Admin Portal, Offline Mode, Android + iOS..."
                rows={3}
                {...form.register("estimated_requirements")}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="preferred_contact_method">Preferred Contact Channel</Label>
                <Select
                  value={form.watch("preferred_contact_method")}
                  onValueChange={(v) => form.setValue("preferred_contact_method", v)}
                >
                  <SelectTrigger id="preferred_contact_method">
                    <SelectValue placeholder="Select contact method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="phone">Phone Call</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="company_website">Company Website / Pitch Deck</Label>
                <Input
                  id="company_website"
                  placeholder="https://mycompany.com"
                  {...form.register("company_website")}
                />
                {form.formState.errors.company_website && (
                  <p className="text-xs text-destructive" role="alert">
                    {form.formState.errors.company_website.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="existing_app_url">Figma / Existing App URL (Optional)</Label>
                <Input
                  id="existing_app_url"
                  placeholder="https://figma.com/file/..."
                  {...form.register("existing_app_url")}
                />
                {form.formState.errors.existing_app_url && (
                  <p className="text-xs text-destructive" role="alert">
                    {form.formState.errors.existing_app_url.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reference_links">Reference Apps / Competitor Links</Label>
                <Input
                  id="reference_links"
                  placeholder="https://airbnb.com, https://uber.com"
                  value={referenceLinksText}
                  onChange={(e) => setReferenceLinksText(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            {/* Terms guarantee */}
            <div className="flex items-start gap-3 rounded-2xl bg-secondary/40 p-4 text-xs text-muted-foreground">
              <ShieldCheck className="h-5 w-5 shrink-0 text-nv mt-0.5" />
              <div>
                <span className="font-semibold text-foreground block">
                  Athros Production Commitment
                </span>
                Fixed scope, guaranteed delivery date, 100% source code ownership on GitHub, full
                Supabase backend handover, and 30-day post-launch warranty.
              </div>
            </div>

            {/* Action Button */}
            {pricingBreakdown.isCustom ? (
              <Button
                type="submit"
                className="w-full bg-gradient-nv text-[oklch(0.18_0.03_130)] h-12 text-base font-semibold shadow-[0_4px_20px_-4px_var(--nv)] hover:shadow-[0_8px_30px_-4px_var(--nv)]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting brief...
                  </>
                ) : (
                  <>
                    Connect with Enterprise Team
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="submit"
                className="w-full bg-gradient-nv text-[oklch(0.18_0.03_130)] h-12 text-base font-semibold shadow-[0_4px_20px_-4px_var(--nv)] hover:shadow-[0_8px_30px_-4px_var(--nv)]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating booking...
                  </>
                ) : (
                  <>
                    Proceed to Pay 15% Token (
                    {multiAggregate
                      ? formatCurrencyAmount(multiAggregate.tokenAmountCents, currentCurrency)
                      : pricingBreakdown.tokenPrice}
                    )
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </Reveal>
      </form>
    );
  }

  if (step === "checkout" && checkoutData) {
    return (
      <div className="max-w-lg mx-auto">
        <Reveal>
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-nv/15 text-nv shadow-sm">
              <CheckCircle2 className="h-8 w-8 text-nv" />
            </div>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              Booking Reserved!
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Booking Reference:{" "}
              <strong className="font-mono text-foreground">{checkoutData.bookingNumber}</strong>
            </p>
          </div>

          <div className="glass-card p-6 sm:p-8 space-y-6 rounded-3xl border border-nv/20">
            <div>
              <h3 className="font-semibold text-lg text-foreground">Secure Token Payment</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete the 15% token payment via Razorpay to lock in your engineering slot.
              </p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Package</span>
                <span className="font-medium text-foreground">
                  {packageTiers.find((p) => p.value === checkoutData.booking.package)?.label ??
                    selectedPackage.label}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Project Value</span>
                <span className="font-mono font-medium text-foreground">
                  {checkoutData.currency} {checkoutData.booking.fullAmount.toLocaleString()}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between items-center text-base">
                <span className="font-medium text-foreground">15% Token Due Now</span>
                <span className="font-mono font-bold text-nv text-lg">
                  {checkoutData.currency} {checkoutData.booking.tokenAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <Button
              className="w-full bg-gradient-nv text-[oklch(0.18_0.03_130)] h-12 text-base font-semibold shadow-[0_4px_20px_-4px_var(--nv)] hover:shadow-[0_8px_30px_-4px_var(--nv)]"
              onClick={handleRazorpayPayment}
            >
              Pay {checkoutData.currency} {checkoutData.booking.tokenAmount.toLocaleString()} via
              Razorpay
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Encrypted 256-bit payment gateway powered by Razorpay. All major Cards, UPI,
              Netbanking & International Cards supported.
            </p>
          </div>
        </Reveal>
      </div>
    );
  }

  if (step === "success") {
    return (
      <Reveal>
        <div className="max-w-lg mx-auto text-center space-y-6">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-nv/15 text-nv shadow-md">
            <CheckCircle2 className="h-10 w-10 text-nv" />
          </div>
          <div>
            <h2 className="font-display text-3xl font-semibold text-foreground">
              Payment Confirmed!
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your 15% token payment has been verified. Your dedicated project workspace and
              engineering team assignment are underway.
            </p>
          </div>
          <div className="glass-card p-6 text-left rounded-3xl space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="rounded-full bg-nv/15 px-2.5 py-0.5 text-xs font-semibold text-nv">
                Token Paid & Confirmed
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Booking Number</span>
              <span className="font-mono font-medium text-foreground">
                {checkoutData?.bookingNumber}
              </span>
            </div>
          </div>
          <Button
            className="w-full bg-gradient-nv text-[oklch(0.18_0.03_130)] h-12 font-semibold"
            asChild
          >
            <a href="/dashboard">Access Client Command Center</a>
          </Button>
        </div>
      </Reveal>
    );
  }

  return null;
}
