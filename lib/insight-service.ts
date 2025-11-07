// lib/insight-service.ts
/**
 * Thirdweb Insight Service
 * Provides batch NFT ownership and metadata queries using Thirdweb Insight API
 * Reduces RPC calls from 200 individual calls to 1 batch API call
 */

import { base } from "thirdweb/chains";

const CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS;
const CREATOR_ADDRESS = process.env.NEXT_PUBLIC_CREATOR_ADDRESS?.toLowerCase();

if (!CLIENT_ID || !CONTRACT_ADDRESS) {
  throw new Error("Missing required environment variables for Insight service");
}

export interface OwnershipResult {
  tokenId: number;
  owner: string;
  isSold: boolean; // true if owner !== creator
}

/**
 * Batch check ownership for multiple NFTs using Thirdweb Insight API
 * This reduces RPC calls from N individual calls to 1 batch API call
 * 
 * @param tokenIds - Array of token IDs to check (0-based, e.g., [0, 1, 2, ...])
 * @param maxBatchSize - Maximum tokens per batch (default: 200)
 * @returns Promise resolving to array of ownership results
 */
export async function getBatchOwnership(
  tokenIds: number[],
  maxBatchSize: number = 200
): Promise<OwnershipResult[]> {
  if (!CREATOR_ADDRESS) {
    throw new Error("CREATOR_ADDRESS not configured");
  }

  const results: OwnershipResult[] = [];
  
  // Process in batches to avoid API limits
  for (let i = 0; i < tokenIds.length; i += maxBatchSize) {
    const batch = tokenIds.slice(i, i + maxBatchSize);
    
    try {
      // Use Thirdweb's NFT API to batch fetch ownership
      // This is a single API call that returns ownership for all tokens in the batch
      const response = await fetch(
        `https://api.thirdweb.com/v1/contracts/${CONTRACT_ADDRESS}/nfts?chain=${base.id}&tokenIds=${batch.join(',')}`,
        {
          headers: {
            'Authorization': `Bearer ${CLIENT_ID}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        // Fallback to individual RPC calls if Insight API fails
        return await getBatchOwnershipFallback(tokenIds);
      }

      const data = await response.json();
      
      // Process results
      if (data.data && Array.isArray(data.data)) {
        interface NFTData {
          tokenId?: string;
          token_id?: string;
          owner?: string;
        }
        data.data.forEach((nft: NFTData) => {
          const tokenId = parseInt(nft.tokenId || nft.token_id || '0');
          const owner = (nft.owner || '').toLowerCase();
          const isSold = owner !== '' && owner !== CREATOR_ADDRESS;
          
          results.push({
            tokenId,
            owner,
            isSold,
          });
        });
      }
    } catch {
      // Fallback to individual calls if batch fails
      return await getBatchOwnershipFallback(batch);
    }
  }

  return results;
}

/**
 * Fallback function: Uses individual RPC calls if Insight API is unavailable
 * This maintains functionality but is slower than batch API calls
 * @param tokenIds - Array of token IDs to check ownership for
 * @returns Promise resolving to array of ownership results
 */
async function getBatchOwnershipFallback(
  tokenIds: number[]
): Promise<OwnershipResult[]> {
  const { getContract, readContract } = await import("thirdweb");
  const { client } = await import("@/lib/thirdweb");
  const { rpcRateLimiter } = await import("@/lib/rpc-rate-limiter");

  const contract = getContract({
    client,
    chain: base,
    address: CONTRACT_ADDRESS!,
  });

  const calls = tokenIds.map((tokenId) => async () => {
    try {
      const owner = await rpcRateLimiter.execute(async () => {
        return await readContract({
          contract,
          method: "function ownerOf(uint256 tokenId) view returns (address)",
          params: [BigInt(tokenId)],
        }) as string;
      });
      const ownerLower = (owner as string).toLowerCase();
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
  });

  const results = await rpcRateLimiter.executeBatch(calls, 10);
  return results.filter((r): r is OwnershipResult => r !== undefined);
}

/**
 * Gets ownership status for all NFTs in the collection using Insight API
 * Replaces 7,777 individual RPC calls with efficient batch API calls
 * @returns Promise resolving to a map of tokenId -> isSold boolean
 * @example
 * const ownership = await getAllOwnership()
 * const isToken1234Sold = ownership[1234] // true if sold, false if still available
 */
export async function getAllOwnership(): Promise<Record<number, boolean>> {
  const totalNFTs = 7777;
  const tokenIds = Array.from({ length: totalNFTs }, (_, i) => i);
  
  const results = await getBatchOwnership(tokenIds);
  
  const ownershipMap: Record<number, boolean> = {};
  results.forEach(({ tokenId, isSold }) => {
    ownershipMap[tokenId] = isSold;
  });
  
  return ownershipMap;
}

