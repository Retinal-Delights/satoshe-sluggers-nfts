/**
 * NFT Aggregate Counts API Route
 * Counts sold NFTs using Transfer events from the blockchain.
 * Always caches results for 1 minute to avoid excess RPC pressure.
 */

import { NextRequest, NextResponse } from "next/server";
import { base } from "thirdweb/chains";
import { getContract, getContractEvents, prepareEvent } from "thirdweb";
import { client } from "@/lib/thirdweb";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS;
const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS?.toLowerCase();
const TOTAL_NFTS = 7777;

const cache: {
  data: { liveCount: number; soldCount: number; cached: boolean } | null;
  timestamp: number;
} = { data: null, timestamp: 0 };

const CACHE_EXPIRY = 1 * 60 * 1000; // 1 minute (reduced from 10 for faster updates)

export async function GET(request: NextRequest) {
  try {
    const now = Date.now();
    // Check for cache-busting query param
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('forceRefresh') === 'true';
    
    // Clear cache if force refresh is requested
    if (forceRefresh) {
      cache.data = null;
      cache.timestamp = 0;
    }
    
    if (!forceRefresh && cache.data && now - cache.timestamp < CACHE_EXPIRY) {
      return NextResponse.json({ ...cache.data, cached: true });
    }

    if (!CONTRACT_ADDRESS || !MARKETPLACE_ADDRESS) {
      return NextResponse.json(
        { error: "Missing required environment variables" },
        { status: 500 }
      );
    }

    // Get contract instance
    const contract = getContract({
      client,
      chain: base,
      address: CONTRACT_ADDRESS,
    });

    let soldCount = 0;

    try {
      // Fetch Transfer events where from_address is the marketplace
      // This indicates tokens that were sold from the marketplace
      const transferEvent = prepareEvent({
        signature: "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
      });
      
      const allTransferEvents = await getContractEvents({
        contract,
        events: [transferEvent],
      });
      
      // Filter events where from is the marketplace
      const transferEvents = allTransferEvents.filter((event) => {
        const args = event.args as { from?: string } | undefined;
        const from = args?.from ? String(args.from).toLowerCase() : "";
        return from === MARKETPLACE_ADDRESS;
      });

      // Count unique tokenIds that were transferred from marketplace
      const tokenSet = new Set<string>();
      if (Array.isArray(transferEvents)) {
        transferEvents.forEach((event) => {
          const args = event.args as { tokenId?: bigint | string | number } | undefined;
          const tokenId = args?.tokenId;
          if (tokenId !== undefined) {
            const tokenIdStr = typeof tokenId === "bigint" ? tokenId.toString() : String(tokenId);
            tokenSet.add(tokenIdStr);
          }
        });
      }
      soldCount = tokenSet.size;
    } catch {
      // If event fetching fails, return cached data or default
      if (cache.data) return NextResponse.json({ ...cache.data, cached: true });
      return NextResponse.json({ liveCount: TOTAL_NFTS, soldCount: 0, cached: false });
    }

    const liveCount = Math.max(0, TOTAL_NFTS - soldCount);

    const result = { liveCount, soldCount, cached: false };
    
    // Only cache if not a force refresh (to allow fresh data on purchase events)
    if (!forceRefresh) {
      cache.data = result;
      cache.timestamp = now;
    }

    return NextResponse.json(result);

  } catch {
    if (cache.data) return NextResponse.json({ ...cache.data, cached: true });
    return NextResponse.json({ liveCount: TOTAL_NFTS, soldCount: 0, cached: false });
  }
}
