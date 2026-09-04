/**
 * Multi-service pricing matrix and cart calculation engine.
 * Supports:
 * - App Development
 * - Web Development
 * - QA & UAT
 * - Beta Testing / Store Release
 * - Maintenance & Support (Recurring - Monthly)
 *
 * All monetary amounts are authoritatively computed in integer minor units (paise/cents).
 * Token is strictly 15% of the aggregate ONE-TIME selected project services.
 * Recurring maintenance is strictly excluded from token & deposit calculations.
 */
import { type CurrencyCode, formatCurrencyAmount } from "./currency";

export const SERVICES = [
  {
    id: "app",
    label: "App Development",
    shortLabel: "App",
    icon: "📱",
    description: "Native iOS, Android & full-stack mobile systems",
  },
  {
    id: "web",
    label: "Web Development",
    shortLabel: "Web",
    icon: "🌐",
    description: "High-performance web apps, dashboards & client portals",
  },
  {
    id: "qa_uat",
    label: "QA & UAT",
    shortLabel: "QA & UAT",
    icon: "🧪",
    description: "Comprehensive automated regression, security & UAT sign-off",
  },
  {
    id: "beta_release",
    label: "Beta Testing / Store Release",
    shortLabel: "Beta & Release",
    icon: "🚀",
    description: "App Store & Play Store compliance, testflight & rollout",
  },
  {
    id: "maintenance",
    label: "Maintenance & Support",
    shortLabel: "Maintenance",
    icon: "🛠",
    description: "Continuous health, dependency patching, bug fixes & SLA retainer",
  },
] as const;

export type ServiceId = (typeof SERVICES)[number]["id"];

export interface ServicePlanPricing {
  price: string;
  worth?: string;
  amountCents: number;
  isCustom?: boolean;
}

export interface ServicePlan {
  id: string;
  serviceId: ServiceId;
  name: string;
  blurb?: string;
  meta: string;
  deliveryDuration: string;
  minDays: number;
  maxDays: number;
  isAdditionalDuration?: boolean;
  isRecurring?: boolean;
  allocationHours?: string;
  featured?: boolean;
  cta: string;
  features: string[];
  pricing: Record<CurrencyCode, ServicePlanPricing>;
  commercialStatus: "authoritative" | "scope_baseline" | "custom_quote";
  commercialNote?: string;
}

export const SERVICE_PLANS: Record<ServiceId, ServicePlan[]> = {
  app: [
    {
      id: "mvp",
      serviceId: "app",
      name: "MVP Pack",
      meta: "Validation · Investor demo · Hackathons · Early launch",
      deliveryDuration: "Delivery in 3 Days",
      minDays: 3,
      maxDays: 3,
      isAdditionalDuration: false,
      cta: "Launch MVP",
      features: [
        "Native Android",
        "Essential Backend",
        "Authentication",
        "Core Features",
        "Firebase & Supabase",
        "Basic Analytics",
        "Play Store Ready",
        "Delivery in 3 Days",
      ],
      commercialStatus: "authoritative",
      pricing: {
        INR: { price: "₹69,999", worth: "₹1,20,000", amountCents: 6999900 },
        USD: { price: "$1,499", worth: "$2,600", amountCents: 149900 },
        GBP: { price: "£1,299", worth: "£2,200", amountCents: 129900 },
        EUR: { price: "€1,499", worth: "€2,600", amountCents: 149900 },
        AED: { price: "AED 5,499", worth: "AED 9,400", amountCents: 549900 },
        SGD: { price: "SGD 1,999", worth: "SGD 3,400", amountCents: 199900 },
      },
    },
    {
      id: "production_ready",
      serviceId: "app",
      name: "Production Ready",
      blurb: "Full native product with backend + store deployments",
      meta: "Delivered in 5–7 days · Android + iOS + backend",
      deliveryDuration: "Delivered in 5–7 Days",
      minDays: 5,
      maxDays: 7,
      isAdditionalDuration: false,
      featured: true,
      cta: "Build My Startup",
      features: [
        "Everything in MVP",
        "Native Android & iOS",
        "Production Architecture",
        "Payments & Webhooks",
        "Push Notifications & Sentry",
        "CI/CD Pipeline",
        "Play Store & App Store Deployment",
        "Testing & Security Hardening",
        "90 Days Warranty Support",
      ],
      commercialStatus: "authoritative",
      pricing: {
        INR: { price: "₹1,99,999", worth: "₹3,40,000", amountCents: 19999900 },
        USD: { price: "$4,999", worth: "$8,500", amountCents: 499900 },
        GBP: { price: "£4,299", worth: "£7,300", amountCents: 429900 },
        EUR: { price: "€4,999", worth: "€8,500", amountCents: 499900 },
        AED: { price: "AED 17,999", worth: "AED 30,600", amountCents: 1799900 },
        SGD: { price: "SGD 6,499", worth: "SGD 11,000", amountCents: 649900 },
      },
    },
    {
      id: "enterprise",
      serviceId: "app",
      name: "Enterprise Elite",
      blurb: "Plug-and-play managed AI engineering team",
      meta: "Dedicated continuous delivery squad for high-scale platforms.",
      deliveryDuration: "Dedicated Continuous Delivery",
      minDays: 14,
      maxDays: 30,
      isAdditionalDuration: false,
      cta: "Book Enterprise Elite",
      features: [
        "Unlimited Modules & Integrations",
        "Dedicated Team & Technical Architect",
        "Security Audits & Multi-tenant RLS",
        "Kubernetes Infrastructure Management",
        "24×7 SLA Support",
      ],
      commercialStatus: "authoritative",
      pricing: {
        INR: { price: "₹3,99,999", worth: "₹6,80,000", amountCents: 39999900 },
        USD: { price: "$9,999", worth: "$17,000", amountCents: 999900 },
        GBP: { price: "£8,599", worth: "£14,500", amountCents: 859900 },
        EUR: { price: "€9,999", worth: "€17,000", amountCents: 999900 },
        AED: { price: "AED 35,999", worth: "AED 61,000", amountCents: 3599900 },
        SGD: { price: "SGD 12,999", worth: "SGD 22,000", amountCents: 1299900 },
      },
    },
  ],

  web: [
    {
      id: "launch",
      serviceId: "web",
      name: "Launch",
      blurb: "High-conversion web presence or lightweight web app",
      meta: "Production-ready web launch for startups and products",
      deliveryDuration: "Additional 3–4 Days",
      minDays: 3,
      maxDays: 4,
      isAdditionalDuration: true,
      cta: "Add Launch Web",
      features: [
        "SSR / Static Web Architecture",
        "SEO Optimization & Metadata",
        "Modern Responsive Layouts",
        "Analytics & Form Integration",
        "Custom Domain & Cloudflare Setup",
      ],
      commercialStatus: "authoritative",
      pricing: {
        INR: { price: "₹29,999", amountCents: 2999900 },
        USD: { price: "Quote Required", amountCents: 0, isCustom: true },
        GBP: { price: "Quote Required", amountCents: 0, isCustom: true },
        EUR: { price: "Quote Required", amountCents: 0, isCustom: true },
        AED: { price: "Quote Required", amountCents: 0, isCustom: true },
        SGD: { price: "Quote Required", amountCents: 0, isCustom: true },
      },
    },
    {
      id: "business",
      serviceId: "web",
      name: "Business",
      blurb: "Client dashboard, portal, and full web application",
      meta: "Full-featured web application with authentication and dashboards",
      deliveryDuration: "Additional 5–7 Days",
      minDays: 5,
      maxDays: 7,
      isAdditionalDuration: true,
      featured: true,
      cta: "Add Business Web",
      features: [
        "Full Client Portal & Dashboard",
        "Shared Auth with Mobile App",
        "Server-rendered APIs & Database Sync",
        "Admin Management Views",
        "Payment Gateway & Webhook Sync",
        "Role-Based Access Control",
      ],
      commercialStatus: "authoritative",
      pricing: {
        INR: { price: "₹59,999", amountCents: 5999900 },
        USD: { price: "Quote Required", amountCents: 0, isCustom: true },
        GBP: { price: "Quote Required", amountCents: 0, isCustom: true },
        EUR: { price: "Quote Required", amountCents: 0, isCustom: true },
        AED: { price: "Quote Required", amountCents: 0, isCustom: true },
        SGD: { price: "Quote Required", amountCents: 0, isCustom: true },
      },
    },
    {
      id: "production",
      serviceId: "web",
      name: "Production",
      blurb: "Complex full-stack web platform with cloud scalability",
      meta: "Enterprise-grade web platform with high performance and security",
      deliveryDuration: "Additional 7–10 Days",
      minDays: 7,
      maxDays: 10,
      isAdditionalDuration: true,
      cta: "Add Production Web",
      features: [
        "Multi-tenant Enterprise Architecture",
        "Advanced State & Realtime Sync",
        "Security Audits & Hardening",
        "Automated CI/CD & Cloud Infrastructure",
        "Priority Post-Launch Support",
      ],
      commercialStatus: "authoritative",
      pricing: {
        INR: { price: "₹99,999", amountCents: 9999900 },
        USD: { price: "Quote Required", amountCents: 0, isCustom: true },
        GBP: { price: "Quote Required", amountCents: 0, isCustom: true },
        EUR: { price: "Quote Required", amountCents: 0, isCustom: true },
        AED: { price: "Quote Required", amountCents: 0, isCustom: true },
        SGD: { price: "Quote Required", amountCents: 0, isCustom: true },
      },
    },
  ],

  qa_uat: [
    {
      id: "functional_qa",
      serviceId: "qa_uat",
      name: "Functional QA",
      meta: "Structured cross-device manual testing and core flow verification",
      deliveryDuration: "Additional 1–2 Days",
      minDays: 1,
      maxDays: 2,
      isAdditionalDuration: true,
      cta: "Add Functional QA",
      features: [
        "Cross-device iOS & Android matrix",
        "Edge-case & boundary testing",
        "Detailed bug reports & repro steps",
        "Crash analysis & fix sign-off",
      ],
      commercialStatus: "authoritative",
      pricing: {
        INR: { price: "₹9,999", amountCents: 999900 },
        USD: { price: "Quote Required", amountCents: 0, isCustom: true },
        GBP: { price: "Quote Required", amountCents: 0, isCustom: true },
        EUR: { price: "Quote Required", amountCents: 0, isCustom: true },
        AED: { price: "Quote Required", amountCents: 0, isCustom: true },
        SGD: { price: "Quote Required", amountCents: 0, isCustom: true },
      },
    },
    {
      id: "full_qa",
      serviceId: "qa_uat",
      name: "Full QA",
      blurb: "Comprehensive automated test suites & regression testing",
      meta: "Automated test suites, security verification, and performance audit",
      deliveryDuration: "Additional 2–3 Days",
      minDays: 2,
      maxDays: 3,
      isAdditionalDuration: true,
      cta: "Add Full QA",
      features: [
        "Everything in Functional QA",
        "Automated Regression Test Suites",
        "API Load & Stress Testing",
        "Security Vulnerability Scan",
      ],
      commercialStatus: "authoritative",
      pricing: {
        INR: { price: "₹19,999", amountCents: 1999900 },
        USD: { price: "Quote Required", amountCents: 0, isCustom: true },
        GBP: { price: "Quote Required", amountCents: 0, isCustom: true },
        EUR: { price: "Quote Required", amountCents: 0, isCustom: true },
        AED: { price: "Quote Required", amountCents: 0, isCustom: true },
        SGD: { price: "Quote Required", amountCents: 0, isCustom: true },
      },
    },
    {
      id: "qa_uat",
      serviceId: "qa_uat",
      name: "QA + UAT",
      blurb: "Complete regression + user acceptance testing sign-off certification",
      meta: "End-to-end QA with client UAT protocols & launch readiness audit",
      deliveryDuration: "Additional 3–4 Days",
      minDays: 3,
      maxDays: 4,
      isAdditionalDuration: true,
      featured: true,
      cta: "Add QA + UAT",
      features: [
        "Everything in Full QA",
        "User Acceptance Testing (UAT) Sign-off",
        "Stakeholder Demo & Approval Run",
        "Final Release Certification Report",
        "Compliance Checklist Verification",
      ],
      commercialStatus: "authoritative",
      pricing: {
        INR: { price: "₹29,999", amountCents: 2999900 },
        USD: { price: "Quote Required", amountCents: 0, isCustom: true },
        GBP: { price: "Quote Required", amountCents: 0, isCustom: true },
        EUR: { price: "Quote Required", amountCents: 0, isCustom: true },
        AED: { price: "Quote Required", amountCents: 0, isCustom: true },
        SGD: { price: "Quote Required", amountCents: 0, isCustom: true },
      },
    },
  ],

  beta_release: [
    {
      id: "beta_testing",
      serviceId: "beta_release",
      name: "Beta Testing",
      meta: "TestFlight & Google Play Internal tracks with user feedback capture",
      deliveryDuration: "Additional 2–3 Days",
      minDays: 2,
      maxDays: 3,
      isAdditionalDuration: true,
      cta: "Add Beta Testing",
      features: [
        "TestFlight & Internal Testing Track Setup",
        "Invited Tester Onboarding Workflow",
        "In-app Feedback & Crash Telemetry",
        "Beta Cohort Health Digest",
      ],
      commercialStatus: "authoritative",
      pricing: {
        INR: { price: "₹7,999", amountCents: 799900 },
        USD: { price: "Quote Required", amountCents: 0, isCustom: true },
        GBP: { price: "Quote Required", amountCents: 0, isCustom: true },
        EUR: { price: "Quote Required", amountCents: 0, isCustom: true },
        AED: { price: "Quote Required", amountCents: 0, isCustom: true },
        SGD: { price: "Quote Required", amountCents: 0, isCustom: true },
      },
    },
    {
      id: "store_launch",
      serviceId: "beta_release",
      name: "Store Launch",
      meta: "Google Play Store & Apple App Store submission and review approval",
      deliveryDuration: "Additional 2–3 Days",
      minDays: 2,
      maxDays: 3,
      isAdditionalDuration: true,
      cta: "Add Store Launch",
      features: [
        "Play Console & App Store Connect Setup",
        "App Store Guidelines & Privacy Review",
        "Screenshot & Asset Compliance",
        "Direct Handling of App Review Responses",
      ],
      commercialStatus: "authoritative",
      pricing: {
        INR: { price: "₹12,999", amountCents: 1299900 },
        USD: { price: "Quote Required", amountCents: 0, isCustom: true },
        GBP: { price: "Quote Required", amountCents: 0, isCustom: true },
        EUR: { price: "Quote Required", amountCents: 0, isCustom: true },
        AED: { price: "Quote Required", amountCents: 0, isCustom: true },
        SGD: { price: "Quote Required", amountCents: 0, isCustom: true },
      },
    },
    {
      id: "beta_store_launch",
      serviceId: "beta_release",
      name: "Beta + Store Launch",
      blurb: "End-to-end beta cohort management and public store launch",
      meta: "Complete launch package: beta validation through store approval",
      deliveryDuration: "Additional 3–5 Days",
      minDays: 3,
      maxDays: 5,
      isAdditionalDuration: true,
      featured: true,
      cta: "Add Beta + Store Launch",
      features: [
        "Everything in Beta Testing",
        "Everything in Store Launch",
        "Multi-platform Release Staging",
        "Launch Day Monitoring & Fast-track Support",
      ],
      commercialStatus: "authoritative",
      pricing: {
        INR: { price: "₹17,999", amountCents: 1799900 },
        USD: { price: "Quote Required", amountCents: 0, isCustom: true },
        GBP: { price: "Quote Required", amountCents: 0, isCustom: true },
        EUR: { price: "Quote Required", amountCents: 0, isCustom: true },
        AED: { price: "Quote Required", amountCents: 0, isCustom: true },
        SGD: { price: "Quote Required", amountCents: 0, isCustom: true },
      },
    },
  ],

  maintenance: [
    {
      id: "essential",
      serviceId: "maintenance",
      name: "Essential",
      meta: "Basic maintenance, bug fixes, updates & monitoring (2–3 hrs/month)",
      deliveryDuration: "Monthly Recurring Retainer",
      minDays: 0,
      maxDays: 0,
      isAdditionalDuration: true,
      isRecurring: true,
      allocationHours: "2–3 hrs/mo",
      cta: "Select Essential",
      features: [
        "Basic Maintenance & Bug Fixes",
        "Dependency & Security Updates",
        "Basic Uptime & Performance Monitoring",
        "Database Backups",
        "Store Updates & Compatibility",
        "Email Support SLA",
        "Engineering Allocation: ~2–3 hrs/month",
      ],
      commercialStatus: "authoritative",
      pricing: {
        INR: { price: "₹5,999/mo", amountCents: 599900 },
        USD: { price: "Quote Required", amountCents: 0, isCustom: true },
        GBP: { price: "Quote Required", amountCents: 0, isCustom: true },
        EUR: { price: "Quote Required", amountCents: 0, isCustom: true },
        AED: { price: "Quote Required", amountCents: 0, isCustom: true },
        SGD: { price: "Quote Required", amountCents: 0, isCustom: true },
      },
    },
    {
      id: "growth",
      serviceId: "maintenance",
      name: "Growth",
      blurb: "Performance optimization, regression checks, and priority support",
      meta: "Continuous upkeep, minor improvements & proactive care (6–8 hrs/month)",
      deliveryDuration: "Monthly Recurring Retainer",
      minDays: 0,
      maxDays: 0,
      isAdditionalDuration: true,
      isRecurring: true,
      allocationHours: "6–8 hrs/mo",
      featured: true,
      cta: "Select Growth",
      features: [
        "Everything in Essential",
        "Performance Optimization",
        "Regression Checks & Fixes",
        "Store Releases & App Updates",
        "Minor UI/UX Improvements",
        "Technical Health Reporting",
        "Priority Support SLA",
        "Engineering Allocation: ~6–8 hrs/month",
      ],
      commercialStatus: "authoritative",
      pricing: {
        INR: { price: "₹14,999/mo", amountCents: 1499900 },
        USD: { price: "Quote Required", amountCents: 0, isCustom: true },
        GBP: { price: "Quote Required", amountCents: 0, isCustom: true },
        EUR: { price: "Quote Required", amountCents: 0, isCustom: true },
        AED: { price: "Quote Required", amountCents: 0, isCustom: true },
        SGD: { price: "Quote Required", amountCents: 0, isCustom: true },
      },
    },
    {
      id: "scale",
      serviceId: "maintenance",
      name: "Scale",
      blurb: "Premium engineering retainer with dedicated technical squad",
      meta: "Dedicated technical contact, monitoring & CI/CD ops (15–18 hrs/month)",
      deliveryDuration: "Monthly Recurring Retainer",
      minDays: 0,
      maxDays: 0,
      isAdditionalDuration: true,
      isRecurring: true,
      allocationHours: "15–18 hrs/mo",
      cta: "Select Scale",
      features: [
        "Everything in Growth",
        "Dedicated Technical Contact",
        "24/7 Production Monitoring",
        "Priority Incident Response",
        "Security Reviews & Patching",
        "Release Management",
        "API, Backend & Database Maintenance",
        "CI/CD Pipeline Maintenance",
        "Technical Strategy & Architecture Review",
        "Engineering Allocation: ~15–18 hrs/month",
      ],
      commercialStatus: "authoritative",
      pricing: {
        INR: { price: "₹49,999/mo", amountCents: 4999900 },
        USD: { price: "Quote Required", amountCents: 0, isCustom: true },
        GBP: { price: "Quote Required", amountCents: 0, isCustom: true },
        EUR: { price: "Quote Required", amountCents: 0, isCustom: true },
        AED: { price: "Quote Required", amountCents: 0, isCustom: true },
        SGD: { price: "Quote Required", amountCents: 0, isCustom: true },
      },
    },
  ],
};

export interface SelectedServiceItem {
  serviceId: ServiceId;
  planId: string;
}

export function getServicePlan(serviceId: ServiceId, planId: string): ServicePlan | null {
  const plans = SERVICE_PLANS[serviceId];
  if (!plans) return null;
  return plans.find((p) => p.id === planId) ?? null;
}

export function getServiceDefinition(serviceId: ServiceId) {
  return SERVICES.find((s) => s.id === serviceId) ?? SERVICES[0];
}

export interface AggregatePricingResult {
  oneTimeTotalAmountCents: number;
  maintenanceMonthlyCents: number;
  totalAmountCents: number; // strictly equals oneTimeTotalAmountCents for one-time project value
  tokenAmountCents: number; // strictly 15% of oneTimeTotalAmountCents
  balanceAmountCents: number; // strictly 85% of oneTimeTotalAmountCents
  tokenPercentage: number;
  currency: CurrencyCode;
  items: Array<{
    serviceId: ServiceId;
    serviceLabel: string;
    serviceIcon: string;
    planId: string;
    planName: string;
    priceFormatted: string;
    amountCents: number;
    deliveryDuration: string;
    isCustom: boolean;
    isAdditionalDuration: boolean;
    isRecurring: boolean;
    allocationHours?: string;
    minDays: number;
    maxDays: number;
  }>;
  hasCustomPlan: boolean;
  hasRecurringPlan: boolean;
  estimatedTimeline: {
    baseDaysText: string;
    additionalDaysText: string | null;
    totalDaysText: string;
  };
}

/**
 * Compute aggregate pricing and multi-service delivery timeline authoritatively.
 *
 * CRITICAL BUSINESS RULES:
 * 1. one_time_total = sum(selected one-time services: app, web, qa_uat, beta_release)
 * 2. token_amount = strictly 15% of one_time_total (integer minor units).
 * 3. balance_amount = strictly 85% of one_time_total (one_time_total - token_amount).
 * 4. Maintenance plans are RECURRING services and MUST NEVER be added to the 15% one-time token.
 * 5. Maintenance delivery duration does not inflate one-time launch timeline.
 */
export function calculateAggregateProjectPricing(
  items: SelectedServiceItem[],
  currency: CurrencyCode,
): AggregatePricingResult {
  let oneTimeTotalAmountCents = 0;
  let maintenanceMonthlyCents = 0;
  let hasCustomPlan = false;
  let hasRecurringPlan = false;
  let baseMinDays = 0;
  let baseMaxDays = 0;
  let additionalMinDays = 0;
  let additionalMaxDays = 0;
  let baseDurationLabel = "";

  const resolvedItems: AggregatePricingResult["items"] = [];

  for (const item of items) {
    const plan = getServicePlan(item.serviceId, item.planId);
    if (!plan) continue;

    const def = getServiceDefinition(item.serviceId);
    const planPricing = plan.pricing[currency] ?? plan.pricing.USD;
    const isRecurring = Boolean(plan.isRecurring || item.serviceId === "maintenance");

    if (planPricing.isCustom) {
      hasCustomPlan = true;
    } else if (isRecurring) {
      hasRecurringPlan = true;
      maintenanceMonthlyCents += planPricing.amountCents;
    } else {
      oneTimeTotalAmountCents += planPricing.amountCents;
    }

    if (item.serviceId === "app") {
      baseMinDays = plan.minDays;
      baseMaxDays = plan.maxDays;
      baseDurationLabel = plan.deliveryDuration;
    } else if (!isRecurring) {
      additionalMinDays += plan.minDays;
      additionalMaxDays += plan.maxDays;
    }

    resolvedItems.push({
      serviceId: item.serviceId,
      serviceLabel: def.label,
      serviceIcon: def.icon,
      planId: plan.id,
      planName: plan.name,
      priceFormatted: planPricing.isCustom
        ? "Quote Required"
        : formatCurrencyAmount(planPricing.amountCents, currency) + (isRecurring ? "/mo" : ""),
      amountCents: planPricing.amountCents,
      deliveryDuration: plan.deliveryDuration,
      isCustom: Boolean(planPricing.isCustom),
      isAdditionalDuration: Boolean(plan.isAdditionalDuration),
      isRecurring,
      allocationHours: plan.allocationHours,
      minDays: plan.minDays,
      maxDays: plan.maxDays,
    });
  }

  // Token is strictly 15% of the ONE-TIME project total
  const tokenPercentage = 15;
  const tokenAmountCents = Math.round(oneTimeTotalAmountCents * 0.15);
  const balanceAmountCents = oneTimeTotalAmountCents - tokenAmountCents;
  const totalAmountCents = oneTimeTotalAmountCents;

  // Compute timeline from one-time build & release services
  let totalDaysText = "3–7 Days";
  const baseDaysText = baseDurationLabel || "3 Days";
  let additionalDaysText: string | null = null;

  if (baseMinDays > 0) {
    const totalMin = baseMinDays + additionalMinDays;
    const totalMax = baseMaxDays + additionalMaxDays;
    totalDaysText =
      totalMin === totalMax ? totalMin + " Days" : totalMin + "–" + totalMax + " Days";
  } else if (additionalMinDays > 0) {
    totalDaysText =
      additionalMinDays === additionalMaxDays
        ? additionalMinDays + " Days"
        : additionalMinDays + "–" + additionalMaxDays + " Days";
  }

  if (additionalMinDays > 0 || additionalMaxDays > 0) {
    additionalDaysText =
      additionalMinDays === additionalMaxDays
        ? "+" + additionalMinDays + " days"
        : "+" + additionalMinDays + "–" + additionalMaxDays + " days";
  }

  return {
    oneTimeTotalAmountCents,
    maintenanceMonthlyCents,
    totalAmountCents,
    tokenAmountCents,
    balanceAmountCents,
    tokenPercentage,
    currency,
    items: resolvedItems,
    hasCustomPlan,
    hasRecurringPlan,
    estimatedTimeline: {
      baseDaysText,
      additionalDaysText,
      totalDaysText,
    },
  };
}
