// lib/simple-data-service.ts

// Core NFT data-loading and filtering service

// Data type representing a single NFT (metadata, attributes, merged IPFS/media fields)
export interface NFTData {
  name: string;
  description: string;
  token_id: number;
  card_number: number;
  collection_number: number;
  edition: number;
  series: string;
  rarity_score: number;
  rank: number;
  rarity_percent: number;
  rarity_tier: string;
  attributes: Array<{
    trait_type: string;
    value: string;
    occurrence?: number;
    rarity?: number;
    percentage?: number;
  }>;
  artist: string;
  platform: string;
  compiler: string;
  copyright: string;
  date: number;
  image?: string;
  merged_data?: {
    nft?: number;
    token_id?: number;
    listing_id?: number;
    metadata_cid?: string;
    media_cid?: string;
    metadata_url?: string;
    media_url?: string;
    price_eth?: number;
  };
}

// Local cache for NFT metadata, kept in-memory only. Always reloaded from disk/API for freshness.
let metadataCache: NFTData[] | null = null;

// Loads all NFTs and their metadata. Used by most features.
// This version logs errors for diagnosis, never fails silently.
export async function loadAllNFTs(): Promise<NFTData[]> {
  // Reset cache for fresh loads every time
  metadataCache = null;

  try {
    // Simultaneously load both metadata (main details) and IPFS URLs (media links)
    const [metadataResponse, urlResponse] = await Promise.all([
      fetch("/data/combined_metadata.json"),
      fetch("/data/urls/ipfs_urls.json"),
    ]);

    if (!metadataResponse.ok) {
      // (CHANGE: better error logging)
      console.error(`Failed to load metadata: ${metadataResponse.statusText}`);
      throw new Error(
        `Failed to load metadata: ${metadataResponse.statusText}`,
      );
    }

    const metadataData = await metadataResponse.json();
    const urlData = urlResponse.ok ? await urlResponse.json() : [];

    // Map from tokenId to {media_url, metadata_url} for easy lookups
    const urlMap = new Map<
      number,
      { media_url: string; metadata_url: string }
    >();
    urlData.forEach((item: Record<string, unknown>) => {
      // Accept both number and string token IDs
      const tokenId =
        typeof item.TokenID === "number"
          ? item.TokenID
          : typeof item.TokenID === "string"
            ? parseInt(item.TokenID)
            : null;
      const mediaUrl =
        typeof item["Media URL"] === "string" ? item["Media URL"] : "";
      const metadataUrl =
        typeof item["Metadata URL"] === "string" ? item["Metadata URL"] : "";
      if (tokenId !== null) {
        urlMap.set(tokenId, {
          media_url: mediaUrl,
          metadata_url: metadataUrl,
        });
      }
    });

    // For each NFT, merge its main metadata and optionally URL/media info
    metadataCache = metadataData.map((nft: Record<string, unknown>) => {
      const tokenId = typeof nft.token_id === "number" ? nft.token_id : null;
      const urls = tokenId !== null ? urlMap.get(tokenId) : undefined;
      const image = typeof nft.image === "string" ? nft.image : null;

      // TypeScript safe access to merged_data
      const mergedData =
        nft.merged_data && typeof nft.merged_data === "object"
          ? (nft.merged_data as Record<string, unknown>)
          : null;
      const mergedMediaUrl =
        mergedData && typeof mergedData.media_url === "string"
          ? mergedData.media_url
          : null;
      const mergedMetadataUrl =
        mergedData && typeof mergedData.metadata_url === "string"
          ? mergedData.metadata_url
          : null;

      return {
        ...nft,
        // IMAGE LOGIC: Prefer explicit image, else fallback to merged info
        image: image || mergedMediaUrl || null,
        merged_data: {
          ...(mergedData || {}),
          // MEDIA/METADATA URL LOGIC: Prefer derived ipfs_urls.json value, fallback to what's in merged_data/image
          media_url: urls?.media_url || image || mergedMediaUrl || null,
          metadata_url: urls?.metadata_url || mergedMetadataUrl || null,
        },
      };
    });

    return metadataCache || [];
  } catch (error) {
    // (CHANGE: error logging for admins, visible in browser/dev console)
    console.error("Error loading NFT data:", error);
    return [];
  }
}

// Get a single NFT by token ID.
// If not found, returns null.
export async function getNFTByTokenId(
  tokenId: number,
): Promise<NFTData | null> {
  const allNFTs = await loadAllNFTs();
  const foundNFT = allNFTs.find((nft) => nft.token_id === tokenId);
  return foundNFT || null;
}

// Get a page of NFTs for display, with total/page counts.
export async function getNFTs(
  page: number = 1,
  limit: number = 50,
): Promise<{
  nfts: NFTData[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const allNFTs = await loadAllNFTs();
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  return {
    nfts: allNFTs.slice(startIndex, endIndex),
    total: allNFTs.length,
    page,
    totalPages: Math.ceil(allNFTs.length / limit),
  };
}

// Find NFTs by search query (matches name, description, or series).
export async function searchNFTs(
  query: string,
  mode: "exact" | "contains" = "contains",
): Promise<NFTData[]> {
  const allNFTs = await loadAllNFTs();

  if (!query.trim()) {
    return allNFTs;
  }

  return allNFTs.filter((nft) => {
    const searchText =
      `${nft.name} ${nft.description} ${nft.series}`.toLowerCase();
    const searchQuery = query.toLowerCase();

    if (mode === "exact") {
      return searchText === searchQuery;
    } else {
      return searchText.includes(searchQuery);
    }
  });
}

// Filter NFTs based on trait/attribute selections.
// Complex filters: rarity tier, trait subcategories for hair and headwear.
export async function filterNFTs(filters: {
  rarity?: string[];
  background?: string[];
  skinTone?: string[];
  shirt?: string[];
  hair?: Record<string, string[]>;
  eyewear?: string[];
  headwear?: Record<string, string[]>;
}): Promise<NFTData[]> {
  const allNFTs = await loadAllNFTs();

  return allNFTs.filter((nft) => {
    // RARITY FILTER (removes suffix for strict comparison)
    if (filters.rarity && filters.rarity.length > 0) {
      const rarityTier = nft.rarity_tier.replace(" (Ultra-Legendary)", "");
      if (!filters.rarity.includes(rarityTier)) {
        return false;
      }
    }

    // ATTRIBUTE FILTERS (loop through each trait selector/option)
    for (const [traitType, values] of Object.entries(filters)) {
      if (traitType === "rarity" || !values || values.length === 0) continue;
      // Find attribute in NFT data for this traitType
      const attribute = nft.attributes.find(
        (attr) => attr.trait_type.toLowerCase() === traitType.toLowerCase(),
      );

      if (!attribute) return false;

      // TRAIT SUBCATEGORIES (for HAIR/HEADWEAR)
      if (traitType === "hair" || traitType === "headwear") {
        const subcategoryValues = values as Record<string, string[]>;
        // Subcategory logic: must match subcategory + color
        const hasMatch = Object.entries(subcategoryValues).some(
          ([subcat, colors]) => {
            return (
              attribute.value.includes(subcat) &&
              colors.some((color) => attribute.value.includes(color))
            );
          },
        );
        if (!hasMatch) return false;
      } else {
        // SIMPLE ATTRIBUTE
        const simpleValues = values as string[];
        if (!simpleValues.includes(attribute.value)) {
          return false;
        }
      }
    }

    // If all filters/checks passed, keep this NFT
    return true;
  });
}

// Get trait/attribute statistics for a group of NFTs (for filter sidebars).
export function getTraitCounts(
  nfts: NFTData[],
): Record<string, Record<string, number>> {
  const counts: Record<string, Record<string, number>> = {};

  nfts.forEach((nft) => {
    nft.attributes.forEach((attr) => {
      const traitType = attr.trait_type.toLowerCase();

      if (!counts[traitType]) {
        counts[traitType] = {};
      }

      // SUBCATEGORIES: hair/headwear are counted by "subcategory + color"
      if (traitType === "hair" || traitType === "headwear") {
        const parts = attr.value.split(" ");
        if (parts.length >= 2) {
          const subcategory = parts[0];
          const color = parts[1];
          const fullValue = `${subcategory} ${color}`;

          counts[traitType][fullValue] =
            (counts[traitType][fullValue] || 0) + 1;
        }
      } else {
        // SIMPLE ATTRIBUTE: count
        counts[traitType][attr.value] =
          (counts[traitType][attr.value] || 0) + 1;
      }
    });
  });

  return counts;
}

// Clear the metadata cache. Only needed for development or admin use.
export function clearCache(): void {
  metadataCache = null;
}
