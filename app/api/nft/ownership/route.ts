// app/api/nft/ownership/route.ts
/**
 * NFT Ownership API Route
 * Provides batch ownership checking using Thirdweb Insight API
 * Reduces RPC calls by batching multiple token IDs in a single API call
 */

import { NextRequest, NextResponse } from "next/server";
import { createThirdwebClient } from "thirdweb";
import { base } from "thirdweb/chains";
import { getContract, readContract } from "thirdweb";

const CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS;
const CREATOR_ADDRESS = process.env.NEXT_PUBLIC_CREATOR_ADDRESS?.toLowerCase();

if (!CLIENT_ID || !CONTRACT_ADDRESS || !CREATOR_ADDRESS) {
  throw new Error("Missing required environment variables for ownership API");
}

const client = createThirdwebClient({ clientId: CLIENT_ID });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokenIds }: { tokenIds: number[] } = body;

    if (!Array.isArray(tokenIds) || tokenIds.length === 0) {
      return NextResponse.json(
        { error: "tokenIds must be a non-empty array" },
        { status: 400 }
      );
    }

    // Limit batch size to prevent API abuse
    const MAX_BATCH_SIZE = 200;
    const batches: number[][] = [];
    
    for (let i = 0; i < tokenIds.length; i += MAX_BATCH_SIZE) {
      batches.push(tokenIds.slice(i, i + MAX_BATCH_SIZE));
    }

    const results: Record<number, { owner: string; isSold: boolean }> = {};

    // Process each batch
    for (const batch of batches) {
      try {
        // Try Insight API first (batch call)
        const insightResults = await fetchInsightOwnership(batch);
        
        if (insightResults) {
          // Insight API succeeded
          Object.assign(results, insightResults);
        } else {
          // Fallback to individual RPC calls with rate limiting
          const rpcResults = await fetchRPCOwnership(batch);
          Object.assign(results, rpcResults);
        }
      } catch (error) {
        console.error("Error fetching ownership for batch:", error);
        // Fallback to RPC for this batch
        const rpcResults = await fetchRPCOwnership(batch);
        Object.assign(results, rpcResults);
      }
    }

    return NextResponse.json({ ownership: results });
  } catch (error) {
    console.error("Error in ownership API:", error);
    return NextResponse.json(
      { error: "Failed to fetch ownership data" },
      { status: 500 }
    );
  }
}

/**
 * Fetch ownership using Thirdweb Insight API (batch call)
 * Returns null if Insight API is unavailable
 */
async function fetchInsightOwnership(
  tokenIds: number[]
): Promise<Record<number, { owner: string; isSold: boolean }> | null> {
  try {
    // Use Thirdweb's Insight API endpoint
    // Note: This endpoint may need adjustment based on actual Thirdweb Insight API documentation
    const response = await fetch(
      `https://api.thirdweb.com/v1/contracts/${CONTRACT_ADDRESS}/nfts?chain=${base.id}&tokenIds=${tokenIds.join(',')}`,
      {
        headers: {
          'Authorization': `Bearer ${CLIENT_ID}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const results: Record<number, { owner: string; isSold: boolean }> = {};

    if (data.data && Array.isArray(data.data)) {
      data.data.forEach((nft: any) => {
        const tokenId = parseInt(nft.tokenId) || parseInt(nft.token_id);
        const owner = (nft.owner || '').toLowerCase();
        const isSold = owner !== '' && owner !== CREATOR_ADDRESS;

        results[tokenId] = { owner, isSold };
      });
    }

    return results;
  } catch {
    return null;
  }
}

/**
 * Fallback: Fetch ownership using individual RPC calls
 * Uses rate limiting to stay under 200 calls/second
 */
async function fetchRPCOwnership(
  tokenIds: number[]
): Promise<Record<number, { owner: string; isSold: boolean }> > {
  const contract = getContract({
    client,
    chain: base,
    address: CONTRACT_ADDRESS!,
  });

  const results: Record<number, { owner: string; isSold: boolean }> = {};

  // Process in smaller batches with delays to respect rate limits
  const BATCH_SIZE = 10;
  const DELAY_MS = 50;

  for (let i = 0; i < tokenIds.length; i += BATCH_SIZE) {
    const batch = tokenIds.slice(i, i + BATCH_SIZE);
    
    const batchResults = await Promise.allSettled(
      batch.map(async (tokenId) => {
        try {
          const owner = await readContract({
            contract,
            method: "function ownerOf(uint256 tokenId) view returns (address)",
            params: [BigInt(tokenId)],
          }) as string;
          const ownerLower = owner.toLowerCase();
          return {
            tokenId,
            owner: ownerLower,
            isSold: ownerLower !== CREATOR_ADDRESS,
          };
        } catch {
          return {
            tokenId,
            owner: '',
            isSold: false,
          };
        }
      })
    );

    batchResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        const { tokenId, owner, isSold } = result.value;
        results[tokenId] = { owner, isSold };
      }
    });

    // Delay between batches to respect rate limits
    if (i + BATCH_SIZE < tokenIds.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  return results;
}

