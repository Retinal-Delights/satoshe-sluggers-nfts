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
    const { tokenIds }: { tokenIds: unknown } = body;

    // SECURITY: Strict validation - must be array
    if (!Array.isArray(tokenIds) || tokenIds.length === 0) {
      return NextResponse.json(
        { error: "tokenIds must be a non-empty array" },
        { status: 400 },
      );
    }

    // SECURITY: Validate and sanitize each tokenId
    // Only allow integers between 0 and 7776 (0-based token IDs)
    const TOTAL_NFTS = 7777;
    const MAX_TOKEN_ID = TOTAL_NFTS - 1;
    const validTokenIds: number[] = [];
    
    for (const id of tokenIds) {
      // Convert to number if string
      const numId = typeof id === 'string' ? parseInt(id, 10) : typeof id === 'number' ? Math.floor(id) : NaN;
      
      // SECURITY: Strict validation
      if (!isNaN(numId) && numId >= 0 && numId <= MAX_TOKEN_ID && Number.isInteger(numId)) {
        validTokenIds.push(numId);
      }
      // Invalid tokenIds are silently skipped (fail-secure)
    }

    if (validTokenIds.length === 0) {
      return NextResponse.json(
        { error: "No valid tokenIds provided. Must be integers between 0 and 7776" },
        { status: 400 },
      );
    }

    // SECURITY: Limit batch size to prevent DoS
    const MAX_BATCH_SIZE = 200;
    const MAX_TOTAL_REQUESTS = 1000; // Maximum total tokenIds per request
    
    if (validTokenIds.length > MAX_TOTAL_REQUESTS) {
      return NextResponse.json(
        { error: `Too many tokenIds. Maximum ${MAX_TOTAL_REQUESTS} allowed per request` },
        { status: 400 },
      );
    }

    const batches: number[][] = [];
    for (let i = 0; i < validTokenIds.length; i += MAX_BATCH_SIZE) {
      batches.push(validTokenIds.slice(i, i + MAX_BATCH_SIZE));
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
