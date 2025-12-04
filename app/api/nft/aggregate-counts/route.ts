/**
 * NFT Aggregate Counts API Route
 * Counts sold NFTs using Transfer events from the blockchain.
 * Always caches results for 1 minute to avoid excess RPC pressure.
 */

import { NextRequest, NextResponse } from "next/server";
import { getTransferEventsFrom } from "@/lib/hybrid-events";

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

    let soldCount = 0;

    try {
      // Fetch Transfer events using Thirdweb SDK only
      // This queries events where 'from' is the marketplace address (actual sales)
      // Thirdweb SDK handles all RPC internally using client ID
      const transferEvents = await getTransferEventsFrom(
        CONTRACT_ADDRESS,
        MARKETPLACE_ADDRESS
      );

      // Count unique tokenIds that were transferred from marketplace
      const tokenSet = new Set<string>();
      transferEvents.forEach((event) => {
        const tokenIdStr = event.tokenId.toString();
        tokenSet.add(tokenIdStr);
      });
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
