// app/api/ownership/route.ts

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

import { batchCheckOwnership } from "@/lib/multicall3";

const TOTAL_NFTS = 7777;
const LISTING_OWNER_ADDRESS =
  "0xD3aaf32FfBFFaF3Fc35aCA6bfcC487f83c6a17Ec".toLowerCase();

const NFT_COLLECTION_ADDRESS =
  process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS!;
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
    if (!NFT_COLLECTION_ADDRESS || !THIRDWEB_CLIENT_ID) {
      return NextResponse.json(
        { error: "Missing env vars: THIRDWEB_CLIENT_ID or NFT_COLLECTION_ADDRESS" },
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

    // Convert to ACTIVE / SOLD records
    const ownership = results.map(({ tokenId, owner }: { tokenId: number; owner: string }) => {
      const normalized = owner?.toLowerCase?.() ?? "";
      return {
        tokenId,
        owner: normalized,
        status:
          normalized === LISTING_OWNER_ADDRESS ? "ACTIVE" : "SOLD",
      };
    });

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
