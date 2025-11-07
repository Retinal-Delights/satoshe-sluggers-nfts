import { getContract, createThirdwebClient } from "thirdweb";

import { defineChain } from "thirdweb/chains";

import {

  getAllListings,

  DirectListingV3,

} from "thirdweb/extensions/marketplace";

import { ownerOf } from "thirdweb/extensions/erc721";

import dotenv from "dotenv";

import fs from "fs";

import path from "path";

// Load from .env.local (Next.js default) or .env as fallback

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

dotenv.config({ path: path.resolve(process.cwd(), ".env") }); // Fallback to .env



// ========== USER SETTINGS ==========

// SECURITY: No fallbacks - fail hard if env vars are missing
const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS;

const NFT_COLLECTION_ADDRESS = process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS;

if (!MARKETPLACE_ADDRESS || !NFT_COLLECTION_ADDRESS) {
  throw new Error(
    "SECURITY ERROR: Missing required environment variables. " +
    "Please set NEXT_PUBLIC_MARKETPLACE_ADDRESS and NEXT_PUBLIC_NFT_COLLECTION_ADDRESS. " +
    "No fallbacks allowed."
  );
}

const chain = defineChain(8453);

const THIRDWEB_SECRET_KEY = process.env.THIRDWEB_SECRET_KEY;

const CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

// -----> Set the range to scan below (inclusive)

const TOKEN_ID_START = 0; // Lowest tokenId

const TOKEN_ID_END = 199; // Highest tokenId (e.g. 199 for IDs 0–199)

const OUTPUT_DIR = path.join(process.cwd(), "docs", "nfts");

const OUTPUT_BASENAME = `listing_status_tokens_${TOKEN_ID_START}-${TOKEN_ID_END}`;

const OUTPUT_JSON = path.join(OUTPUT_DIR, `${OUTPUT_BASENAME}.json`);

const OUTPUT_CSV = path.join(OUTPUT_DIR, `${OUTPUT_BASENAME}.csv`);

const SLEEP_MS_BETWEEN_OWNEROF = 30; // 30ms per call = ~33/sec (well under your 200/sec limit)



function sleep(ms: number) {

  return new Promise((res) => setTimeout(res, ms));

}

// Helper to check if a listing is valid and available

function isValidListing(listing: any): boolean {

  // Check if it's a direct listing (type 0 or undefined)

  const listingType = listing.type ?? listing.listingType;

  const isDirectListing = listingType === 0 || listingType === undefined;

  // Check if status is ACTIVE (1 or "ACTIVE")

  const status = listing.status;

  const isActive =

    Number(status) === 1 ||

    status === "ACTIVE" ||

    String(status).toUpperCase() === "ACTIVE";

  // Check if asset contract matches

  const assetContract =

    listing.assetContract?.toLowerCase() ||

    listing.asset?.contractAddress?.toLowerCase() ||

    "";

  const matchesCollection =

    assetContract === NFT_COLLECTION_ADDRESS.toLowerCase();

  // Check if not expired (endTimestamp should be in future or undefined)

  const now = Math.floor(Date.now() / 1000);

  const endTimestamp = listing.endTimestamp

    ? Number(listing.endTimestamp)

    : null;

  const notExpired = !endTimestamp || endTimestamp > now;

  // Check if quantity available > 0

  const quantityAvailable =

    listing.quantityAvailable ??

    listing.quantity ??

    listing.remainingQuantity ??

    0;

  const hasQuantity = Number(quantityAvailable) > 0;

  return (

    isDirectListing &&

    isActive &&

    matchesCollection &&

    notExpired &&

    hasQuantity

  );

}



async function main() {

  if (!THIRDWEB_SECRET_KEY && !CLIENT_ID) {
    process.exit(1);
  }

  const client = THIRDWEB_SECRET_KEY

    ? createThirdwebClient({ secretKey: THIRDWEB_SECRET_KEY })

    : createThirdwebClient({ clientId: CLIENT_ID! });

  const marketplace = await getContract({

    client,

    chain,

    address: MARKETPLACE_ADDRESS,

  });

  const collection = await getContract({

    client,

    chain,

    address: NFT_COLLECTION_ADDRESS,

  });



  // Fetch all listings with pagination

  const allListings: any[] = [];

  let start: bigint = 0n;

  let keepGoing = true;

  const pageSize = 200;

  while (keepGoing) {

    try {

      const page = await getAllListings({

        contract: marketplace,

        start,

        count: pageSize,

      } as any);

      allListings.push(...page);

      keepGoing = page.length === pageSize;

      start += BigInt(pageSize);

    } catch (err) {

      keepGoing = false;

    }

  }

  // Filter to only direct listings for our collection

  const directListings = allListings.filter((l) => {

    const listingType = l.type ?? l.listingType;

    const isDirectListing = listingType === 0 || listingType === undefined;

    const assetContract =

      l.assetContract?.toLowerCase() ||

      l.asset?.contractAddress?.toLowerCase() ||

      "";

    const matchesCollection =

      assetContract === NFT_COLLECTION_ADDRESS.toLowerCase();

    return isDirectListing && matchesCollection;

  });

  // Only active

  const activeListings = directListings.filter((l) => Number(l.status) === 1);

  // Filter to valid listings (active, not expired, has quantity)

  const validListings = directListings.filter(isValidListing);



  // Map for tokenId lookups

  const byActiveToken: Record<number, any> = {};

  activeListings.forEach((l) => {

    const tokenId = l.tokenId ?? l.asset?.tokenId ?? l.asset?.id ?? null;

    if (tokenId !== null) {

      byActiveToken[Number(tokenId)] = l;

    }

  });

  const byValidToken: Record<number, any> = {};

  validListings.forEach((l) => {

    const tokenId = l.tokenId ?? l.asset?.tokenId ?? l.asset?.id ?? null;

    if (tokenId !== null) {

      byValidToken[Number(tokenId)] = l;

    }

  });



  // Result rows

  let records: {

    tokenId: number;

    status: "burned" | "valid" | "active" | "missing";

    listingId?: string;

    owner?: string;

  }[] = [];



  for (let tokenId = TOKEN_ID_START; tokenId <= TOKEN_ID_END; tokenId++) {

    if (byValidToken[tokenId]) {

      const listing = byValidToken[tokenId];

      records.push({

        tokenId,

        status: "valid",

        listingId: listing.id?.toString() || listing.listingId?.toString() || "",

        owner: listing.sellerAddress || listing.listingCreator || "",

      });

    } else if (byActiveToken[tokenId]) {

      const listing = byActiveToken[tokenId];

      records.push({

        tokenId,

        status: "active",

        listingId: listing.id?.toString() || listing.listingId?.toString() || "",

        owner: listing.sellerAddress || listing.listingCreator || "",

      });

    } else {

      // Not listed: find owner (may not exist)

      try {

        if (SLEEP_MS_BETWEEN_OWNEROF > 0) await sleep(SLEEP_MS_BETWEEN_OWNEROF);

        const owner = await ownerOf({

          contract: collection,

          tokenId: BigInt(tokenId),

        });

        if (owner && owner !== "0x0000000000000000000000000000000000000000") {

          records.push({ tokenId, status: "missing", owner });

        } else {

          records.push({ tokenId, status: "burned" });

        }

      } catch (e) {

        records.push({ tokenId, status: "burned" });

      }

    }

    if ((tokenId - TOKEN_ID_START) % 50 === 0)


  }



  // Write out JSON and CSV

  fs.mkdirSync(path.dirname(OUTPUT_JSON), { recursive: true });

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(records, null, 2));

  const header = "tokenId,status,listingId,owner";

  const rows = [

    header,

    ...records.map((r) =>

      [r.tokenId, r.status, r.listingId || "", r.owner || ""].join(","),

    ),

  ];

  fs.writeFileSync(OUTPUT_CSV, rows.join("\n"));



  const summary = records.reduce(

    (a, r) => {

      a[r.status] = (a[r.status] || 0) + 1;

      return a;

    },

    {} as Record<string, number>,

  );

}



main().catch(() => process.exit(1));

