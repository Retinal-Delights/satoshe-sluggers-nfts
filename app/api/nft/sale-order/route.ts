/**
 * NFT Sale Order API Route
 * Returns the order NFTs were sold (most recent first) using Transfer events.
 * Caches results for 5 minutes to avoid excess RPC pressure.
 */

import { NextResponse } from "next/server";
import { base } from "thirdweb/chains";
import { getContract, getContractEvents, prepareEvent } from "thirdweb";
import { client } from "@/lib/thirdweb";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS;
const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS?.toLowerCase();
const TOTAL_NFTS = 7777;

const cache: {
  data: { saleOrder: number[] } | null; // Array of tokenIds in sale order (most recent first)
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

    try {
      // Fetch Transfer events where from_address is the marketplace
      // This indicates tokens that were sold from the marketplace
      // Note: This may be slow on first load as it fetches all events via RPC
      const transferEvent = prepareEvent({
        signature: "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
      });
      
      // NOTE: Insight API errors are expected and harmless
      // Thirdweb SDK v5 tries Insight API first (deprecated), fails with 401, then automatically falls back to RPC
      // The error messages in console are from SDK's internal logging - we cannot suppress them
      // This is documented behavior: https://portal.thirdweb.com/changelog/deprecation-notice-insight-service-endpoints
      // The SDK handles the fallback automatically, so functionality works correctly
      const allTransferEvents = await getContractEvents({
        contract,
        events: [transferEvent],
      });
      
      // Filter events where from is the marketplace (actual sales)
      const saleEvents = allTransferEvents.filter((event) => {
        const args = event.args as { from?: string } | undefined;
        const from = args?.from ? String(args.from).toLowerCase() : "";
        return from === MARKETPLACE_ADDRESS;
      });

      // Extract tokenIds and block numbers
      // Events are typically returned in chronological order (oldest first), so we'll reverse for most recent first
      const saleData: Array<{ tokenId: number; blockNumber: number; index: number }> = [];
      
      if (Array.isArray(saleEvents)) {
        saleEvents.forEach((event, index) => {
          const args = event.args as { tokenId?: bigint | string | number } | undefined;
          const tokenId = args?.tokenId;
          const blockNumber = (event as { blockNumber?: bigint | number }).blockNumber 
            ? Number((event as { blockNumber: bigint | number }).blockNumber) 
            : 0;
          
          if (tokenId !== undefined) {
            const tokenIdNum = typeof tokenId === "bigint" ? Number(tokenId) : typeof tokenId === "string" ? parseInt(tokenId) : Number(tokenId);
            if (!isNaN(tokenIdNum) && tokenIdNum >= 0 && tokenIdNum < TOTAL_NFTS) {
              saleData.push({ tokenId: tokenIdNum, blockNumber, index });
            }
          }
        });
      }

      // Sort by block number (descending) - most recent sales first
      // If block numbers are unavailable or same, use reverse index order (most recent events are at end of array)
      saleData.sort((a, b) => {
        if (a.blockNumber > 0 && b.blockNumber > 0 && a.blockNumber !== b.blockNumber) {
          return b.blockNumber - a.blockNumber; // Descending (higher block = more recent)
        }
        // If block numbers unavailable, use reverse index (higher index = more recent)
        return b.index - a.index;
      });

      // Extract just the tokenIds in order (most recent first)
      const saleOrder = saleData.map(item => item.tokenId);

      // Remove duplicates (keep first occurrence = most recent)
      const uniqueSaleOrder = Array.from(new Set(saleOrder));

      const result = { saleOrder: uniqueSaleOrder };

      // Cache the result
      cache.data = result;
      cache.timestamp = now;

      return NextResponse.json(result, {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      });
    } catch (error) {
      // If event fetching fails (e.g., RPC timeout), return cached data or empty array
      // This is non-critical - only affects "Sold: Most Recent" sorting
      if (process.env.NODE_ENV === "development") {
        console.warn("[Sale Order API] Event fetch failed, using cache or empty:", error instanceof Error ? error.message : String(error));
      }
      
      if (cache.data) {
        return NextResponse.json(cache.data, {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
          },
        });
      }
      return NextResponse.json({ saleOrder: [] });
    }
  } catch (error) {
    // Return cached data if available, otherwise empty array
    if (process.env.NODE_ENV === "development") {
      console.error("[Sale Order API] Fatal error:", error instanceof Error ? error.message : String(error));
    }
    
    if (cache.data) {
      return NextResponse.json(cache.data);
    }
    return NextResponse.json({ saleOrder: [] });
  }
}

