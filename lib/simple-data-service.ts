// lib/simple-data-service.ts

// Core NFT data-loading and filtering service with chunked loading support

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

const CHUNK_SIZE = 250; // NFTs per chunk (optimized to match max page size)
const TOTAL_NFTS = 7777;

// Cache for loaded chunks (chunk index -> NFTData[])
const chunkCache = new Map<number, NFTData[]>();

// Cache for URL mappings
let urlMapCache: Map<number, { media_url: string; metadata_url: string }> | null = null;

/**
 * Get chunk index for a token ID
 */
function getChunkIndex(tokenId: number): number {
  return Math.floor(tokenId / CHUNK_SIZE);
}

/**
 * Get chunk filename for a token ID range
 */
function getChunkFilename(start: number, end: number): string {
  return `chunk-${start}-${end}.json`;
}

/**
 * Load a specific chunk of metadata
 */
async function loadChunk(chunkIndex: number): Promise<NFTData[]> {
  // Check cache first
  if (chunkCache.has(chunkIndex)) {
    return chunkCache.get(chunkIndex)!;
  }

  const chunkStart = chunkIndex * CHUNK_SIZE;
  const chunkEnd = Math.min(chunkStart + CHUNK_SIZE - 1, TOTAL_NFTS - 1);
  const filename = getChunkFilename(chunkStart, chunkEnd);

  try {
    // Try optimized chunked format first
    const response = await fetch(`/data/metadata-optimized/${filename}`);
    
    if (response.ok) {
      const chunkData = await response.json();
      const tokens = chunkData.tokens || [];
      
      // Merge with URL mappings
      const urlMap = await getUrlMap();
      const processedTokens = tokens.map((nft: Record<string, unknown>) => {
        const tokenId = typeof nft.token_id === "number" ? nft.token_id : null;
        const urls = tokenId !== null ? urlMap.get(tokenId) : undefined;
        const image = typeof nft.image === "string" ? nft.image : null;

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
          image: image || mergedMediaUrl || null,
          merged_data: {
            ...(mergedData || {}),
            media_url: urls?.media_url || image || mergedMediaUrl || null,
            metadata_url: urls?.metadata_url || mergedMetadataUrl || null,
          },
        } as NFTData;
      });

      chunkCache.set(chunkIndex, processedTokens);
      return processedTokens;
    }
  } catch (error) {
    // Fall through to try regular chunked format
  }

  // Try regular chunked format
  try {
    const response = await fetch(`/data/metadata/${filename}`);
    if (response.ok) {
      const tokens = await response.json();
      
      // Merge with URL mappings
      const urlMap = await getUrlMap();
      const processedTokens = tokens.map((nft: Record<string, unknown>) => {
        const tokenId = typeof nft.token_id === "number" ? nft.token_id : null;
        const urls = tokenId !== null ? urlMap.get(tokenId) : undefined;
        const image = typeof nft.image === "string" ? nft.image : null;

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
          image: image || mergedMediaUrl || null,
          merged_data: {
            ...(mergedData || {}),
            media_url: urls?.media_url || image || mergedMediaUrl || null,
            metadata_url: urls?.metadata_url || mergedMetadataUrl || null,
          },
        } as NFTData;
      });

      chunkCache.set(chunkIndex, processedTokens);
      return processedTokens;
    }
  } catch (error) {
    // Fall through to legacy format
  }

  // If chunks don't exist, return empty array (will fall back to legacy loading)
  return [];
}

/**
 * Load URL mappings (cached)
 */
async function getUrlMap(): Promise<Map<number, { media_url: string; metadata_url: string }>> {
  if (urlMapCache) {
    return urlMapCache;
  }

  urlMapCache = new Map();
  
  try {
    const urlResponse = await fetch("/data/urls/ipfs_urls.json");
    if (urlResponse.ok) {
      const urlData = await urlResponse.json();
      urlData.forEach((item: Record<string, unknown>) => {
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
          urlMapCache!.set(tokenId, {
            media_url: mediaUrl,
            metadata_url: metadataUrl,
          });
        }
      });
    }
  } catch (error) {
    // Continue with empty map
  }

  return urlMapCache;
}

/**
 * Legacy loading: Load all NFTs from single file (fallback)
 */
async function loadAllNFTsLegacy(): Promise<NFTData[]> {
  try {
    // Fallback: Load from original combined_metadata.json (chunks not available)
    const [metadataResponse, urlResponse] = await Promise.all([
      fetch("/data/combined_metadata.json"),
      fetch("/data/urls/ipfs_urls.json"),
    ]);

    if (!metadataResponse.ok) {
      return [];
    }
    
    const metadataData = await metadataResponse.json();
    const urlData = urlResponse.ok ? await urlResponse.json() : [];

    const urlMap = new Map<number, { media_url: string; metadata_url: string }>();
    urlData.forEach((item: Record<string, unknown>) => {
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

    // Handle both array format and object with tokens property
    const tokens = Array.isArray(metadataData) ? metadataData : (metadataData.tokens || []);
    return tokens.map((nft: Record<string, unknown>) => {
      const tokenId = typeof nft.token_id === "number" ? nft.token_id : null;
      const urls = tokenId !== null ? urlMap.get(tokenId) : undefined;
      const image = typeof nft.image === "string" ? nft.image : null;

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
        image: image || mergedMediaUrl || null,
        merged_data: {
          ...(mergedData || {}),
          media_url: urls?.media_url || image || mergedMediaUrl || null,
          metadata_url: urls?.metadata_url || mergedMetadataUrl || null,
        },
      } as NFTData;
    });
  } catch (error) {
    return [];
  }
}

/**
 * Check if chunked files exist (250-size optimized chunks only)
 */
async function checkChunkedFilesExist(): Promise<boolean> {
  try {
    // Check for 250-size optimized chunks only
    const response = await fetch("/data/metadata-optimized/chunk-0-249.json", { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Loads all NFTs and their metadata.
 * Uses chunked loading if available, falls back to legacy single-file loading.
 * 
 * NOTE: This loads ALL chunks. For better performance, use loadNFTsRange() 
 * or getNFTByTokenId() when possible.
 */
export async function loadAllNFTs(): Promise<NFTData[]> {
  // Check if chunked files exist
  const useChunks = await checkChunkedFilesExist();
  
  if (!useChunks) {
    // Fall back to legacy loading
    return await loadAllNFTsLegacy();
  }

  // Load all chunks in parallel (needed for filtering/searching)
  // This is still faster than loading a single 11MB file
  const totalChunks = Math.ceil(TOTAL_NFTS / CHUNK_SIZE);
  const chunkPromises: Promise<NFTData[]>[] = [];
  
  for (let i = 0; i < totalChunks; i++) {
    chunkPromises.push(loadChunk(i));
  }

  try {
    const chunks = await Promise.all(chunkPromises);
    // Flatten all chunks into single array
    const allNFTs = chunks.flat();
    return allNFTs;
  } catch (error) {
    // If chunked loading fails, fall back to legacy
    return await loadAllNFTsLegacy();
  }
}

/**
 * Load NFTs for a specific range (optimized for pagination)
 */
export async function loadNFTsRange(startTokenId: number, endTokenId: number): Promise<NFTData[]> {
  const useChunks = await checkChunkedFilesExist();
  
  if (!useChunks) {
    // Fall back: load all and slice
    const allNFTs = await loadAllNFTsLegacy();
    return allNFTs.filter(nft => nft.token_id >= startTokenId && nft.token_id <= endTokenId);
  }

  const startChunk = getChunkIndex(startTokenId);
  const endChunk = getChunkIndex(endTokenId);
  
  const chunkPromises: Promise<NFTData[]>[] = [];
  for (let i = startChunk; i <= endChunk; i++) {
    chunkPromises.push(loadChunk(i));
  }

  const chunks = await Promise.all(chunkPromises);
  const allNFTs = chunks.flat();
  
  // Filter to exact range
  return allNFTs.filter(nft => nft.token_id >= startTokenId && nft.token_id <= endTokenId);
}

/**
 * Get a single NFT by token ID.
 * Only loads the specific chunk needed (much faster).
 */
export async function getNFTByTokenId(
  tokenId: number,
): Promise<NFTData | null> {
  const useChunks = await checkChunkedFilesExist();
  
  if (!useChunks) {
    // Fall back to legacy
    const allNFTs = await loadAllNFTsLegacy();
    return allNFTs.find((nft) => nft.token_id === tokenId) || null;
  }

  // Load only the chunk containing this token ID
  const chunkIndex = getChunkIndex(tokenId);
  const chunk = await loadChunk(chunkIndex);
  return chunk.find((nft) => nft.token_id === tokenId) || null;
}

/**
 * Get a page of NFTs for display, with total/page counts.
 * Optimized to load only needed chunks.
 */
export async function getNFTs(
  page: number = 1,
  limit: number = 50,
): Promise<{
  nfts: NFTData[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const useChunks = await checkChunkedFilesExist();
  
  if (!useChunks) {
    // Fall back to legacy
    const allNFTs = await loadAllNFTsLegacy();
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    return {
      nfts: allNFTs.slice(startIndex, endIndex),
      total: allNFTs.length,
      page,
      totalPages: Math.ceil(allNFTs.length / limit),
    };
  }

  // Calculate which chunks we need
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const startTokenId = startIndex;
  const endTokenId = Math.min(endIndex - 1, TOTAL_NFTS - 1);

  const nfts = await loadNFTsRange(startTokenId, endTokenId);

  return {
    nfts: nfts.slice(0, limit),
    total: TOTAL_NFTS,
    page,
    totalPages: Math.ceil(TOTAL_NFTS / limit),
  };
}

/**
 * Find NFTs by search query (matches name, description, or series).
 * Note: This still requires loading all chunks for full search.
 * For better performance, consider implementing server-side search.
 */
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

/**
 * Filter NFTs based on trait/attribute selections.
 * Note: This requires loading all chunks for full filtering.
 * For better performance, consider implementing server-side filtering.
 */
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

/**
 * Get trait/attribute statistics for a group of NFTs (for filter sidebars).
 */
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

/**
 * Clear the metadata cache. Only needed for development or admin use.
 */
export function clearCache(): void {
  chunkCache.clear();
  urlMapCache = null;
}
