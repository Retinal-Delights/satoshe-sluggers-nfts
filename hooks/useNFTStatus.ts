/**
 * useNFTStatus Hook
 * Fetches NFT status from /api/nft/status and provides it as the single source of truth.
 * Never recalculates or guesses status - only uses the API response.
 */

import { useState, useEffect } from "react";

interface NFTStatusData {
  all: number;
  live: number;
  sold: number;
  statusByTokenId: Record<string, "ACTIVE" | "SOLD">;
}

export function useNFTStatus() {
  const [statusData, setStatusData] = useState<NFTStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchStatus = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/nft/status");

        if (!response.ok) {
          throw new Error(`Failed to fetch NFT status: ${response.statusText}`);
        }

        const data = await response.json();

        if (!cancelled) {
          setStatusData(data);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Unknown error"));
          setIsLoading(false);
          // Set default values on error
          const defaultStatus: Record<string, "ACTIVE" | "SOLD"> = {};
          for (let i = 0; i < 7777; i++) {
            defaultStatus[i.toString()] = "ACTIVE";
          }
          setStatusData({
            all: 7777,
            live: 7777,
            sold: 0,
            statusByTokenId: defaultStatus,
          });
        }
      }
    };

    fetchStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    all: statusData?.all ?? 7777,
    live: statusData?.live ?? 7777,
    sold: statusData?.sold ?? 0,
    statusByTokenId: statusData?.statusByTokenId ?? {},
    isLoading,
    error,
  };
}

