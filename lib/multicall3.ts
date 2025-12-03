// lib/multicall3.ts
/**
 * Multicall3 Utility
 * Uses Multicall3 contract to batch multiple contract calls into a single RPC call
 * Dramatically reduces RPC usage (e.g., 100 ownerOf calls → 1 RPC call)
 * 
 * Uses Thirdweb v5 SDK with manual multicall3 contract interaction
 */

import { getContract, readContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { client } from "./thirdweb";
import { Interface } from "ethers";

// Standard Multicall3 contract address (same on all chains)
const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11" as const;

// ERC721 interface for encoding/decoding
const ERC721_INTERFACE = new Interface([
  "function ownerOf(uint256 tokenId) view returns (address)",
]);

// Multicall3 ABI for tryAggregate - using proper ABI format
const MULTICALL3_ABI = [
  {
    inputs: [
      {
        internalType: "bool",
        name: "requireSuccess",
        type: "bool",
      },
      {
        components: [
          {
            internalType: "address",
            name: "target",
            type: "address",
          },
          {
            internalType: "bytes",
            name: "callData",
            type: "bytes",
          },
        ],
        internalType: "struct Multicall3.Call[]",
        name: "calls",
        type: "tuple[]",
      },
    ],
    name: "tryAggregate",
    outputs: [
      {
        components: [
          {
            internalType: "bool",
            name: "success",
            type: "bool",
          },
          {
            internalType: "bytes",
            name: "returnData",
            type: "bytes",
          },
        ],
        internalType: "struct Multicall3.Result[]",
        name: "returnData",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Batch check ownership for multiple NFTs using Multicall3
 * This reduces N individual RPC calls to 1 single RPC call per batch
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
    abi: MULTICALL3_ABI,
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

    try {
      // Call Multicall3's tryAggregate using proper ABI
      const multicallResult = await readContract({
        contract: multicall3,
        method: "tryAggregate",
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
    } catch {
      // If batch fails, mark all tokens in batch with empty owner
      batchTokenIds.forEach((tokenId) => {
        results.push({ tokenId, owner: "" });
      });
    }
  }

  return results;
}
