/**
 * NFT Ownership API Route (Batch)
 * Checks owner for a batch of tokenIds using Multicall3 for efficient batch queries.
 * Returns: { ownership: { [tokenId: number]: { owner: string, isSold: boolean } } }
 */

import { NextRequest, NextResponse } from "next/server";

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
        // Use Multicall3 for efficient batch ownership checks
        const rpcResults = await fetchRPCOwnership(batch);
        Object.assign(results, rpcResults);
      } catch {
        // On error, return empty results for this batch
        batch.forEach((tokenId) => {
          results[tokenId] = { owner: "", isSold: false };
        });
      }
    }

    return NextResponse.json({ ownership: results });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch ownership data" },
      { status: 500 },
    );
  }
}

// On-chain batch ownership check using Multicall3 (batches multiple calls into 1 RPC call)
async function fetchRPCOwnership(
  tokenIds: number[],
): Promise<Record<number, { owner: string; isSold: boolean }>> {
  const { batchCheckOwnership } = await import("@/lib/multicall3");
  
  const results: Record<number, { owner: string; isSold: boolean }> = {};

  // Use Multicall3 to batch all ownership checks into a single RPC call
  const ownershipResults = await batchCheckOwnership(CONTRACT_ADDRESS!, tokenIds);
  
  ownershipResults.forEach(({ tokenId, owner }) => {
    const ownerLower = owner.toLowerCase();
    results[tokenId] = {
      owner: ownerLower,
      isSold: ownerLower !== "" && ownerLower !== MARKETPLACE_ADDRESS,
    };
  });

  return results;
}

/**
 * NON-DEVELOPER NOTES:
 * - This API uses Multicall3 for efficient batch ownership checks.
 * - All batching is pre-tuned to avoid "rate limit" or provider bans.
 * - This can be called with up to 200 IDs at a time.
 * - It will never crash or throw on individual token errors or missing/invalid IDs.
 */
