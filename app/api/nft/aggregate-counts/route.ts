/**
 * NFT Aggregate Counts API Route
 * Counts live/sold NFTs by checking for active listings on the marketplace.
 * liveCount = NFTs with active listings (available for sale)
 * soldCount = NFTs without active listings (either unlisted or sold)
 * 
 * This uses the marketplace contract's getAllValidListings() to check for active listings,
 * which is the correct approach for non-custodial marketplaces.
 */

import { NextRequest, NextResponse } from "next/server";
import { getActiveListings } from "@/lib/marketplace-listings";

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

    let liveCount = 0;
    let soldCount = 0;

    try {
      // Fetch active listings from marketplace
      // This is the correct approach for non-custodial marketplaces
      const activeListings = await getActiveListings();
      liveCount = activeListings.size;
      soldCount = Math.max(0, TOTAL_NFTS - liveCount);
    } catch (error) {
      console.error("[Aggregate Counts API] Error fetching active listings:", error);
      // If fetching fails, return cached data or default
      if (cache.data) return NextResponse.json({ ...cache.data, cached: true });
      return NextResponse.json({ liveCount: TOTAL_NFTS, soldCount: 0, cached: false });
    }

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
