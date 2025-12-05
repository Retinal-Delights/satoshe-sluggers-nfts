/**
 * Marketplace Listings Helper
 * Fetches active listings from the thirdweb Marketplace V3 contract
 * Used to determine which NFTs are ACTIVE (listed) vs SOLD (not listed)
 */

import { getContract, readContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { client } from "./thirdweb";

const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS;
const NFT_COLLECTION_ADDRESS = process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS?.toLowerCase();

/**
 * Fetches all active listings from the marketplace for the NFT collection
 * Returns a Set of tokenIds that have active listings
 */
export async function getActiveListings(): Promise<Set<number>> {
  if (!MARKETPLACE_ADDRESS || !NFT_COLLECTION_ADDRESS) {
    console.warn("[Marketplace Listings] Missing marketplace or collection address");
    return new Set();
  }

  try {
    const marketplace = getContract({
      client,
      chain: base,
      address: MARKETPLACE_ADDRESS,
    });

    // Get total number of listings first
    // We'll need to call getAllValidListings with a range
    // Start with a reasonable range (0 to 10000 should cover all listings)
    const START_ID = 0;
    const END_ID = 10000; // Adjust if you have more than 10k listings

    const listings = await readContract({
      contract: marketplace,
      method: "function getAllValidListings(uint256 _startId, uint256 _endId) view returns ((uint256 listingId, uint256 tokenId, uint256 quantity, uint256 pricePerToken, uint128 startTimestamp, uint128 endTimestamp, address listingCreator, address assetContract, address currency, uint8 tokenType, uint8 status, bool reserved)[] _validListings)",
      params: [BigInt(START_ID), BigInt(END_ID)],
    }) as Array<{
      listingId: bigint;
      tokenId: bigint;
      quantity: bigint;
      pricePerToken: bigint;
      startTimestamp: bigint;
      endTimestamp: bigint;
      listingCreator: string;
      assetContract: string;
      status: number;
      reserved: boolean;
    }>;

    // Filter for listings that:
    // 1. Match our NFT collection address
    // 2. Are active (status === 1)
    // 3. Are not expired (endTimestamp === 0 or endTimestamp > now)
    // 4. Have quantity > 0
    const now = Math.floor(Date.now() / 1000);
    const activeTokenIds = new Set<number>();

    listings.forEach((listing) => {
      const listingAssetContract = listing.assetContract?.toLowerCase() || "";
      const isOurCollection = listingAssetContract === NFT_COLLECTION_ADDRESS;
      const isActive = listing.status === 1;
      const notExpired = listing.endTimestamp === BigInt(0) || Number(listing.endTimestamp) > now;
      const hasQuantity = listing.quantity > BigInt(0);

      if (isOurCollection && isActive && notExpired && hasQuantity) {
        const tokenId = Number(listing.tokenId);
        if (!isNaN(tokenId) && tokenId >= 0 && tokenId < 7777) {
          activeTokenIds.add(tokenId);
        }
      }
    });

    if (process.env.NODE_ENV === "development") {
      console.log(`[Marketplace Listings] Found ${activeTokenIds.size} active listings for collection ${NFT_COLLECTION_ADDRESS}`);
    }

    return activeTokenIds;
  } catch (error) {
    console.error("[Marketplace Listings] Error fetching active listings:", error);
    return new Set();
  }
}

/**
 * Checks if a specific tokenId has an active listing
 */
export async function hasActiveListing(tokenId: number): Promise<boolean> {
  const activeListings = await getActiveListings();
  return activeListings.has(tokenId);
}

