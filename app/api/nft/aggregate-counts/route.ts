// app/api/nft/aggregate-counts/route.ts
/**
 * NFT Aggregate Counts API Route
 * Uses Thirdweb Insight events API to get Live/Sold counts without checking all 7,777 NFTs
 * Caches results for 10 minutes to prevent excessive API calls
 */

import { NextRequest, NextResponse } from "next/server";
import { base } from "thirdweb/chains";

const CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS;
const CREATOR_ADDRESS = process.env.NEXT_PUBLIC_CREATOR_ADDRESS?.toLowerCase();
const TOTAL_NFTS = 7777;

// In-memory cache (in production, use Redis or similar)
const cache: {
  data: { liveCount: number; soldCount: number } | null;
  timestamp: number;
} = { data: null, timestamp: 0 };

const CACHE_EXPIRY = 10 * 60 * 1000; // 10 minutes

export async function GET(request: NextRequest) {
  try {
    // Check cache first
    const now = Date.now();
    if (cache.data && now - cache.timestamp < CACHE_EXPIRY) {
      return NextResponse.json(cache.data);
    }

    if (!CLIENT_ID || !CONTRACT_ADDRESS || !CREATOR_ADDRESS) {
      return NextResponse.json(
        { error: "Missing required environment variables" },
        { status: 500 }
      );
    }

    const CHAIN_ID = base.id; // 8453 for Base

    // Use Insight events API to count Transfer events
    // Transfer events from creator address indicate sales
    // We'll count total transfers to determine sold count
    const response = await fetch(
      `https://${CHAIN_ID}.insight.thirdweb.com/v1/events/${CONTRACT_ADDRESS}/Transfer(address,address,uint256)?filter_from_address=${CREATOR_ADDRESS}&limit=10000`,
      {
        headers: {
          'x-client-id': CLIENT_ID,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      // If Insight API fails, return conservative estimates
      // Use cached data if available, otherwise return defaults
      if (cache.data) {
        return NextResponse.json(cache.data);
      }
      return NextResponse.json({
        liveCount: TOTAL_NFTS,
        soldCount: 0,
        cached: false,
      });
    }

    const data = await response.json();
    
    // Count unique token IDs that have been transferred (sold)
    const soldTokenIds = new Set<string>();
    if (data.data && Array.isArray(data.data)) {
      data.data.forEach((event: any) => {
        // Extract tokenId from event data
        const tokenId = event.args?.tokenId || event.token_id;
        if (tokenId !== undefined) {
          soldTokenIds.add(tokenId.toString());
        }
      });
    }

    const soldCount = soldTokenIds.size;
    const liveCount = TOTAL_NFTS - soldCount;

    const result = {
      liveCount,
      soldCount,
      cached: false,
    };

    // Update cache
    cache.data = result;
    cache.timestamp = now;

    return NextResponse.json(result);
  } catch {
    // Return cached data if available, otherwise defaults
    if (cache.data) {
      return NextResponse.json({ ...cache.data, cached: true });
    }
    return NextResponse.json({
      liveCount: TOTAL_NFTS,
      soldCount: 0,
      cached: false,
    });
  }
}

