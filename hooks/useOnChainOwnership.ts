"use client";

/**
 * useOnChainOwnership React Hook
 *
 * Instantly returns LIVE and SOLD NFT counts, using:
 * - Your efficient backend API (/api/nft/aggregate-counts).
 * - LocalStorage for snappy reloads.
 * - Automatic updates when window.nftPurchased is fired (after any purchase).
 */

import { useState, useEffect, useCallback } from "react";

// Use the same key and expiry as backend route
const CACHE_KEY = "nft_aggregate_counts_cache";
const CACHE_EXPIRY = 1 * 60 * 1000; // 1 minute (reduced from 10 for faster updates)

interface CountsCache {
  liveCount: number;
  soldCount: number;
  timestamp: number;
}

/**
 * Returns:
 *   { liveCount, soldCount, isChecking }
 * - liveCount: number available for mint/sale
 * - soldCount: number sold
 * - isChecking: whether loading values from API
 */
export function useOnChainOwnership(totalNFTs: number = 7777) {
  const [liveCount, setLiveCount] = useState(totalNFTs);
  const [soldCount, setSoldCount] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  // Try to load cached counts (valid if less than CACHE_EXPIRY ms old)
  const loadCache = useCallback((): CountsCache | null => {
    if (typeof window === "undefined" || typeof localStorage === "undefined")
      return null;

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const parsed: CountsCache = JSON.parse(cached);

      if (Date.now() - parsed.timestamp < CACHE_EXPIRY) {
        return parsed;
      }

      localStorage.removeItem(CACHE_KEY);
      return null;
    } catch {
      // Corrupt or missing localStorage: ignore and fallback
      return null;
    }
  }, []);

  // Save fresh counts for future page reloads
  const saveCache = useCallback((liveCount: number, soldCount: number) => {
    if (typeof window === "undefined" || typeof localStorage === "undefined")
      return;

    try {
      const cache: CountsCache = {
        liveCount,
        soldCount,
        timestamp: Date.now(),
      };

      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {
      // Ignore quota/localStorage errors
    }
  }, []);

  // Fetch from API (calls your /api/nft/aggregate-counts route)
  const fetchAggregateCounts = useCallback(async () => {
    try {
      const response = await fetch("/api/nft/aggregate-counts");

      if (!response.ok) throw new Error("Aggregate counts API failed");

      const data = await response.json();

      return {
        liveCount:
          typeof data.liveCount === "number" ? data.liveCount : totalNFTs,
        soldCount: typeof data.soldCount === "number" ? data.soldCount : 0,
      };
    } catch {
      return {
        liveCount: totalNFTs,
        soldCount: 0,
      };
    }
  }, [totalNFTs]);

  // On mount: fill from cache or refresh from API
  useEffect(() => {
    if (!totalNFTs) return;

    const cached = loadCache();
    if (cached) {
      // Use cached data but still fetch fresh data in background
      setLiveCount(cached.liveCount);
      setSoldCount(cached.soldCount);
    }

    let cancelled = false;
    setIsChecking(true);
    // Always fetch fresh data from API (ignores cache)
    fetch("/api/nft/aggregate-counts?forceRefresh=true")
      .then((response) => {
        if (!response.ok) throw new Error("Aggregate counts API failed");
        return response.json();
      })
      .then((data) => {
        if (!cancelled) {
          const liveCount = typeof data.liveCount === "number" ? data.liveCount : totalNFTs;
          const soldCount = typeof data.soldCount === "number" ? data.soldCount : 0;
          setLiveCount(liveCount);
          setSoldCount(soldCount);
          saveCache(liveCount, soldCount);
          setIsChecking(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsChecking(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [totalNFTs, loadCache, saveCache]);

  // Periodically refresh counts (every 30 seconds) to catch any purchases
  useEffect(() => {
    if (!totalNFTs) return;

    const interval = setInterval(() => {
      fetchAggregateCounts().then(({ liveCount, soldCount }) => {
        setLiveCount(liveCount);
        setSoldCount(soldCount);
        saveCache(liveCount, soldCount);
      }).catch(() => {
        // Silently fail on refresh
      });
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [totalNFTs, fetchAggregateCounts, saveCache]);

  // Listen for window "nftPurchased" events; update instantly and expire cache
  useEffect(() => {
    const handler = () => {
      // Immediately update counts optimistically
      setSoldCount((prev) => prev + 1);
      setLiveCount((prev) => Math.max(0, prev - 1));

      // Clear localStorage cache
      if (
        typeof window !== "undefined" &&
        typeof localStorage !== "undefined"
      ) {
        localStorage.removeItem(CACHE_KEY);
      }

      // Force a fresh API call to get accurate counts from blockchain (bypass cache)
      setIsChecking(true);
      fetch("/api/nft/aggregate-counts?forceRefresh=true")
        .then((response) => {
          if (!response.ok) throw new Error("Aggregate counts API failed");
          return response.json();
        })
        .then((data) => {
          const liveCount = typeof data.liveCount === "number" ? data.liveCount : totalNFTs;
          const soldCount = typeof data.soldCount === "number" ? data.soldCount : 0;
          setLiveCount(liveCount);
          setSoldCount(soldCount);
          saveCache(liveCount, soldCount);
          setIsChecking(false);
        })
        .catch(() => {
          setIsChecking(false);
        });
    };

    window.addEventListener("nftPurchased", handler as EventListener);
    return () =>
      window.removeEventListener("nftPurchased", handler as EventListener);
  }, [fetchAggregateCounts, saveCache]);

  // Return API: compatible with existing code
  return {
    liveCount,
    soldCount,
    isChecking,
    checkedCount: totalNFTs,
    totalToCheck: totalNFTs,
    soldTokens: new Set<number>(), // always empty (compat)
  };
}
