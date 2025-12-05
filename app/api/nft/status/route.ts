/**
 * NFT Status API Route
 * Determines ACTIVE/SOLD status by checking for active listings on the marketplace.
 * ACTIVE = Has an active listing on the marketplace (available for sale)
 * SOLD = No active listing (either unlisted or sold to a buyer)
 * 
 * This uses the marketplace contract's getAllValidListings() to check for active listings,
 * which is the correct approach for non-custodial marketplaces (NFTs stay in owner's wallet).
 */

import { NextResponse } from "next/server";
import { getActiveListings } from "@/lib/marketplace-listings";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS;
const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS?.toLowerCase();
const TOTAL_NFTS = 7777;

// In-memory cache
const cache: {
  data: {
    all: number;
    live: number;
    sold: number;
    statusByTokenId: Record<string, "ACTIVE" | "SOLD">;
  } | null;
  timestamp: number;
} = { data: null, timestamp: 0 };

const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    const now = Date.now();
    
    // Check cache first
    if (cache.data && now - cache.timestamp < CACHE_EXPIRY) {
      return NextResponse.json(cache.data, {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      });
    }

    if (!CONTRACT_ADDRESS || !MARKETPLACE_ADDRESS) {
      // Return default if cache exists, otherwise error
      if (cache.data) {
        return NextResponse.json(cache.data, {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
          },
        });
      }
      return NextResponse.json(
        { error: "Missing required environment variables" },
        { status: 500 }
      );
    }

    // Fetch active listings from marketplace
    // This is the correct approach for non-custodial marketplaces
    // NFTs stay in owner's wallet, but are listed on the marketplace contract
    let activeListings: Set<number>;
    try {
      activeListings = await getActiveListings();
    } catch (error) {
      console.error("[NFT Status API] Error fetching active listings:", error);
      // Return cached data if available, otherwise return default
      if (cache.data) {
        return NextResponse.json(cache.data, {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
          },
        });
      }
      // Return default: all ACTIVE (optimistic - assume all are listed)
      const defaultStatus: Record<string, "ACTIVE" | "SOLD"> = {};
      for (let i = 0; i < TOTAL_NFTS; i++) {
        defaultStatus[i.toString()] = "ACTIVE";
      }
      const defaultData = {
        all: TOTAL_NFTS,
        live: TOTAL_NFTS,
        sold: 0,
        statusByTokenId: defaultStatus,
      };
      return NextResponse.json(defaultData, {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      });
    }

    // Build status map based on active listings
    // ACTIVE = has an active listing on marketplace (available for sale)
    // SOLD = no active listing (either unlisted or sold to a buyer)
    const statusByTokenId: Record<string, "ACTIVE" | "SOLD"> = {};
    let soldCount = 0;
    
    for (let i = 0; i < TOTAL_NFTS; i++) {
      if (activeListings.has(i)) {
        // Has active listing → ACTIVE
        statusByTokenId[i.toString()] = "ACTIVE";
      } else {
        // No active listing → SOLD
        statusByTokenId[i.toString()] = "SOLD";
        soldCount++;
      }
    }
    
    const live = TOTAL_NFTS - soldCount;
    const sold = soldCount;

    const result = {
      all: TOTAL_NFTS,
      live,
      sold,
      statusByTokenId,
    };

    // Update cache
    cache.data = result;
    cache.timestamp = now;

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });

  } catch {
    // Return cached data if available
    if (cache.data) {
      return NextResponse.json(cache.data, {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      });
    }
    
    // Return default: all ACTIVE
    const defaultStatus: Record<string, "ACTIVE" | "SOLD"> = {};
    for (let i = 0; i < TOTAL_NFTS; i++) {
      defaultStatus[i.toString()] = "ACTIVE";
    }
    const defaultData = {
      all: TOTAL_NFTS,
      live: TOTAL_NFTS,
      sold: 0,
      statusByTokenId: defaultStatus,
    };
    return NextResponse.json(defaultData, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  }
}

