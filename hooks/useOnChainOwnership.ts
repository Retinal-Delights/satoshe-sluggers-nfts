// hooks/useOnChainOwnership.ts
"use client";

import { useState, useEffect, useCallback } from "react";

const CACHE_KEY = "nft_aggregate_counts_cache";
const CACHE_EXPIRY = 10 * 60 * 1000; // 10 minutes

interface CountsCache {
  liveCount: number;
  soldCount: number;
  timestamp: number;
}

/**
 * Hook to compute Live/Sold counts using Insight API aggregate queries
 * Uses cached aggregate counts instead of checking all 7,777 NFTs individually
 * This prevents thousands of RPC calls and rate limit errors
 */
export function useOnChainOwnership(totalNFTs: number = 7777) {
  const [liveCount, setLiveCount] = useState(totalNFTs);
  const [soldCount, setSoldCount] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  // Load cached counts
  const loadCache = useCallback((): CountsCache | null => {
    if (typeof window === "undefined") return null;
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      const parsed: CountsCache = JSON.parse(cached);
      const now = Date.now();
      if (now - parsed.timestamp < CACHE_EXPIRY) {
        return parsed;
      }
      localStorage.removeItem(CACHE_KEY);
      return null;
    } catch {
      return null;
    }
  }, []);

  // Save counts to cache
  const saveCache = useCallback((liveCount: number, soldCount: number) => {
    if (typeof window === "undefined") return;
    try {
      const cache: CountsCache = {
        liveCount,
        soldCount,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Fetch aggregate counts from Insight API
  const fetchAggregateCounts = useCallback(async () => {
    try {
      const response = await fetch('/api/nft/aggregate-counts');
      if (!response.ok) {
        throw new Error('Aggregate counts API failed');
      }
      const data = await response.json();
      return {
        liveCount: data.liveCount || totalNFTs,
        soldCount: data.soldCount || 0,
      };
    } catch {
      // Return defaults if API fails
      return {
        liveCount: totalNFTs,
        soldCount: 0,
      };
    }
  }, [totalNFTs]);

  // Initialize: Load cache or fetch aggregate counts
  useEffect(() => {
    if (totalNFTs === 0) {
      return;
    }

    // Check cache first
    const cached = loadCache();
    if (cached) {
      setLiveCount(cached.liveCount);
      setSoldCount(cached.soldCount);
      return;
    }

    // Fetch aggregate counts from API (only once, cache prevents re-fetch)
    let cancelled = false;
    setIsChecking(true);
    fetchAggregateCounts().then(({ liveCount, soldCount }) => {
      if (!cancelled) {
        setLiveCount(liveCount);
        setSoldCount(soldCount);
        saveCache(liveCount, soldCount);
        setIsChecking(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [totalNFTs]); // Only depend on totalNFTs - stable callbacks don't need to be in deps

  // Listen for purchase events to update counts immediately
  useEffect(() => {
    const handler = () => {
      // Immediately update counts when purchase happens
      setSoldCount(prev => prev + 1);
      setLiveCount(prev => Math.max(0, prev - 1));
      // Invalidate cache so next load refreshes
      if (typeof window !== "undefined") {
        localStorage.removeItem(CACHE_KEY);
      }
    };
    window.addEventListener('nftPurchased', handler as EventListener);
    return () => window.removeEventListener('nftPurchased', handler as EventListener);
  }, []);

  return {
    liveCount,
    soldCount,
    isChecking,
    checkedCount: totalNFTs, // For compatibility, show total as checked
    totalToCheck: totalNFTs,
    soldTokens: new Set<number>(), // Empty set for compatibility - not used anymore
  };
}

