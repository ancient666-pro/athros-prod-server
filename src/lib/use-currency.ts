import { useCallback, useEffect, useState } from "react";
import {
  currencyForCountry,
  detectClientCurrency,
  readStoredCurrency,
  storeCurrency,
  type CurrencyCode,
} from "./currency";
import { getVisitorRegion } from "./geo.functions";

const CURRENCY_CHANGE_EVENT = "athros:currency_change";

/**
 * Resolves the visitor's display currency. SSR renders the neutral default (USD)
 * and the real value lands after hydration, so there is no hydration mismatch.
 */
export function useCurrency() {
  const [currency, setCurrency] = useState<CurrencyCode>(() => {
    if (typeof window !== "undefined") {
      const stored = readStoredCurrency();
      if (stored) return stored;
      return detectClientCurrency();
    }
    return "USD";
  });
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const stored = readStoredCurrency();
    if (stored) {
      setCurrency(stored);
      setResolved(true);
    } else {
      const detected = detectClientCurrency();
      setCurrency(detected);

      void getVisitorRegion()
        .then((result) => {
          if (cancelled) return;
          const fromGeo = currencyForCountry(result.country);
          if (fromGeo) {
            setCurrency(fromGeo);
            storeCurrency(fromGeo);
          }
        })
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled) setResolved(true);
        });
    }

    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<CurrencyCode>;
      if (customEvent.detail) {
        setCurrency(customEvent.detail);
      } else {
        const current = readStoredCurrency();
        if (current) setCurrency(current);
      }
    };

    window.addEventListener(CURRENCY_CHANGE_EVENT, handleSync);
    window.addEventListener("storage", handleSync);

    return () => {
      cancelled = true;
      window.removeEventListener(CURRENCY_CHANGE_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const select = useCallback((code: CurrencyCode) => {
    storeCurrency(code);
    setCurrency(code);
    setResolved(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(CURRENCY_CHANGE_EVENT, { detail: code }));
    }
  }, []);

  return { currency, select, resolved };
}
