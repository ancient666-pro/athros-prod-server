import { useCallback, useEffect, useState } from "react";
import {
  currencyForCountry,
  detectClientCurrency,
  readStoredCurrency,
  storeCurrency,
  type CurrencyCode,
} from "./currency";
import { getVisitorRegion } from "./geo.functions";

/**
 * Resolves the visitor's display currency. SSR renders the neutral default (USD)
 * and the real value lands after hydration, so there is no hydration mismatch.
 */
export function useCurrency() {
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const stored = readStoredCurrency();
    if (stored) {
      setCurrency(stored);
      setResolved(true);
      return;
    }

    // Fall back immediately so pricing never waits on the network.
    setCurrency(detectClientCurrency());

    void getVisitorRegion()
      .then((result) => {
        if (cancelled) return;
        const fromGeo = currencyForCountry(result.country);
        if (fromGeo) setCurrency(fromGeo);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setResolved(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const select = useCallback((code: CurrencyCode) => {
    storeCurrency(code);
    setCurrency(code);
    setResolved(true);
  }, []);

  return { currency, select, resolved };
}
