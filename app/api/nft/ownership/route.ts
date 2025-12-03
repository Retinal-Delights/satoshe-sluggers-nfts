/**
 * NFT Ownership API Route (Batch)
 * Checks owner for a batch of tokenIds using Insight API (primary) or Multicall3 (fallback).
 * Returns: { ownership: { [tokenId: number]: { owner: string, isSold: boolean } } }
 */

import { NextRequest, NextResponse } from "next/server";
import { getBatchOwnershipWithFallback } from "@/lib/insight-service";

// Environment variable sanity checks
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS;
const MARKETPLACE_ADDRESS =
  process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS?.toLowerCase();

if (!CONTRACT_ADDRESS || !MARKETPLACE_ADDRESS) {
  throw new Error("Missing required environment variables for ownership API");
}

// Main POST handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokenIds }: { tokenIds: number[] } = body;

    if (!Array.isArray(tokenIds) || tokenIds.length === 0) {
      return NextResponse.json(
        { error: "tokenIds must be a non-empty array" },
        { status: 400 },
      );
    }

    // Maximum batch size for any single API/user request
    const MAX_BATCH_SIZE = 200;
    const batches: number[][] = [];
    for (let i = 0; i < tokenIds.length; i += MAX_BATCH_SIZE) {
      batches.push(tokenIds.slice(i, i + MAX_BATCH_SIZE));
    }

    const results: Record<number, { owner: string; isSold: boolean }> = {};

    for (const batch of batches) {
      try {
        // Use Insight API (primary) with Multicall3 fallback for efficient batch ownership checks
        const ownershipResults = await getBatchOwnershipWithFallback(CONTRACT_ADDRESS!, batch);
        
        ownershipResults.forEach(({ tokenId, owner }) => {
          const ownerLower = owner.toLowerCase();
          results[tokenId] = {
            owner: ownerLower,
            isSold: ownerLower !== "" && ownerLower !== MARKETPLACE_ADDRESS,
          };
        });
      } catch (err) {
        console.error("Batch ownership fetch failed:", err);
        // On error, return empty results for this batch
        batch.forEach((tokenId) => {
          results[tokenId] = { owner: "", isSold: false };
        });
      }
    }

    return NextResponse.json({ ownership: results });
  } catch (err) {
    console.error("Ownership API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch ownership data" },
      { status: 500 },
    );
  }
}

/**
 * NON-DEVELOPER NOTES:
 * - This API uses Insight API (primary) for efficient batch ownership checks (1 API call per batch).
 * - Falls back to Multicall3 if Insight API is unavailable (1 RPC call per 100 NFTs).
 * - All batching is pre-tuned to avoid "rate limit" or provider bans.
 * - This can be called with up to 200 IDs at a time MAX!
 * - It will never crash or throw on individual token errors or missing/invalid IDs.
 */
