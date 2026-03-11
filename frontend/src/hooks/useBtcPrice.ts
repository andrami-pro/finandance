"use client";

import { useEffect, useState } from "react";

interface BtcPrice {
  eur: number | null;
  usd: number | null;
  loading: boolean;
}

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur,usd";

const REFRESH_INTERVAL_MS = 60_000; // 60 s

export function useBtcPrice(): BtcPrice {
  const [eur, setEur] = useState<number | null>(null);
  const [usd, setUsd] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchPrice() {
      try {
        const res = await fetch(COINGECKO_URL);
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        setEur(json.bitcoin?.eur ?? null);
        setUsd(json.bitcoin?.usd ?? null);
      } catch {
        // silently ignore — hint just won't render
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPrice();
    const id = setInterval(fetchPrice, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { eur, usd, loading };
}
