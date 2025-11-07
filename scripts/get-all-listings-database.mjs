import { createThirdwebClient, getContract } from "thirdweb";
import { getAllListings } from "thirdweb/extensions/marketplace";
import { base } from "thirdweb/chains";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

// SECURITY: No fallbacks - fail hard if env vars are missing
const CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS;

if (!CLIENT_ID) {
  throw new Error("SECURITY ERROR: Missing NEXT_PUBLIC_THIRDWEB_CLIENT_ID environment variable. No fallbacks allowed.");
}

if (!MARKETPLACE_ADDRESS) {
  throw new Error("SECURITY ERROR: Missing NEXT_PUBLIC_MARKETPLACE_ADDRESS environment variable. No fallbacks allowed.");
}

const client = createThirdwebClient({
  clientId: CLIENT_ID,
});

const marketplace = getContract({
  client,
  address: MARKETPLACE_ADDRESS,
  chain: base,
});

const MAX_TOKEN_ID = 7776; // 0..7776 inclusive = 7777 NFTs

function getStatusText(status) {
  if (status === null || status === undefined) return "UNKNOWN";
  const statusStr = String(status).toUpperCase();
  if (statusStr === "0" || statusStr === "INACTIVE") return "INACTIVE";
  if (statusStr === "1" || statusStr === "ACTIVE") return "ACTIVE";
  if (statusStr === "2" || statusStr === "CANCELLED") return "CANCELLED";
  return statusStr;
}

async function getAllListingsPaginated() {
  const allListings = [];
  let start = 0;
  const limit = 1000;
  let consecutiveEmptyPages = 0;
  const maxEmptyPages = 5;

  while (consecutiveEmptyPages < maxEmptyPages) {
    try {
      const listings = await getAllListings({ contract: marketplace, start, count: limit });
      if (listings.length === 0) {
        consecutiveEmptyPages++;
      } else {
        consecutiveEmptyPages = 0;
        allListings.push(...listings);
      }
      start += limit;
      if (allListings.length > 12000) break;
    } catch (err) {
      consecutiveEmptyPages++;
      start += limit;
    }
  }
  return allListings;
}

async function main() {
  // Load rarity mapping
  const pricingCsv = fs.readFileSync("scripts/files/token_pricing_mappings.csv", "utf-8");
  const lines = pricingCsv.split("\n").filter(l => l.trim());
  const headers = lines[0].split(",");
  const rarityMap = new Map();
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(",");
    const row = {};
    headers.forEach((h, idx) => { row[h.trim()] = vals[idx]?.trim() || ""; });
    const tid = parseInt(row.token_id);
    if (!isNaN(tid)) rarityMap.set(tid, row.rarity_tier || "Unknown");
  }

  const allListings = await getAllListingsPaginated();

  const rows = [];
  rows.push("Listing ID,Token ID,NFT Number,NFT Name,Price (ETH),Rarity Tier,Status,Owner Wallet,Expiration Date");

  allListings.forEach(listing => {
    const listingIdRaw = listing.id ?? listing.listingId ?? null;
    const tokenIdRaw = listing.asset?.id ?? listing.tokenId ?? listing.asset?.tokenId ?? null;
    if (listingIdRaw === null || tokenIdRaw === null) return;

    const listingId = Number(listingIdRaw);
    const tokenId = Number(tokenIdRaw);
    const nftNumber = tokenId + 1;

    // Price (ETH)
    let priceWei = "0";
    if (listing.pricePerToken !== undefined && listing.pricePerToken !== null) {
      priceWei = typeof listing.pricePerToken === 'bigint' ? listing.pricePerToken.toString() : String(listing.pricePerToken);
    }
    const priceETH = priceWei === "0" || priceWei === "" ? "0.000001" : (Number(priceWei) / 1e18).toFixed(9);

    const rarityTier = rarityMap.get(tokenId) || "Unknown";
    const status = getStatusText(listing.status ?? "UNKNOWN");
    
    // Owner/Seller
    const owner = listing.sellerAddress || listing.listingCreator || listing.creatorAddress || "N/A";
    const ownerShort = owner.length > 16 ? (owner.substring(0, 10) + "..." + owner.substring(owner.length - 6)) : owner;
    
    // Expiration
    let expiration = "N/A";
    if (listing.endTimestamp !== null && listing.endTimestamp !== undefined) {
      const endTs = typeof listing.endTimestamp === 'bigint' ? 
        Number(listing.endTimestamp) : 
        (typeof listing.endTimestamp === 'string' ? parseInt(listing.endTimestamp) : Number(listing.endTimestamp));
      if (!isNaN(endTs) && endTs > 0) {
        expiration = new Date(endTs * 1000).toISOString();
      }
    }

    rows.push([
      listingId,
      tokenId,
      nftNumber,
      `"Satoshe Slugger #${nftNumber}"`,
      priceETH,
      rarityTier,
      status,
      ownerShort,
      expiration,
    ].join(","));
  });

  // Sort by listing ID
  const header = rows[0];
  const dataRows = rows.slice(1).sort((a, b) => {
    const aId = parseInt(a.split(",")[0]);
    const bId = parseInt(b.split(",")[0]);
    return aId - bId;
  });
  const sortedCsv = [header, ...dataRows];

  // Save CSV
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const csvFile = `scripts/all-listings-database-${timestamp}.csv`;
  fs.writeFileSync(csvFile, sortedCsv.join("\n"));

  // Stats
  const validListings = dataRows.filter(r => {
    const tokenId = parseInt(r.split(",")[1]);
    return !isNaN(tokenId) && tokenId >= 0 && tokenId <= MAX_TOKEN_ID;
  });
  const activeListings = dataRows.filter(r => r.split(",")[6] === "ACTIVE").length;
  const cancelledListings = dataRows.filter(r => r.split(",")[6] === "CANCELLED").length;

}

main().catch(() => {
  process.exit(1);
});

