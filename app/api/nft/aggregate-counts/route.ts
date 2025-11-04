// app/api/nft/aggregate-counts/route.ts
/**
 * NFT Aggregate Counts API Route
 * Uses Thirdweb Insight events API to get Live/Sold counts without checking all 7,777 NFTs
 * Caches results for 10 minutes to prevent excessive API calls
 */

import { NextRequest, NextResponse } from "next/server";
import { base } from "thirdweb/chains";

const INSIGHT_CLIENT_ID = process.env.NEXT_PUBLIC_INSIGHT_CLIENT_ID || process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS;
const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS?.toLowerCase();
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

    if (!INSIGHT_CLIENT_ID || !CONTRACT_ADDRESS || !MARKETPLACE_ADDRESS) {
      return NextResponse.json(
        { error: "Missing required environment variables" },
        { status: 500 }
      );
    }

    const CHAIN_ID = base.id; // 8453 for Base

    // Use Insight events API to count Transfer events
    // Transfer events FROM the marketplace address indicate sales (marketplace transfers NFT to buyer)
    // Correct format: insight.thirdweb.com with chain as query parameter
    // Use from_address (not filter_from_address or fromAddresses) for sender address filtering
    const apiUrl = `https://insight.thirdweb.com/v1/events/${CONTRACT_ADDRESS}/Transfer(address,address,uint256)?chain=${CHAIN_ID}&from_address=${MARKETPLACE_ADDRESS}&limit=10000`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'x-client-id': INSIGHT_CLIENT_ID,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Log error for debugging (in development)
      const errorText = await response.text();
      if (process.env.NODE_ENV === 'development') {
        console.error('Insight API error:', response.status, errorText);
      }
      
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
    
    // Extract count from aggregations if using aggregate endpoint
    // Otherwise fall back to counting events (for backwards compatibility)
    let soldCount = 0;
    
    if (data.aggregations && Array.isArray(data.aggregations) && data.aggregations.length > 0) {
      // Use aggregate count if available (more efficient)
      soldCount = data.aggregations[0].count || 0;
    } else if (data.data && Array.isArray(data.data)) {
      // Fallback: Count unique token IDs from events
      const soldTokenIds = new Set<string>();
      data.data.forEach((event: any) => {
        const tokenId = event.args?.tokenId || event.token_id;
        if (tokenId !== undefined) {
          soldTokenIds.add(tokenId.toString());
        }
      });
      soldCount = soldTokenIds.size;
    }

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
  } catch (error) {
    // Log error for debugging (in development)
    if (process.env.NODE_ENV === 'development') {
      console.error('Aggregate counts API error:', error);
    }
    
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

