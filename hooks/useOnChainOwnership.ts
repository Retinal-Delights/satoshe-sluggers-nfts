// hooks/useOnChainOwnership.ts
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ownerOf } from "thirdweb/extensions/erc721";
import { getContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { client } from "@/lib/thirdweb";
import { rpcRateLimiter } from "@/lib/rpc-rate-limiter";

const CREATOR_ADDRESS = process.env.NEXT_PUBLIC_CREATOR_ADDRESS?.toLowerCase();
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS;
const CACHE_KEY = "nft_ownership_cache";
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
const BATCH_SIZE = 10; // Smaller batches to stay under 200/sec limit
const BATCH_DELAY_MS = 100; // Delay between batches to ensure rate limit compliance

interface OwnershipCache {
  data: Record<number, boolean>; // tokenId -> isSold
  timestamp: number;
}

/**
 * Hook to compute Live/Sold counts using on-chain ownership data
 * Uses batched checking and caching for performance
 */
export function useOnChainOwnership(totalNFTs: number = 7777) {
  const [soldTokens, setSoldTokens] = useState<Set<number>>(new Set());
  const [isChecking, setIsChecking] = useState(false);
  const [checkedCount, setCheckedCount] = useState(0);
  const isProcessingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load cached ownership data
  const loadCache = useCallback((): OwnershipCache | null => {
    if (typeof window === "undefined") return null;
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      const parsed: OwnershipCache = JSON.parse(cached);
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

  // Save ownership data to cache
  const saveCache = useCallback((data: Record<number, boolean>) => {
    if (typeof window === "undefined") return;
    try {
      const cache: OwnershipCache = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Check ownership for a batch of token IDs using Insight API (batch call)
  const checkBatch = useCallback(
    async (tokenIds: number[]): Promise<Record<number, boolean>> => {
      if (!CONTRACT_ADDRESS || !CREATOR_ADDRESS) return {};

      try {
        // Use Insight API via backend route for batch ownership checking
        // This reduces RPC calls from N individual calls to 1 API call
        const response = await fetch('/api/nft/ownership', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokenIds }),
        });

        if (!response.ok) {
          throw new Error('Ownership API failed');
        }

        const data = await response.json();
        const batchResults: Record<number, boolean> = {};

        if (data.ownership) {
          Object.entries(data.ownership).forEach(([tokenIdStr, ownership]: [string, any]) => {
            const tokenId = parseInt(tokenIdStr);
            if (!isNaN(tokenId) && ownership && typeof ownership === 'object') {
              batchResults[tokenId] = ownership.isSold || false;
            }
          });
        }

        return batchResults;
      } catch (error) {
        console.error('Error fetching batch ownership via API, falling back to RPC:', error);
        
        // Fallback to individual RPC calls if API fails
        const contract = getContract({
          client,
          chain: base,
          address: CONTRACT_ADDRESS,
        });

        const calls = tokenIds.map((tokenId) => async () => {
          try {
            const owner = await rpcRateLimiter.execute(async () => {
              return (await ownerOf({
                contract,
                tokenId: BigInt(tokenId),
              })) as string;
            });
            const isSold = (owner as string).toLowerCase() !== CREATOR_ADDRESS;
            return { tokenId, isSold };
          } catch {
            return { tokenId, isSold: false };
          }
        });

        const results = await rpcRateLimiter.executeBatch(calls, 5);
        const batchResults: Record<number, boolean> = {};
        results.forEach((result) => {
          if (result !== undefined && typeof result === 'object' && 'tokenId' in result && 'isSold' in result) {
            const typedResult = result as { tokenId: number; isSold: boolean };
            batchResults[typedResult.tokenId] = typedResult.isSold;
          }
        });

        return batchResults;
      }
    },
    []
  );

  // Initialize: Load cache or start checking with rate limiting
  useEffect(() => {
    if (!CONTRACT_ADDRESS || !CREATOR_ADDRESS || totalNFTs === 0) {
      return;
    }

    // Prevent multiple simultaneous processing loops
    if (isProcessingRef.current) {
      return;
    }

    const cache = loadCache();
    if (cache) {
      // Load from cache
      const soldSet = new Set<number>();
      Object.entries(cache.data).forEach(([tokenId, isSold]) => {
        if (isSold) soldSet.add(parseInt(tokenId));
      });
      setSoldTokens(soldSet);
      setCheckedCount(Object.keys(cache.data).length);
      return;
    }

    // Mark as processing to prevent re-runs
    isProcessingRef.current = true;

    // Start checking from scratch with rate limiting
    setIsChecking(true);
    setCheckedCount(0);
    setSoldTokens(new Set());

    let currentBatch: number[] = [];
    let allResults: Record<number, boolean> = {};
    let currentTokenId = 0;
    let isCancelled = false;

    const processNextBatch = async () => {
      // Check if cancelled before processing
      if (isCancelled) {
        return;
      }

      // Build batch
      while (currentBatch.length < BATCH_SIZE && currentTokenId < totalNFTs) {
        currentBatch.push(currentTokenId);
        currentTokenId++;
      }

      if (currentBatch.length === 0) {
        // Done checking all NFTs
        if (!isCancelled) {
          setIsChecking(false);
          saveCache(allResults);
        }
        isProcessingRef.current = false;
        return;
      }

      // Check batch with rate limiting
      const batchResults = await checkBatch(currentBatch);
      
      // Check again if cancelled after async operation
      if (isCancelled) {
        isProcessingRef.current = false;
        return;
      }
      
      allResults = { ...allResults, ...batchResults };

      // Update state
      setCheckedCount((prev) => prev + currentBatch.length);
      setSoldTokens((prev) => {
        const newSet = new Set(prev);
        Object.entries(batchResults).forEach(([tokenId, isSold]) => {
          if (isSold) newSet.add(parseInt(tokenId));
          else newSet.delete(parseInt(tokenId));
        });
        return newSet;
      });

      // Clear batch and continue with delay to respect rate limit
      currentBatch = [];
      
      // Delay between batches to ensure we stay under 200/sec
      if (!isCancelled) {
        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null;
          processNextBatch();
        }, BATCH_DELAY_MS);
      }
    };

    processNextBatch();

    // Cleanup function to cancel processing
    return () => {
      isCancelled = true;
      isProcessingRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [totalNFTs, loadCache, saveCache, checkBatch]);

  // Listen for purchase events to update counts immediately
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ tokenId: number }>;
      const tokenIdNum = custom.detail?.tokenId;
      if (typeof tokenIdNum === 'number' && !Number.isNaN(tokenIdNum)) {
        // Immediately mark as sold without waiting for on-chain check
        setSoldTokens(prev => {
          const newSet = new Set(prev);
          newSet.add(tokenIdNum);
          return newSet;
        });
        // Invalidate cache so next load refreshes
        if (typeof window !== "undefined") {
          localStorage.removeItem(CACHE_KEY);
        }
      }
    };
    window.addEventListener('nftPurchased', handler as EventListener);
    return () => window.removeEventListener('nftPurchased', handler as EventListener);
  }, []);

  // Compute counts
  const liveCount = totalNFTs - soldTokens.size;
  const soldCount = soldTokens.size;

  return {
    liveCount,
    soldCount,
    isChecking,
    checkedCount,
    totalToCheck: totalNFTs,
    soldTokens, // Expose sold token set for component use
  };
}

