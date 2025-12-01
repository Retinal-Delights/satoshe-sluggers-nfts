// lib/multicall3.ts
/**
 * Multicall3 Utility
 * Uses Multicall3 contract to batch multiple contract calls into a single RPC call
 * Dramatically reduces RPC usage (e.g., 100 ownerOf calls → 1 RPC call)
 * 
 * Uses Thirdweb's multicall3 extension for proper type safety
 */

import { getContract, readContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { client } from "./thirdweb";
import { Interface } from "ethers";

// Standard Multicall3 contract address (same on all chains)
const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11" as const;

/**
 * Get Multicall3 contract instance
 */
export function getMulticall3Contract() {
  return getContract({
    client,
    chain: base,
    address: MULTICALL3_ADDRESS,
  });
}

/**
 * Batch check ownership for multiple NFTs using Multicall3
 * This reduces N individual RPC calls to 1 single RPC call
 * 
 * @param nftContractAddress - The NFT collection contract address
 * @param tokenIds - Array of token IDs to check (0-based)
 * @returns Promise resolving to array of { tokenId, owner } results
 */
export async function batchCheckOwnership(
  nftContractAddress: string,
  tokenIds: number[]
): Promise<Array<{ tokenId: number; owner: string }>> {
  if (tokenIds.length === 0) return [];

  const multicall3 = getMulticall3Contract();

  // Prepare calls for multicall3 using ethers to encode function calls
  // Each call is: ownerOf(tokenId) on the NFT contract
  const erc721Interface = new Interface([
    "function ownerOf(uint256 tokenId) view returns (address)",
  ]);

  const calls = tokenIds.map((tokenId) => {
    const callData = erc721Interface.encodeFunctionData("ownerOf", [BigInt(tokenId)]);
    
    return {
      target: nftContractAddress as `0x${string}`,
      callData: callData as `0x${string}`,
    };
  });

  // Multicall3 has a limit, so batch if needed (typically 100-200 calls per batch)
  const MAX_CALLS_PER_BATCH = 100;
  const results: Array<{ tokenId: number; owner: string }> = [];

  for (let i = 0; i < calls.length; i += MAX_CALLS_PER_BATCH) {
    const batch = calls.slice(i, i + MAX_CALLS_PER_BATCH);
    const batchTokenIds = tokenIds.slice(i, i + MAX_CALLS_PER_BATCH);

    try {
      // Use readContract with tryAggregate method to handle individual call failures gracefully
      // Type assertion needed because Thirdweb's type system doesn't fully support complex tuples
      // @ts-expect-error - Thirdweb's readContract doesn't fully support multicall3's complex tuple types
      const multicallResult = await readContract({
        contract: multicall3,
        method: "function tryAggregate(bool requireSuccess, tuple(address target, bytes callData)[] calls) view returns (tuple(bool success, bytes returnData)[] returnData)",
        params: [false, batch],
      }) as Array<{ success: boolean; returnData: string }>;

      // Decode results
      const decodedResults = multicallResult.map((result, idx) => {
        const tokenId = batchTokenIds[idx];
        
        if (!result.success || !result.returnData || result.returnData === "0x") {
          return { tokenId, owner: "" };
        }

        try {
          // Decode the address from the return data
          // ownerOf returns an address (20 bytes = 40 hex chars)
          // Solidity pads addresses to 32 bytes (64 hex chars), so we take the last 40 chars
          const hex = result.returnData.startsWith("0x") 
            ? result.returnData.slice(2) 
            : result.returnData;
          const addressHex = hex.slice(-40); // Last 40 chars = 20 bytes = address
          const owner = `0x${addressHex}`;
          return { tokenId, owner: owner.toLowerCase() };
        } catch {
          return { tokenId, owner: "" };
        }
      });

      results.push(...decodedResults);
    } catch (error) {
      // If multicall fails, mark all in this batch as failed
      console.error("Multicall3 batch failed:", error);
      batchTokenIds.forEach((tokenId) => {
        results.push({ tokenId, owner: "" });
      });
    }
  }

  return results;
}
