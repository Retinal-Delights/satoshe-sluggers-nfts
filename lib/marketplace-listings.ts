/**
 * Marketplace Listings Helper
 * Fetches active listings from the thirdweb Marketplace V3 contract
 * Used to determine which NFTs are ACTIVE (listed) vs SOLD (not listed)
 * 
 * Uses thirdweb SDK extensions for better maintainability and automatic pagination
 */

import { getContract } from "thirdweb";
import { getAllListings } from "thirdweb/extensions/marketplace";
import { base } from "thirdweb/chains";
import { client } from "./thirdweb";

const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS;
const NFT_COLLECTION_ADDRESS = process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS?.toLowerCase();

/**
 * Fetches all active listings from the marketplace for the NFT collection
 * Returns a Set of tokenIds that have active listings
 * 
 * Uses thirdweb SDK extension which handles pagination automatically
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

    // Fetch all listings using SDK extension (handles pagination automatically)
    const listings = await getAllListings({ contract: marketplace });

    // Filter for active listings from our collection
    const now = Date.now() / 1000;
    const activeTokenIds = new Set<number>();

    listings.forEach((listing: any) => {
      // SDK structure varies - try multiple possible property paths
      const listingAssetContract = listing.asset?.contractAddress?.toLowerCase() || 
                                   listing.assetContract?.toLowerCase() || "";
      const isOurCollection = listingAssetContract === NFT_COLLECTION_ADDRESS;
      
      // SDK returns status as string ("active") or enum - check both
      const status = listing.status;
      const isActive = status === "active" || status === 1 || 
                       (typeof status === "string" && status.toLowerCase() === "active");
      
      // Check if listing is not expired
      // SDK may use endTimeInSeconds, endTimestamp, or endTime
      const endTime = listing.endTimeInSeconds || listing.endTimestamp || listing.endTime;
      const notExpired = !endTime || Number(endTime) > now;
      
      // Check if quantity is available
      const quantity = listing.quantity || listing.quantityAvailable || "0";
      const hasQuantity = BigInt(String(quantity)) > BigInt(0);

      if (isOurCollection && isActive && notExpired && hasQuantity) {
        // SDK returns asset.id which may be string, number, or bigint
        const assetId = listing.asset?.id;
        if (assetId !== undefined && assetId !== null) {
          const tokenId = typeof assetId === "string" 
            ? parseInt(assetId, 10)
            : typeof assetId === "bigint"
            ? Number(assetId)
            : Number(assetId);
          
          if (!isNaN(tokenId) && tokenId >= 0 && tokenId < 7777) {
            activeTokenIds.add(tokenId);
          }
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

