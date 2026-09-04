/**
 * Region + currency detection and localized pricing.
 * Detection priority: manual override -> server-side geo -> timezone -> browser locale.
 */
export const CURRENCIES = ["INR", "USD", "GBP", "EUR", "AED", "SGD"] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export const STORAGE_KEY = "athros.currency";

type TierPricing = {
  /** Displayed price for the tier. */
  price: string;
  /** Comparable "included worth" anchor. */
  worth?: string;
};

export const PRICING: Record<
  CurrencyCode,
  { label: string; tiers: [TierPricing, TierPricing, TierPricing] }
> = {
  INR: {
    label: "INR ₹",
    tiers: [
      { price: "₹69,999", worth: "₹1,20,000" },
      { price: "₹1,99,999", worth: "₹3,40,000" },
      { price: "₹3,99,999", worth: "₹6,80,000" },
    ],
  },
  USD: {
    label: "USD $",
    tiers: [
      { price: "$1,499", worth: "$2,600" },
      { price: "$4,999", worth: "$8,500" },
      { price: "$9,999", worth: "$17,000" },
    ],
  },
  GBP: {
    label: "GBP £",
    tiers: [
      { price: "£1,299", worth: "£2,200" },
      { price: "£4,299", worth: "£7,300" },
      { price: "£8,599", worth: "£14,500" },
    ],
  },
  EUR: {
    label: "EUR €",
    tiers: [
      { price: "€1,499", worth: "€2,600" },
      { price: "€4,999", worth: "€8,500" },
      { price: "€9,999", worth: "€17,000" },
    ],
  },
  AED: {
    label: "AED",
    tiers: [
      { price: "AED 5,499", worth: "AED 9,400" },
      { price: "AED 17,999", worth: "AED 30,600" },
      { price: "AED 35,999", worth: "AED 61,000" },
    ],
  },
  SGD: {
    label: "SGD",
    tiers: [
      { price: "SGD 1,999", worth: "SGD 3,400" },
      { price: "SGD 6,499", worth: "SGD 11,000" },
      { price: "SGD 12,999", worth: "SGD 22,000" },
    ],
  },
};

const COUNTRY_CURRENCY: Record<string, CurrencyCode> = {
  IN: "INR",
  US: "USD",
  CA: "USD",
  GB: "GBP",
  AE: "AED",
  SA: "AED",
  QA: "AED",
  KW: "AED",
  BH: "AED",
  OM: "AED",
  SG: "SGD",
  MY: "SGD",
  DE: "EUR",
  FR: "EUR",
  ES: "EUR",
  IT: "EUR",
  NL: "EUR",
  BE: "EUR",
  AT: "EUR",
  IE: "EUR",
  PT: "EUR",
  FI: "EUR",
  GR: "EUR",
  LU: "EUR",
  CY: "EUR",
  MT: "EUR",
  SI: "EUR",
  SK: "EUR",
  EE: "EUR",
  LV: "EUR",
  LT: "EUR",
};

const TIMEZONE_CURRENCY: Array<[RegExp, CurrencyCode]> = [
  [/^Asia\/(Kolkata|Calcutta|Colombo)/, "INR"],
  [/^Asia\/(Singapore|Kuala_Lumpur)/, "SGD"],
  [/^Asia\/(Dubai|Qatar|Riyadh|Kuwait|Bahrain|Muscat|Abu_Dhabi)/, "AED"],
  [/^Europe\/London/, "GBP"],
  [/^Europe\//, "EUR"],
  [/^America\//, "USD"],
  [/^(Pacific|Atlantic)\//, "USD"],
];

export function isCurrency(value: unknown): value is CurrencyCode {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}

export function currencyForCountry(country: string | null | undefined): CurrencyCode | null {
  if (!country) return null;
  return COUNTRY_CURRENCY[country.toUpperCase()] ?? null;
}

/** Browser-side fallback chain (timezone first, locale second). Never runs during SSR. */
export function detectClientCurrency(): CurrencyCode {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    for (const [pattern, code] of TIMEZONE_CURRENCY) {
      if (pattern.test(zone)) return code;
    }
  } catch {
    /* ignore */
  }

  if (typeof navigator !== "undefined") {
    const locales = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const loc of locales) {
      if (!loc) continue;
      const parts = loc.split("-");
      const region = parts.length > 1 ? parts[parts.length - 1] : parts[0];
      const match = currencyForCountry(region);
      if (match) return match;
    }
  }

  return "USD";
}

export function readStoredCurrency(): CurrencyCode | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isCurrency(stored) ? stored : null;
}

export function storeCurrency(code: CurrencyCode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, code);
}

/** Format currency amount for display */
export function formatCurrencyAmount(amountCents: number, currency: CurrencyCode): string {
  const amount = amountCents / 100;
  const isFractional = amount % 1 !== 0;
  const numFormatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: isFractional ? 2 : 0,
    maximumFractionDigits: 2,
  });

  switch (currency) {
    case "INR":
      return `₹${numFormatted}`;
    case "USD":
      return `$${numFormatted}`;
    case "GBP":
      return `£${numFormatted}`;
    case "EUR":
      return `€${numFormatted}`;
    case "AED":
      return `AED ${numFormatted}`;
    case "SGD":
      return `SGD ${numFormatted}`;
    default:
      return `${currency} ${numFormatted}`;
  }
}
