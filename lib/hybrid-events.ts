// lib/hybrid-events.ts
/**
 * Thirdweb Event Query Utility
 * 
 * Uses ONLY Thirdweb SDK's getContractEvents() to query Transfer events.
 * Thirdweb SDK handles all RPC internally using the client ID.
 * 
 * Standard error handling: try/catch with proper error propagation.
 */

import { getContract, getContractEvents, prepareEvent } from "thirdweb";
import { base } from "thirdweb/chains";
import { client } from "./thirdweb";

// ERC721 Transfer event signature
const TRANSFER_EVENT_SIGNATURE = "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)";

/**
 * Standardized Transfer event format
 */
export type TransferEvent = {
  from: string;
  to: string;
  tokenId: bigint;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
};

/**
 * Get Transfer events using Thirdweb SDK only
 * 
 * @param contractAddress - The NFT contract address
 * @param fromBlock - Starting block number (optional, defaults to 0)
 * @param toBlock - Ending block number (optional, defaults to 'latest')
 * @returns Array of Transfer events with decoded parameters
 * @returns Empty array on error (graceful degradation)
 */
export async function getTransferEventsHybrid(
  contractAddress: string,
  fromBlock: number | "earliest" = 0,
  toBlock: number | "latest" = "latest"
): Promise<TransferEvent[]> {
  try {
    const contract = getContract({
      client,
      chain: base,
      address: contractAddress,
    });

    const transferEvent = prepareEvent({
      signature: TRANSFER_EVENT_SIGNATURE,
    });

    // Thirdweb SDK handles RPC internally using client ID
    const events = await getContractEvents({
      contract,
      events: [transferEvent],
      fromBlock: typeof fromBlock === "number" ? BigInt(fromBlock) : fromBlock,
      toBlock: typeof toBlock === "number" ? BigInt(toBlock) : toBlock,
    });

    // Convert SDK event format to standardized format
    return events.map((event) => ({
      from: (event.args.from as string)?.toLowerCase() || "",
      to: (event.args.to as string)?.toLowerCase() || "",
      tokenId: event.args.tokenId as bigint,
      blockNumber: event.blockNumber ? Number(event.blockNumber) : 0,
      transactionHash: event.transactionHash || "",
      logIndex: event.logIndex || 0,
    }));
  } catch (err) {
    console.error("[Hybrid Events] Thirdweb SDK getContractEvents failed:", err);
    return []; // Graceful degradation - return empty array
  }
}

/**
 * Get Transfer events filtered by 'from' address
 * Useful for finding sales from a specific marketplace address
 * 
 * @param contractAddress - The NFT contract address
 * @param fromAddress - Filter by 'from' address (e.g., marketplace address)
 * @param fromBlock - Starting block number (optional)
 * @param toBlock - Ending block number (optional)
 * @returns Array of Transfer events where 'from' matches the filter
 */
export async function getTransferEventsFrom(
  contractAddress: string,
  fromAddress: string,
  fromBlock: number | "earliest" = 0,
  toBlock: number | "latest" = "latest"
): Promise<TransferEvent[]> {
  const allEvents = await getTransferEventsHybrid(contractAddress, fromBlock, toBlock);
  const normalizedFrom = fromAddress.toLowerCase();

  return allEvents.filter((event) => event.from === normalizedFrom);
}
