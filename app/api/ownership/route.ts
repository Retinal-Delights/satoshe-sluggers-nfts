// app/api/ownership/route.ts

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

import { batchCheckOwnership } from "@/lib/multicall3";

const TOTAL_NFTS = 7777;

const NFT_COLLECTION_ADDRESS =
  process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS!;
const MARKETPLACE_ADDRESS =
  process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS?.toLowerCase();
const THIRDWEB_CLIENT_ID =
  process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!;

const CACHE_LIFETIME_MS = 5 * 60 * 1000; // 5 min

// ---- Cache path (Vercel & local safe) ----
function getCachePath() {
  if (process.env.VERCEL) {
    return path.join(os.tmpdir(), "ownership.json");
  }
  return path.join(process.cwd(), ".next/cache/ownership.json");
}

const CACHE_PATH = getCachePath();

// -----------------------------------------------------------
// GET /api/ownership
// -----------------------------------------------------------
export async function GET() {
  try {
    // ENV validation
    if (!NFT_COLLECTION_ADDRESS || !THIRDWEB_CLIENT_ID || !MARKETPLACE_ADDRESS) {
      return NextResponse.json(
        { error: "Missing env vars: THIRDWEB_CLIENT_ID, NFT_COLLECTION_ADDRESS, or NEXT_PUBLIC_MARKETPLACE_ADDRESS" },
        { status: 500 }
      );
    }

    // Validate marketplace address format
    if (!MARKETPLACE_ADDRESS.startsWith("0x") || MARKETPLACE_ADDRESS.length !== 42) {
      return NextResponse.json(
        { error: `Invalid marketplace address format: ${MARKETPLACE_ADDRESS}. Expected 42-character hex string starting with 0x.` },
        { status: 500 }
      );
    }

    // ---- Serve valid cached version (if fresh) ----
    if (fs.existsSync(CACHE_PATH)) {
      const stat = fs.statSync(CACHE_PATH);
      const age = Date.now() - stat.mtimeMs;

      if (age < CACHE_LIFETIME_MS) {
        const cached = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
        return NextResponse.json(cached, {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
          },
        });
      }
    }

    // ---- Fresh ownership resolution via multicall ----
    const tokenIds = Array.from({ length: TOTAL_NFTS }, (_, i) => i);

    const results = await batchCheckOwnership(
      NFT_COLLECTION_ADDRESS,
      tokenIds
    );

    // Debug: Check if we got any results and sample them
    if (process.env.NODE_ENV === "development" && results.length > 0) {
      console.log(`[Ownership API] Multicall3 returned ${results.length} results`);
      console.log(`[Ownership API] Sample raw results (first 5):`, results.slice(0, 5));
    }

    // Convert to ACTIVE / SOLD records
    // ACTIVE = owned by marketplace (available for sale)
    // SOLD = owned by any other wallet (not available for sale)
    const ownership = results.map(({ tokenId, owner }: { tokenId: number; owner: string }) => {
      // Normalize both owner and marketplace address for comparison
      const normalizedOwner = owner?.toLowerCase?.().trim() ?? "";
      const normalizedMarketplace = MARKETPLACE_ADDRESS?.toLowerCase?.().trim() ?? "";
      const isActive = normalizedOwner === normalizedMarketplace && normalizedOwner.length > 0;
      return {
        tokenId,
        owner: normalizedOwner,
        status: isActive ? "ACTIVE" : "SOLD",
      };
    });

    // Log summary for debugging (only in development)
    if (process.env.NODE_ENV === "development") {
      const activeCount = ownership.filter(o => o.status === "ACTIVE").length;
      const soldCount = ownership.filter(o => o.status === "SOLD").length;
      console.log(`[Ownership API] Processed ${ownership.length} NFTs: ${activeCount} ACTIVE, ${soldCount} SOLD`);
      console.log(`[Ownership API] Marketplace address: ${MARKETPLACE_ADDRESS}`);
      
      // Sample a few owners to help debug
      const sampleOwners = ownership.slice(0, 10).map(o => ({ 
        tokenId: o.tokenId, 
        owner: o.owner, 
        status: o.status,
        matches: o.owner === MARKETPLACE_ADDRESS
      }));
      console.log(`[Ownership API] Sample owners (first 10):`, sampleOwners);
      
      // Find any ACTIVE NFTs to see what their owners look like
      const activeNFTs = ownership.filter(o => o.status === "ACTIVE").slice(0, 5);
      if (activeNFTs.length > 0) {
        console.log(`[Ownership API] Sample ACTIVE NFTs:`, activeNFTs);
      }
      
      // Warn if all are SOLD (likely configuration issue)
      if (activeCount === 0 && ownership.length > 0) {
        console.warn(`[Ownership API] ⚠️ WARNING: All NFTs marked as SOLD. Check marketplace address: ${MARKETPLACE_ADDRESS}`);
        console.warn(`[Ownership API] First 10 owners:`, ownership.slice(0, 10).map(o => o.owner));
        console.warn(`[Ownership API] Marketplace address (normalized): "${MARKETPLACE_ADDRESS}"`);
        console.warn(`[Ownership API] First owner (normalized): "${ownership[0]?.owner}"`);
        console.warn(`[Ownership API] Match check: ${ownership[0]?.owner === MARKETPLACE_ADDRESS}`);
      }
    }

    // ---- Write to cache ----
    try {
      const dir = path.dirname(CACHE_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(CACHE_PATH, JSON.stringify(ownership), "utf8");
    } catch {
      // Cache write failed - continue without caching
    }

    return NextResponse.json(ownership, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });

  } catch (err) {
    const msg =
      err instanceof Error ? err.message : String(err);

    // ---- fallback to stale cache if exists ----
    if (fs.existsSync(CACHE_PATH)) {
      const cached = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
      return NextResponse.json(cached, {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      });
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
