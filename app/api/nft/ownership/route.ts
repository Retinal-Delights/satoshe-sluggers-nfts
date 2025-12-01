/**
 * NFT Ownership API Route (Batch)
 * Checks owner for a batch of tokenIds using Insight API or blockchain fallback.
 * Returns: { ownership: { [tokenId: number]: { owner: string, isSold: boolean } } }
 */

import { NextRequest, NextResponse } from "next/server";
import { createThirdwebClient } from "thirdweb";
import { base } from "thirdweb/chains";
import { getContract, readContract } from "thirdweb";

// Environment variable sanity checks
const CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
const INSIGHT_CLIENT_ID =
  process.env.NEXT_PUBLIC_INSIGHT_CLIENT_ID ||
  process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS;
const MARKETPLACE_ADDRESS =
  process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS?.toLowerCase();

if (!CLIENT_ID || !CONTRACT_ADDRESS || !MARKETPLACE_ADDRESS) {
  throw new Error("Missing required environment variables for ownership API");
}

const client = createThirdwebClient({ clientId: CLIENT_ID });

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
        // Try fast Insight API if available
        const insightResults = await fetchInsightOwnership(batch);
        if (insightResults) {
          Object.assign(results, insightResults);
        } else {
          // Fallback to on-chain direct method if Insight fails/unavailable
          const rpcResults = await fetchRPCOwnership(batch);
          Object.assign(results, rpcResults);
        }
      } catch {
        // On error, always fallback to on-chain lookup for robustness
        const rpcResults = await fetchRPCOwnership(batch);
        Object.assign(results, rpcResults);
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

// Insight indexer - fast, cheap, may be rate limited occasionally
async function fetchInsightOwnership(
  tokenIds: number[],
): Promise<Record<number, { owner: string; isSold: boolean }> | null> {
  try {
    const results: Record<number, { owner: string; isSold: boolean }> = {};
    const CHAIN_ID = base.id;
    const BATCH_SIZE = 20; // Insight recommends small batches!

    for (let i = 0; i < tokenIds.length; i += BATCH_SIZE) {
      const batch = tokenIds.slice(i, i + BATCH_SIZE);

      // Insight only supports "one owner per call" for ERC721s
      const batchPromises = batch.map(async (tokenId) => {
        try {
          const resp = await fetch(
            `https://insight.thirdweb.com/v1/tokens/${CHAIN_ID}/${CONTRACT_ADDRESS}/owners?tokenId=${tokenId}&page=1&limit=1`,
            {
              headers: {
                "x-client-id": INSIGHT_CLIENT_ID || "",
                "Content-Type": "application/json",
              },
            },
          );
          if (!resp.ok) return { tokenId, owner: "", isSold: false };
          const data = await resp.json();
          let owner = "";
          if (data.data && Array.isArray(data.data) && data.data.length > 0) {
            owner = (data.data[0].owner || "").toLowerCase();
          }
          const isSold = owner !== "" && owner !== MARKETPLACE_ADDRESS;
          return { tokenId, owner, isSold };
        } catch {
          return { tokenId, owner: "", isSold: false };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ tokenId, owner, isSold }) => {
        results[tokenId] = { owner, isSold };
      });

      if (i + BATCH_SIZE < tokenIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    return results;
  } catch {
    return null; // Fallback signal (do not crash)
  }
}

// On-chain direct fallback using Multicall3 (batches multiple calls into 1 RPC call)
async function fetchRPCOwnership(
  tokenIds: number[],
): Promise<Record<number, { owner: string; isSold: boolean }>> {
  const { batchCheckOwnership } = await import("@/lib/multicall3");
  
  const results: Record<number, { owner: string; isSold: boolean }> = {};

  try {
    // Use Multicall3 to batch all ownership checks into a single RPC call
    const ownershipResults = await batchCheckOwnership(CONTRACT_ADDRESS!, tokenIds);
    
    ownershipResults.forEach(({ tokenId, owner }) => {
      const ownerLower = owner.toLowerCase();
      results[tokenId] = {
        owner: ownerLower,
        isSold: ownerLower !== "" && ownerLower !== MARKETPLACE_ADDRESS,
      };
    });
  } catch (error) {
    console.error("Multicall3 ownership check failed, falling back to individual calls:", error);
    // Fallback to individual calls if multicall fails
    const contract = getContract({
      client,
      chain: base,
      address: CONTRACT_ADDRESS!,
    });

    const BATCH_SIZE = 10;
    for (let i = 0; i < tokenIds.length; i += BATCH_SIZE) {
      const batch = tokenIds.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.allSettled(
        batch.map(async (tokenId) => {
          try {
            const owner = (await readContract({
              contract,
              method: "function ownerOf(uint256 tokenId) view returns (address)",
              params: [BigInt(tokenId)],
            })) as string;
            const ownerLower = owner.toLowerCase();
            return {
              tokenId,
              owner: ownerLower,
              isSold: ownerLower !== MARKETPLACE_ADDRESS,
            };
          } catch {
            return {
              tokenId,
              owner: "",
              isSold: false,
            };
          }
        }),
      );

      batchResults.forEach((result) => {
        if (result.status === "fulfilled") {
          const { tokenId, owner, isSold } = result.value;
          results[tokenId] = { owner, isSold };
        }
      });
    }
  }

  return results;
}

/**
 * NON-DEVELOPER NOTES:
 * - This API is highly resilient. It first tries a fast indexer, then on-chain.
 * - All batching/delays are pre-tuned to avoid "rate limit" or provider bans.
 * - This can be called with up to 200 IDs at a time.
 * - It will never crash or throw on individual token errors or missing/invalid IDs.
 */
