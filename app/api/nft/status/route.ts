/**
 * NFT Status API Route
 * Fetches all Transfer events from the ERC-721 contract to determine ACTIVE/SOLD status for each tokenId.
 * This is the single source of truth for NFT status.
 */

import { NextResponse } from "next/server";
import { getTransferEventsHybrid } from "@/lib/hybrid-events";

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

    // Fetch ALL Transfer events using Thirdweb SDK only
    // We need all transfers to determine which tokens have been sold
    // Thirdweb SDK handles all RPC internally using client ID
    let transferEvents;
    try {
      const allEvents = await getTransferEventsHybrid(CONTRACT_ADDRESS);
      
      // Convert to format expected by rest of code
      transferEvents = allEvents.map((event) => ({
        args: {
          from: event.from,
          to: event.to,
          tokenId: event.tokenId,
        },
        blockNumber: BigInt(event.blockNumber),
      }));
    } catch {
      // Return cached data if available, otherwise return default
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
    
    // Track which tokens have been transferred to a non-zero, non-marketplace address
    // A token is SOLD if it has EVER been transferred to a non-zero address that is not the marketplace
    // UNLESS the current owner is the marketplace contract (then it's ACTIVE again)
    const tokensEverSold = new Set<number>();
    const latestTransfer = new Map<number, string>(); // tokenId -> latest "to" address
    
    if (Array.isArray(transferEvents)) {
      transferEvents.forEach((event) => {
        // Extract data from Thirdweb SDK event format
        const tokenIdNum = Number(event.args.tokenId);
        const to = event.args.to.toLowerCase();
        
        if (!isNaN(tokenIdNum) && tokenIdNum >= 0 && tokenIdNum < TOTAL_NFTS) {
          // Track latest transfer destination
          latestTransfer.set(tokenIdNum, to);
          
          // If transferred to a non-zero address that is not the marketplace, mark as ever sold
          if (to !== "0x0000000000000000000000000000000000000000" && to !== MARKETPLACE_ADDRESS) {
            tokensEverSold.add(tokenIdNum);
          }
        }
      });
    }

    // Now check current ownership for tokens that were ever sold
    // If current owner is marketplace, they're ACTIVE again (relisted)
    const currentOwners = new Map<number, string>();
    if (tokensEverSold.size > 0) {
      // Fetch current ownership for tokens that were ever sold using Multicall3
      const tokenIdsToCheck = Array.from(tokensEverSold);
      const { batchCheckOwnership } = await import("@/lib/multicall3");
      
      try {
        const ownershipResults = await batchCheckOwnership(CONTRACT_ADDRESS, tokenIdsToCheck);
        ownershipResults.forEach(({ tokenId, owner }) => {
          currentOwners.set(tokenId, owner.toLowerCase());
        });
      } catch {
        // If batch check fails, use latest transfer as fallback
        // This is acceptable as it's a best-effort check
      }
    }

    // Build status map
    const statusByTokenId: Record<string, "ACTIVE" | "SOLD"> = {};
    let soldCount = 0;
    
    for (let i = 0; i < TOTAL_NFTS; i++) {
      if (tokensEverSold.has(i)) {
        // Token was ever sold - check if current owner is marketplace
        const currentOwner = currentOwners.get(i) || latestTransfer.get(i) || "";
        if (currentOwner === MARKETPLACE_ADDRESS) {
          // Re-listed, so ACTIVE
          statusByTokenId[i.toString()] = "ACTIVE";
        } else {
          // Still sold
          statusByTokenId[i.toString()] = "SOLD";
          soldCount++;
        }
      } else {
        // Never sold, so ACTIVE
        statusByTokenId[i.toString()] = "ACTIVE";
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

