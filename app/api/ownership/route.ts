// app/api/ownership/route.ts

import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

import { getAllOwnershipsWithFallback } from "@/lib/insight-service";

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
    if (!NFT_COLLECTION_ADDRESS || !MARKETPLACE_ADDRESS || !THIRDWEB_CLIENT_ID) {
      return NextResponse.json(
        { error: "Missing env vars: THIRDWEB_CLIENT_ID, NFT_COLLECTION_ADDRESS, or NEXT_PUBLIC_MARKETPLACE_ADDRESS" },
        { status: 500 }
      );
    }

    // ---- Serve valid cached version (if fresh) ----
    try {
      const stat = await fs.stat(CACHE_PATH);
      const age = Date.now() - stat.mtimeMs;

      if (age < CACHE_LIFETIME_MS) {
        const cachedContent = await fs.readFile(CACHE_PATH, "utf8");
        try {
          const cached = JSON.parse(cachedContent);
          return NextResponse.json(cached, {
            headers: {
              "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
            },
          });
        } catch {
          // JSON parse failed - cache file corrupted, continue to fetch fresh data
        }
      }
    } catch {
      // Cache file doesn't exist or is invalid - continue to fetch fresh data
    }

    // ---- Fresh ownership resolution via Insight API (with Multicall3 fallback) ----
    // Insight API: 1 API call for all 7,777 NFTs (98.7% reduction vs Multicall3)
    // Falls back to Multicall3 if Insight API is unavailable
    const results = await getAllOwnershipsWithFallback(
      NFT_COLLECTION_ADDRESS,
      TOTAL_NFTS
    );

    // Convert to ACTIVE / SOLD records
    const ownership = results.map(({ tokenId, owner }) => {
      const normalized = owner?.toLowerCase?.() ?? "";
      return {
        tokenId,
        owner: normalized,
        status:
          normalized === MARKETPLACE_ADDRESS ? "ACTIVE" : "SOLD",
      };
    });

    // ---- Write to cache ----
    try {
      const dir = path.dirname(CACHE_PATH);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(CACHE_PATH, JSON.stringify(ownership), "utf8");
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
    
    console.error("Ownership API error:", err);

    // ---- fallback to stale cache if exists ----
    try {
      const cachedContent = await fs.readFile(CACHE_PATH, "utf8");
      try {
        const cached = JSON.parse(cachedContent);
        return NextResponse.json(cached, {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
          },
        });
      } catch {
        // JSON parse failed - cache corrupted, return error
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    } catch {
      // Cache read failed - return error
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }
}
