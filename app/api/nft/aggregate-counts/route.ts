/**
 * NFT Aggregate Counts API Route
 * Counts sold NFTs using the Insight aggregate endpoint for speed and reliability.
 * Always caches results for 10 minutes to avoid excess API pressure.
 */

import { NextRequest, NextResponse } from "next/server";
import { base } from "thirdweb/chains";

const INSIGHT_CLIENT_ID = process.env.NEXT_PUBLIC_INSIGHT_CLIENT_ID || process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
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

    if (!INSIGHT_CLIENT_ID || !CONTRACT_ADDRESS || !MARKETPLACE_ADDRESS) {
      return NextResponse.json(
        { error: "Missing required environment variables" },
        { status: 500 }
      );
    }

    const CHAIN_ID = base.id;
    const apiUrl = `https://insight.thirdweb.com/v1/events/${CONTRACT_ADDRESS}/Transfer(address,address,uint256)?chain=${CHAIN_ID}&from_address=${MARKETPLACE_ADDRESS}&aggregate=count()`;

    const response = await fetch(apiUrl, {
      headers: {
        "x-client-id": INSIGHT_CLIENT_ID,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (cache.data) return NextResponse.json({ ...cache.data, cached: true });
      return NextResponse.json({ liveCount: TOTAL_NFTS, soldCount: 0, cached: false });
    }

    const data = await response.json();
    let soldCount = 0;

    if (
      data.aggregations &&
      Array.isArray(data.aggregations) &&
      data.aggregations.length > 0 &&
      typeof data.aggregations[0].count === "number"
    ) {
      soldCount = data.aggregations[0].count;
    } else if (data.data && Array.isArray(data.data)) {
      const tokenSet = new Set<string>();
      data.data.forEach((event: any) => {
        const tokenId = event.args?.tokenId || event.token_id;
        if (tokenId !== undefined) tokenSet.add(tokenId.toString());
      });
      soldCount = tokenSet.size;
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
