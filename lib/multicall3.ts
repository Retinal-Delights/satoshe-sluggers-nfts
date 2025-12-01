// lib/multicall3.ts
/**
 * Multicall3 Utility
 * Uses Multicall3 contract to batch multiple contract calls into a single RPC call
 * Dramatically reduces RPC usage (e.g., 100 ownerOf calls → 1 RPC call)
 * 
 * No fallback - multicall3 only
 */

import { getContract, readContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { client } from "./thirdweb";
import { Interface, AbiCoder } from "ethers";

// Standard Multicall3 contract address (same on all chains)
const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11" as const;

// ERC721 interface for encoding/decoding
const ERC721_INTERFACE = new Interface([
  "function ownerOf(uint256 tokenId) view returns (address)",
]);

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

  const multicall3 = getContract({
    client,
    chain: base,
    address: MULTICALL3_ADDRESS,
  });

  // Prepare calls for multicall3
  const calls = tokenIds.map((tokenId) => ({
    target: nftContractAddress as `0x${string}`,
    callData: ERC721_INTERFACE.encodeFunctionData("ownerOf", [BigInt(tokenId)]) as `0x${string}`,
  }));

  // Multicall3 has a limit, so batch if needed (typically 100-200 calls per batch)
  const MAX_CALLS_PER_BATCH = 100;
  const results: Array<{ tokenId: number; owner: string }> = [];

  for (let i = 0; i < calls.length; i += MAX_CALLS_PER_BATCH) {
    const batch = calls.slice(i, i + MAX_CALLS_PER_BATCH);
    const batchTokenIds = tokenIds.slice(i, i + MAX_CALLS_PER_BATCH);

    // Call Multicall3's tryAggregate
    // @ts-expect-error - Thirdweb's readContract type system doesn't fully support multicall3's complex tuple types, but this works at runtime
    const multicallResult = await readContract({
      contract: multicall3,
      method: "function tryAggregate(bool requireSuccess, tuple(address target, bytes callData)[] calls) view returns (tuple(bool success, bytes returnData)[] returnData)",
      params: [false, batch],
    }) as Array<{ success: boolean; returnData: string }>;

    // Decode results
    const decodedResults = multicallResult.map(({ success, returnData }, idx) => {
      const tokenId = batchTokenIds[idx];
      
      if (!success || !returnData || returnData === "0x") {
        return { tokenId, owner: "" };
      }

      try {
        const owner = ERC721_INTERFACE.decodeFunctionResult("ownerOf", returnData)[0] as string;
        return { tokenId, owner: owner.toLowerCase() };
      } catch {
        return { tokenId, owner: "" };
      }
    });

    results.push(...decodedResults);
  }

  return results;
}
