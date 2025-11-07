// components/nft-grid.tsx
"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { TOTAL_COLLECTION_SIZE } from "@/lib/contracts";
import { base } from "thirdweb/chains";
import { getContract, readContract } from "thirdweb";
import { client } from "@/lib/thirdweb";

// Rarity tier order (common to rare)
const RARITY_TIER_ORDER: Record<string, number> = {
  "Ground Ball": 1,
  "Base Hit": 2,
  "Double": 3,
  "Stand-Up Double": 4,
  "Line Drive": 5,
  "Triple": 6,
  "Pinch Hit Home Run": 7,
  "Over-the-Fence Shot": 8,
  "Home Run": 9,
  "Walk-Off Home Run": 10,
  "Grand Slam": 11,
  "Grand Slam (Ultra-Legendary)": 11,
};
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import NFTPagination from "@/components/ui/pagination";
import NFTCard from "./nft-card";
import NFTTableView from "./nft-grid-table-view";
import NFTViewModeToggle from "./nft-view-mode-toggle";
import NFTGridControls from "./nft-grid-controls";
import { useFavorites } from "@/hooks/useFavorites";
import { loadAllNFTs, loadNFTsRange } from "@/lib/simple-data-service";
import { announceToScreenReader } from "@/lib/accessibility-utils";
import { convertIpfsUrl, cn } from "@/lib/utils";
import { useOnChainOwnership } from "@/hooks/useOnChainOwnership";
import { rpcRateLimiter } from "@/lib/rpc-rate-limiter";



type NFTGridItem = {
  id: string;
  tokenId: string;
  cardNumber: number;
  listingId?: string | number;
  name: string;
  image: string;
  priceEth: number; // Static price from metadata
  priceWei: string | number | bigint;
  soldPriceEth?: number;
  rank: number | string;
  rarity: string;
  rarityPercent: string | number;
  tier: string | number;
  isForSale: boolean;
  background?: string;
  skinTone?: string;
  shirt?: string;
  eyewear?: string;
  hair?: string;
  headwear?: string;
};


interface SelectedFilters {
  background?: string[];
  skinTone?: string[];
  shirt?: string[];
  eyewear?: string[];
  hair?: Record<string, string[]>;
  headwear?: Record<string, string[]>;
  rarity?: string[];
}

interface NFTMetadata {
  token_id?: number;
  name?: string;
  image?: string;
  media_url?: string;
  rarity_tier?: string;
  rarity_percent?: number | string;
  rank?: number | string;
  attributes?: Array<{ trait_type: string; value: string }>;
  merged_data?: {
    media_url?: string;
    metadata_url?: string;
    token_id?: number;
    [key: string]: unknown;
  };
  background?: string;
  skinTone?: string;
  shirt?: string;
  eyewear?: string;
  hair?: string;
  headwear?: string;
  [key: string]: unknown;
}

interface NFTGridProps {
  searchTerm: string;
  searchMode: "contains" | "exact";
  selectedFilters: SelectedFilters;
  showLive?: boolean;
  setShowLive?: (value: boolean) => void;
  showSold?: boolean;
  setShowSold?: (value: boolean) => void;
  onFilteredCountChange?: (count: number) => void;
  onTraitCountsChange?: (counts: Record<string, Record<string, number>>) => void;
}

/**
 * Helper function to extract attribute value from NFT metadata
 * 
 * @param {NFTMetadata} meta - The NFT metadata object containing attributes array
 * @param {string} traitType - The trait type to search for (e.g., "Background", "Skin Tone")
 * @returns {string | undefined} The attribute value if found, undefined otherwise
 */
function getAttribute(meta: NFTMetadata, traitType: string) {
  return meta?.attributes?.find((attr) => attr.trait_type === traitType)?.value;
}

/**
 * Computes dynamic trait counts for filtering sidebar
 * 
 * Counts occurrences of each trait value across the NFT collection.
 * For complex traits like hair and headwear, counts both subcategories
 * (e.g., "Curly") and full combinations (e.g., "Curly Blonde").
 * 
 * @param {NFTGridItem[]} nfts - Array of NFT items to count traits from
 * @param {string[]} categories - Array of trait category names to count
 * @returns {Record<string, Record<string, number>>} Nested object with category -> trait value -> count mapping
 * 
 * @example
 * ```ts
 * const counts = computeTraitCounts(nfts, ["background", "rarity"]);
 * // Returns: { background: { "Blue": 50, "Red": 30 }, rarity: { "Legendary": 10 } }
 * ```
 */
function computeTraitCounts(nfts: NFTGridItem[], categories: string[]) {
  const counts: Record<string, Record<string, number>> = {};
  categories.forEach(category => {
    counts[category] = {};
    nfts.forEach(nft => {
      const value = nft[category as keyof NFTGridItem];
      if (value && typeof value === 'string') {
        if (category === 'hair' || category === 'headwear') {
          // For hair and headwear, split by subcategory and color
          const parts = value.split(' ');
          if (parts.length >= 2) {
            const subcategory = parts[0];
            // const _color = parts.slice(1).join(' '); // eslint-disable-line @typescript-eslint/no-unused-vars
            
            // Count the subcategory
            if (!counts[category][subcategory]) counts[category][subcategory] = 0;
            counts[category][subcategory]++;
            
            // Count the full combination
            if (!counts[category][value]) counts[category][value] = 0;
            counts[category][value]++;
          } else {
            // Fallback for single-word values
            if (!counts[category][value]) counts[category][value] = 0;
            counts[category][value]++;
          }
        } else {
          // For other categories, count normally
          if (!counts[category][value]) counts[category][value] = 0;
          counts[category][value]++;
        }
      }
    });
  });
  return counts;
}

/**
 * NFTGrid Component
 * 
 * A comprehensive grid component for displaying, filtering, sorting, and paginating NFTs.
 * Supports multiple view modes (grid-large, grid-medium, grid-small, compact table),
 * real-time filtering by traits and search terms, column sorting, and on-chain ownership verification.
 * 
 * @example
 * ```tsx
 * <NFTGrid
 *   searchTerm="slugger"
 *   searchMode="contains"
 *   selectedFilters={{
 *     rarity: ["Legendary"],
 *     background: ["Blue"]
 *   }}
 *   showLive={true}
 *   setShowLive={setShowLive}
 *   showSold={true}
 *   setShowSold={setShowSold}
 *   onFilteredCountChange={(count) => updateCount(count)}
 *   onTraitCountsChange={(counts) => updateSidebar(counts)}
 * />
 * ```
 * 
 * @param {NFTGridProps} props - Component props
 * @param {string} props.searchTerm - Search query string
 * @param {"contains" | "exact"} props.searchMode - Search matching mode ("contains" for partial, "exact" for full match)
 * @param {SelectedFilters} props.selectedFilters - Object containing selected filter values by category
 * @param {boolean} [props.showLive=true] - Whether to show live/available NFTs
 * @param {function} [props.setShowLive] - Callback to update showLive state
 * @param {boolean} [props.showSold=true] - Whether to show sold NFTs
 * @param {function} [props.setShowSold] - Callback to update showSold state
 * @param {function} [props.onFilteredCountChange] - Callback invoked when filtered NFT count changes
 * @param {function} [props.onTraitCountsChange] - Callback invoked when trait counts change (for sidebar updates)
 * @returns {JSX.Element} NFT grid component with filtering, sorting, and pagination controls
 */
export default function NFTGrid({ searchTerm, searchMode, selectedFilters, showLive = true, setShowLive, showSold = true, setShowSold, onFilteredCountChange, onTraitCountsChange }: NFTGridProps) {
  // Use on-chain ownership data for accurate Live/Sold counts
  const { liveCount: onChainLiveCount, soldCount: onChainSoldCount, isChecking: isCheckingOwnership, checkedCount, totalToCheck } = useOnChainOwnership(TOTAL_COLLECTION_SIZE);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState("default");
  const [columnSort, setColumnSort] = useState<{ field: string; direction: 'asc' | 'desc' } | null>(null);
  const [nfts, setNfts] = useState<NFTGridItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allMetadata, setAllMetadata] = useState<unknown[]>([]);
  const [viewMode, setViewMode] = useState<'grid-large' | 'grid-medium' | 'grid-small' | 'compact'>('grid-large');
  const [pricingMappings, setPricingMappings] = useState<Record<number, { price_eth: number; listing_id?: number }>>({});
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [scrollPosition, setScrollPosition] = useState<number>(0);
  // Note: Purchased tokens are tracked directly in nfts state via isForSale flag
  const gridRef = useRef<HTMLDivElement>(null);
  const viewToggleRef = useRef<HTMLDivElement>(null);
  
  // Load pricing mappings (prioritize token_pricing_mappings.json which has updated listing IDs)
  useEffect(() => {
    const loadPricingMappings = async () => {
      try {
        // Load token pricing mappings first (has updated listing IDs from CSV)
        let response = await fetch('/data/pricing/token_pricing_mappings.json');
        if (response.ok) {
          const pricingData = await response.json();
          const mappings: Record<number, { price_eth: number; listing_id?: number }> = {};
          pricingData.forEach((item: { token_id: number; price_eth: number; listing_id?: number }) => {
            mappings[item.token_id] = {
              price_eth: item.price_eth,
              listing_id: item.listing_id !== null && item.listing_id !== undefined ? item.listing_id : undefined
            };
          });
          setPricingMappings(mappings);
          return;
        }
        
        // Fallback to optimized file (may not have listing IDs)
        response = await fetch('/data/pricing/optimized_pricing.json');
        if (response.ok) {
          const optimizedData = await response.json();
          // Convert optimized structure back to original format for compatibility
          const mappings: Record<number, { price_eth: number; listing_id?: number }> = {};
          
          Object.entries(optimizedData.byTokenId).forEach(([tokenId, data]) => {
            const typedData = data as { price_eth: number; rarity_tier: string };
            mappings[parseInt(tokenId)] = {
              price_eth: typedData.price_eth,
              listing_id: undefined // Not stored in optimized format
            };
          });
          
          setPricingMappings(mappings);
        }
      } catch {
        // Silent fail - pricing will be empty
      }
    };
    loadPricingMappings();
  }, []);

  // Listen for purchase events to mark items sold immediately and trigger on-chain verification
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ tokenId: number; priceEth?: number }>;
      const tokenIdNum = custom.detail?.tokenId;
      const priceEthFromEvent = custom.detail?.priceEth;
      if (typeof tokenIdNum === 'number' && !Number.isNaN(tokenIdNum)) {
        // Update NFT state immediately
        setNfts(prev => prev.map(item => {
          const itemTokenId = parseInt(item.tokenId);
          if (itemTokenId === tokenIdNum) {
            const soldPrice = typeof priceEthFromEvent === 'number' ? priceEthFromEvent : (typeof item.priceEth === 'number' ? item.priceEth : 0);
            return { ...item, isForSale: false, priceWei: '0', priceEth: 0, soldPriceEth: soldPrice };
          }
          return item;
        }));
        
        // Force immediate on-chain verification for this specific token with rate limiting
        const verifyPurchasedToken = async () => {
          try {
            const marketplace = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS?.toLowerCase();
            if (!marketplace) return;

            const contract = getContract({ client, chain: base, address: process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS! });
            const tokenIdBigInt = BigInt(tokenIdNum);
            
            // Use rate limiter for this single call
            const owner = await rpcRateLimiter.execute(async () => {
              return await readContract({
                contract,
                method: "function ownerOf(uint256 tokenId) view returns (address)",
                params: [tokenIdBigInt],
              }) as string;
            });
            
            const ownerLower = (owner as string).toLowerCase();
            const isSold = ownerLower !== marketplace;
            if (isSold) {
              // Update immediately when ownership is confirmed
              setNfts(prev => prev.map(item => {
                if (parseInt(item.tokenId) === tokenIdNum) {
                  const soldPriceEth = item.priceEth > 0 ? item.priceEth : (item.soldPriceEth || 0);
                  const soldPriceWei = soldPriceEth > 0 ? (soldPriceEth * 1e18).toString() : '0';
                  return { 
                    ...item, 
                    isForSale: false, 
                    priceWei: soldPriceWei,
                    priceEth: 0,
                    soldPriceEth: soldPriceEth
                  };
                }
                return item;
              }));
            } else {
              // If still owned by marketplace, ensure it's marked as for sale
              setNfts(prev => prev.map(item => {
                if (parseInt(item.tokenId) === tokenIdNum && !item.isForSale && item.priceEth > 0) {
                  return { 
                    ...item, 
                    isForSale: true
                  };
                }
                return item;
              }));
            }
          } catch {
            // Ignore errors - state already updated from event
          }
        };
        
        // Verify after delay to allow transaction to confirm on-chain
        // Block time on Base is ~2 seconds, but we wait longer for confirmation
        setTimeout(verifyPurchasedToken, 5000); // Increased to 5 seconds for better reliability
      }
    };
    window.addEventListener('nftPurchased', handler as EventListener);
    return () => window.removeEventListener('nftPurchased', handler as EventListener);
  }, []);

  // Favorites functionality - call hook once at grid level
  const { isFavorited, toggleFavorite } = useFavorites();

  /**
   * Handles column header click for sorting in compact table view
   * 
   * Toggles sort direction if the same column is clicked again,
   * otherwise sets a new sort column with ascending direction.
   * Resets dropdown sort when using column sort.
   * 
   * @param {string} field - The field name to sort by ('nft', 'rank', 'rarity', 'tier', 'price')
   */
  const handleColumnSort = useCallback((field: string) => {
    if (columnSort?.field === field) {
      // Toggle direction if same field
      const newDirection = columnSort.direction === 'asc' ? 'desc' : 'asc';
      setColumnSort({
        field,
        direction: newDirection
      });
      // Sync dropdown sort when column sorting favorites
      if (field === 'favorite') {
        setSortBy('favorite');
      } else {
        setSortBy("default");
      }
    } else {
      // New field, start with ascending
      setColumnSort({ field, direction: 'asc' });
      // Sync dropdown sort when column sorting favorites
      if (field === 'favorite') {
        setSortBy('favorite');
      } else {
        setSortBy("default");
      }
    }
  }, [columnSort]);

  /**
   * Filters NFTs based on search term, search mode, selected filters, and sale state
   * 
   * Applies multiple filter criteria:
   * - Sale state (live/sold) based on showLive and showSold flags
   * - Search term matching (exact or contains mode) against name, token ID, and NFT number
   * - Rarity filter (normalized to handle "Ultra-Legendary" suffix)
   * - Attribute filters (background, skinTone, shirt, eyewear)
   * - Complex attribute filters (hair, headwear) supporting subcategory and color combinations
   * 
   * @type {NFTGridItem[]} Filtered array of NFTs matching all criteria
   */
  const filteredNFTs = useMemo(() => {
    return nfts.filter(nft => {
    // START with sale-state filter
    // Sale state filter based on checkboxes
    // Live: NFTs that are currently for sale (isForSale = true)
    // Sold: NFTs that were listed (had priceEth > 0 or soldPriceEth exists) and are now sold (isForSale = false)
    //      Exclude unlisted NFTs (priceEth = 0, never had a listing)
    if (showLive && showSold) {
      // Show everything (skip filter)
    } else if (showLive) {
      if (!nft.isForSale) return false;
    } else if (showSold) {
      if (nft.isForSale || (!nft.priceEth && !nft.soldPriceEth)) return false;
    } else {
      // If both off, show nothing
      return false;
    }
    // Search logic with Contains/Exact mode
    let matchesSearch = true;
    if (searchTerm.trim()) {
      if (searchMode === "exact") {
        // Exact match: Check if token ID, NFT number, or name matches exactly
        const searchValue = searchTerm.trim();
        const tokenIdMatch = nft.tokenId.toString() === searchValue;
        const nftNumberMatch = (parseInt(nft.tokenId) + 1).toString() === searchValue;
        const nameMatch = nft.name.toLowerCase() === searchValue.toLowerCase();
        matchesSearch = tokenIdMatch || nftNumberMatch || nameMatch;
      } else {
        // Contains mode: Search in name, token ID, or NFT number
        const lowerSearch = searchTerm.toLowerCase();
        const nameMatch = nft.name.toLowerCase().includes(lowerSearch);
        const tokenIdMatch = nft.tokenId.toString().includes(searchTerm);
        const nftNumberMatch = (parseInt(nft.tokenId) + 1).toString().includes(searchTerm);
        matchesSearch = nameMatch || tokenIdMatch || nftNumberMatch;
      }
    }

    const matchesRarity =
      !selectedFilters.rarity ||
      selectedFilters.rarity.length === 0 ||
      selectedFilters.rarity.some(filterRarity => {
        // Normalize filter rarity by removing " (Ultra-Legendary)" suffix
        const normalizedFilterRarity = filterRarity.replace(" (Ultra-Legendary)", "");
        return normalizedFilterRarity === nft.rarity;
      });

    const matchesBackground =
      !selectedFilters.background ||
      selectedFilters.background.length === 0 ||
      (nft.background && selectedFilters.background.includes(nft.background));

    const matchesSkinTone =
      !selectedFilters.skinTone ||
      selectedFilters.skinTone.length === 0 ||
      (nft.skinTone && selectedFilters.skinTone.includes(nft.skinTone));

    const matchesShirt =
      !selectedFilters.shirt ||
      selectedFilters.shirt.length === 0 ||
      (nft.shirt && selectedFilters.shirt.includes(nft.shirt));

    const matchesEyewear =
      !selectedFilters.eyewear ||
      selectedFilters.eyewear.length === 0 ||
      (nft.eyewear && selectedFilters.eyewear.includes(nft.eyewear));

    const hairFilters = selectedFilters.hair || {};
    const hairSubcats = Object.keys(hairFilters);
    const matchesHair =
      hairSubcats.length === 0 ||
      hairSubcats.some(subcat => {
        const colors = hairFilters[subcat];
        const nftHair = nft.hair ? String(nft.hair) : "";
        if (!nftHair) return false;
        if (!colors || colors.length === 0) {
          return nftHair.startsWith(subcat);
        } else {
          return (colors as string[]).some((color: string) => nftHair === `${subcat} ${color}`);
        }
      });

    const headwearFilters = selectedFilters.headwear || {};
    const headwearSubcats = Object.keys(headwearFilters);
    const matchesHeadwear =
      headwearSubcats.length === 0 ||
      headwearSubcats.some(subcat => {
        const colors = headwearFilters[subcat];
        const nftHeadwear = nft.headwear ? String(nft.headwear) : "";
        if (!nftHeadwear) return false;
        if (!colors || colors.length === 0) {
          return nftHeadwear.startsWith(subcat);
        } else {
          return (colors as string[]).some((color: string) => nftHeadwear === `${subcat} ${color}`);
        }
      });

    return (
      matchesSearch &&
      matchesRarity &&
      matchesBackground &&
      matchesSkinTone &&
      matchesShirt &&
      matchesEyewear &&
      matchesHair &&
      matchesHeadwear
    );
  });
  }, [nfts, searchTerm, searchMode, selectedFilters, showLive, showSold]);

  /**
   * Sorts filtered NFTs based on column sort or dropdown sort selection
   * 
   * Column sort takes precedence over dropdown sort.
   * Supports sorting by: NFT name, rank, rarity percent, tier, and price.
   * Rank sorting: lower numbers = higher rank (rank #1 is best)
   * Rarity sorting: lower percent = rarer (0.01% is rarer than 1%)
   * 
   * @type {NFTGridItem[]} Sorted array of filtered NFTs
   */
  const sortedNFTs = useMemo(() => {
    return [...filteredNFTs].sort((a, b) => {
      // Column sort takes precedence
      if (columnSort) {
        const { field, direction } = columnSort;
        const multiplier = direction === 'asc' ? 1 : -1;
        
        switch (field) {
          case 'nft':
            return multiplier * (a.name.localeCompare(b.name));
          case 'rank':
            return multiplier * (Number(a.rank) - Number(b.rank));
          case 'rarity':
            return multiplier * (Number(a.rarityPercent) - Number(b.rarityPercent));
          case 'tier':
            // Normalize tier name (remove " (Ultra-Legendary)" suffix for comparison)
            const tierA = (a.rarity || String(a.tier || '')).replace(' (Ultra-Legendary)', '');
            const tierB = (b.rarity || String(b.tier || '')).replace(' (Ultra-Legendary)', '');
            const orderA = RARITY_TIER_ORDER[tierA] ?? 999;
            const orderB = RARITY_TIER_ORDER[tierB] ?? 999;
            return multiplier * (orderA - orderB);
          case 'price':
            // For price sorting, prioritize NFTs with actual prices (for sale or sold)
            // Sold NFTs use soldPriceEth, unlisted NFTs sort to the end
            const priceA = a.isForSale && a.priceEth > 0 
              ? Number(a.priceWei) 
              : (a.soldPriceEth ? (a.soldPriceEth * 1e18) : Number.MAX_SAFE_INTEGER);
            const priceB = b.isForSale && b.priceEth > 0 
              ? Number(b.priceWei) 
              : (b.soldPriceEth ? (b.soldPriceEth * 1e18) : Number.MAX_SAFE_INTEGER);
            return multiplier * (priceA - priceB);
          case 'favorite':
            // Sort by favorites: favorited first (asc) or last (desc)
            const aFavorited = isFavorited(a.tokenId) ? 1 : 0;
            const bFavorited = isFavorited(b.tokenId) ? 1 : 0;
            return multiplier * (bFavorited - aFavorited); // Invert so favorited comes first in asc
          default:
            return 0;
        }
      }
      
      // Fallback to dropdown sort
      switch (sortBy) {
        case "rank-asc":
          // Low to High (rank #1 is best, so lower rank number = higher rank)
          return Number(a.rank) - Number(b.rank);
        case "rank-desc":
          // High to Low
          return Number(b.rank) - Number(a.rank);
        // Rarity percent: lower % is rarer (higher value)
        case "rarity-asc":
          // Low to High (rarest to most common) -> show common later
          return Number(b.rarityPercent) - Number(a.rarityPercent);
        case "rarity-desc":
          // High to Low (rarest first)
          return Number(a.rarityPercent) - Number(b.rarityPercent);
        case "price-asc":
          // For price sorting, prioritize NFTs with actual prices (for sale or sold)
          // Sold NFTs use soldPriceEth, unlisted NFTs sort to the end
          const priceAscA = a.isForSale && a.priceEth > 0 
            ? Number(a.priceWei) 
            : (a.soldPriceEth ? (a.soldPriceEth * 1e18) : Number.MAX_SAFE_INTEGER);
          const priceAscB = b.isForSale && b.priceEth > 0 
            ? Number(b.priceWei) 
            : (b.soldPriceEth ? (b.soldPriceEth * 1e18) : Number.MAX_SAFE_INTEGER);
          return priceAscA - priceAscB;
        case "price-desc":
          // For high to low, prioritize NFTs with actual prices (for sale or sold)
          // Sold NFTs use soldPriceEth, unlisted NFTs sort to the beginning
          const priceDescA = a.isForSale && a.priceEth > 0 
            ? Number(a.priceWei) 
            : (a.soldPriceEth ? (a.soldPriceEth * 1e18) : 0);
          const priceDescB = b.isForSale && b.priceEth > 0 
            ? Number(b.priceWei) 
            : (b.soldPriceEth ? (b.soldPriceEth * 1e18) : 0);
          return priceDescB - priceDescA;
        case "favorite":
          // Favorites first
          const favA = isFavorited(a.tokenId) ? 1 : 0;
          const favB = isFavorited(b.tokenId) ? 1 : 0;
          return favB - favA;
        default:
          return 0;
      }
    });
  }, [filteredNFTs, sortBy, columnSort, isFavorited]);


  // Pagination - use useMemo to ensure it recalculates when dependencies change
  const paginatedNFTs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedNFTs.slice(startIndex, endIndex);
  }, [sortedNFTs, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(sortedNFTs.length / itemsPerPage) || 1;
  }, [sortedNFTs.length, itemsPerPage]);

  /**
   * Handles keyboard navigation for grid and table items
   * 
   * Supports arrow keys (↑↓←→), Home, and End keys for navigation.
   * Arrow keys navigate within the grid respecting view mode layout.
   * Home moves to first item, End moves to last item.
   * 
   * @param {React.KeyboardEvent} event - Keyboard event object
   * @param {number} index - Current item index in the paginated array
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent, index: number) => {
    const totalItems = paginatedNFTs.length;
    const itemsPerRow = viewMode === 'grid-large' ? 5 : viewMode === 'grid-medium' ? 7 : viewMode === 'grid-small' ? 8 : 1;
    
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        if (index < totalItems - 1) {
          setFocusedIndex(index + 1);
        }
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (index > 0) {
          setFocusedIndex(index - 1);
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (index + itemsPerRow < totalItems) {
          setFocusedIndex(index + itemsPerRow);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (index - itemsPerRow >= 0) {
          setFocusedIndex(index - itemsPerRow);
        }
        break;
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setFocusedIndex(totalItems - 1);
        break;
    }
  }, [paginatedNFTs.length, viewMode]);

  // Load metadata progressively (chunked loading)
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        setIsLoading(true);
        
        // Check if chunked files exist (250-size optimized chunks only)
        const checkChunked = await fetch("/data/metadata-optimized/chunk-0-249.json", { method: "HEAD" }).then(r => r.ok).catch(() => false);
        
        if (checkChunked) {
          // PROGRESSIVE LOADING: Load first chunk immediately, then load rest in background
          // This shows the first 250 NFTs quickly while loading the rest
          
          // Load first chunk (0-249) - this is what user sees first
          const firstChunk = await loadNFTsRange(0, 249);
          setAllMetadata(firstChunk);
          setIsLoading(false); // Show first page immediately
          
          // Load remaining chunks in background (for filtering/searching)
          // User can interact with first 250 NFTs while this loads
          const totalChunks = Math.ceil(7777 / 250);
          const remainingChunks: Promise<unknown[]>[] = [];
          
          for (let i = 1; i < totalChunks; i++) {
            const chunkStart = i * 250;
            const chunkEnd = Math.min(chunkStart + 249, 7776);
            remainingChunks.push(loadNFTsRange(chunkStart, chunkEnd));
          }
          
          // Load all remaining chunks in parallel
          const remaining = await Promise.all(remainingChunks);
          const allRemaining = remaining.flat();
          
          // Update with complete dataset (now filtering/searching works fully)
          setAllMetadata([...firstChunk, ...allRemaining]);
        } else {
          // Fallback: Load all at once (legacy mode)
          const mainMetadata = await loadAllNFTs();
          setAllMetadata(mainMetadata || []);
          setIsLoading(false);
        }

      } catch {
        setIsLoading(false);
      }
    };

    loadMetadata();
  }, []);

  // Reset to page 1 when filters change
  // Use useMemo to create stable string representation of filters for comparison
  const filtersKey = useMemo(() => {
    return JSON.stringify(selectedFilters);
  }, [selectedFilters]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, searchTerm, searchMode, filtersKey, showLive, showSold]);

  // Process NFTs from metadata and check marketplace listings
  useEffect(() => {
    if (allMetadata.length > 0 && Object.keys(pricingMappings).length > 0) {
      const processNFTs = async () => {
        const mappedNFTs: NFTGridItem[] = await Promise.all(
          (allMetadata as NFTMetadata[])
            .filter((meta: NFTMetadata) => meta.token_id !== undefined)
            .map(async (meta: NFTMetadata) => {
              const tokenId = meta.token_id?.toString() || "";
              
              // Use actual image URL from metadata
              const mediaUrl = meta.merged_data?.media_url || meta.media_url || meta.image;
              const imageUrl = convertIpfsUrl(mediaUrl);

              const name = meta.name || `Satoshe Slugger #${parseInt(tokenId) + 1}`;
              const rank = (meta.rank as number | string) ?? "—";
              const rarityPercent = (meta.rarity_percent as number | string) ?? "--";
              const rarity = ((meta.rarity_tier as string) ?? "Unknown").replace(" (Ultra-Legendary)", "");
              
              // Use static price data from pricing mappings - no RPC calls for display
              const tokenIdNum = parseInt(tokenId);
              let priceEth = 0;
              let listingId = undefined;
              
              // Use pricing mappings for all NFTs
              const pricing = pricingMappings[tokenIdNum];
              if (pricing) {
                priceEth = pricing.price_eth;
                // Use listing ID from mappings if available, otherwise generate one
                listingId = (pricing.listing_id !== null && pricing.listing_id !== undefined) 
                  ? pricing.listing_id 
                  : (tokenIdNum + 10000);
              }
              
              const isForSale = priceEth > 0;
              const priceWei = isForSale ? (priceEth * 1e18).toString() : "0";

              return {
                id: tokenId,
                tokenId,
                cardNumber: parseInt(tokenId) + 1, // NFT number (token ID + 1)
                listingId: listingId || meta.token_id,
                name,
                image: imageUrl,
                priceEth: priceEth, // Static price for display
                priceWei: priceWei,
                isForSale: isForSale,
                rank,
                rarity,
                rarityPercent,
                tier: meta.rarity_tier || "Unknown",
                background: getAttribute(meta, "Background"),
                skinTone: getAttribute(meta, "Skin Tone"),
                shirt: getAttribute(meta, "Shirt"),
                eyewear: getAttribute(meta, "Eyewear"),
                hair: getAttribute(meta, "Hair"),
                headwear: getAttribute(meta, "Headwear"),
              };
            })
        );

        setNfts(mappedNFTs);
      };

      processNFTs();
    }
  }, [allMetadata, pricingMappings]);

  // For items on current page, verify on-chain ownership to reflect sold state
  // Moved below pagination to avoid temporal dead zone


  // Preserve scroll position when filters change
  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Restore scroll position after filtering
  useEffect(() => {
    if (scrollPosition > 0 && !isLoading) {
      // Small delay to ensure DOM is updated
      const timeoutId = setTimeout(() => {
        window.scrollTo(0, scrollPosition);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [filteredNFTs.length, scrollPosition, isLoading]); // Only depend on length, not the entire array

  // Verify ownership for current page items with rate limiting
  // Only checks visible page items (max 25 per page) to stay under RPC limits
  // Also re-verify periodically to catch ownership changes
  const prevPageItemsRef = useRef<string>('');
  const verificationInProgressRef = useRef(false);
  const lastVerificationRef = useRef<number>(0);
  useEffect(() => {
    // Create a stable key from token IDs to prevent re-running for same page content
    const pageItemsKey = paginatedNFTs.map(n => n.tokenId).join(',');
    const now = Date.now();
    const timeSinceLastCheck = now - lastVerificationRef.current;
    
    // Re-verify if page changed OR if it's been more than 30 seconds since last check
    const shouldVerify = pageItemsKey !== prevPageItemsRef.current || timeSinceLastCheck > 30000;
    
    if (!shouldVerify || paginatedNFTs.length === 0 || verificationInProgressRef.current) {
      return;
    }
    prevPageItemsRef.current = pageItemsKey;
    lastVerificationRef.current = now;

    const verifyOwnership = async () => {
      // Prevent concurrent verification batches
      if (verificationInProgressRef.current) return;
      verificationInProgressRef.current = true;

      try {
        const marketplace = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS?.toLowerCase();
        if (!marketplace) {
          verificationInProgressRef.current = false;
          return;
        }

        const pageItems = paginatedNFTs;
        const tokenIds = pageItems.map(item => parseInt(item.tokenId));

        // Use batch API (Insight API via backend route) instead of individual RPC calls
        try {
          // Add timeout to ownership API fetch (5 seconds max, then fallback to RPC)
          const fetchPromise = fetch('/api/nft/ownership', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokenIds }),
          });
          
          const timeoutPromise = new Promise<Response>((_, reject) => 
            setTimeout(() => reject(new Error('Ownership API timeout')), 5000)
          );
          
          const response = await Promise.race([fetchPromise, timeoutPromise]);

          if (response.ok) {
            const data = await response.json();
            const soldSet = new Set<number>();

            if (data.ownership) {
              Object.entries(data.ownership).forEach(([tokenIdStr, ownership]: [string, any]) => {
                const tokenId = parseInt(tokenIdStr);
                if (!isNaN(tokenId) && ownership && typeof ownership === 'object' && ownership.isSold) {
                  soldSet.add(tokenId);
                }
              });
            }

            if (soldSet.size > 0) {
              setNfts(prev => prev.map(item => {
                if (soldSet.has(parseInt(item.tokenId))) {
                  // Preserve original price as soldPriceEth when marking as sold
                  const soldPriceEth = item.priceEth > 0 ? item.priceEth : (item.soldPriceEth || 0);
                  const soldPriceWei = soldPriceEth > 0 ? (soldPriceEth * 1e18).toString() : '0';
                  return { 
                    ...item, 
                    isForSale: false, 
                    priceWei: soldPriceWei,
                    priceEth: 0, // Clear current listing price
                    soldPriceEth: soldPriceEth // Preserve as sold price
                  };
                }
                return item;
              }));
            }
            return; // Success, exit early
          }
        } catch (error) {
          // Ownership API failed, falling back to individual RPC calls
        }

        // Fallback to individual RPC calls if API fails
        const contract = getContract({ client, chain: base, address: process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS! });
        const calls = pageItems.map((item) => async () => {
          const tokenIdNum = BigInt(parseInt(item.tokenId));
          return await readContract({
            contract,
            method: "function ownerOf(uint256 tokenId) view returns (address)",
            params: [tokenIdNum],
          }) as string;
        });

        const results = await rpcRateLimiter.executeBatch(calls, 5);
        const soldSet = new Set<number>();
        results.forEach((owner, idx) => {
          if (owner && typeof owner === 'string') {
            const item = pageItems[idx];
            const ownerLower = owner.toLowerCase();
            // Mark as sold if owner is not the marketplace
            if (ownerLower && ownerLower !== marketplace) {
              soldSet.add(parseInt(item.tokenId));
            }
          }
        });

        if (soldSet.size > 0) {
          setNfts(prev => prev.map(item => {
            if (soldSet.has(parseInt(item.tokenId))) {
              // Preserve original price as soldPriceEth when marking as sold
              const soldPriceEth = item.priceEth > 0 ? item.priceEth : (item.soldPriceEth || 0);
              const soldPriceWei = soldPriceEth > 0 ? (soldPriceEth * 1e18).toString() : '0';
              return { 
                ...item, 
                isForSale: false, 
                priceWei: soldPriceWei,
                priceEth: 0, // Clear current listing price
                soldPriceEth: soldPriceEth // Preserve as sold price
              };
            }
            return item;
          }));
        }
      } catch {
        // ignore errors - ownership verification is non-critical
      } finally {
        verificationInProgressRef.current = false;
      }
    };
    verifyOwnership();
  }, [paginatedNFTs]);

  // Update page if out of bounds (only when totalPages changes, not when currentPage changes)
  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages]); // Only depend on totalPages to avoid resetting during normal page navigation

  // Sync "Show" dropdown width to match view toggle container width
  useEffect(() => {
    const syncWidth = () => {
      if (viewToggleRef.current && typeof window !== 'undefined') {
        const showDropdown = document.querySelector('[data-show-dropdown]') as HTMLElement;
        if (showDropdown && viewToggleRef.current) {
          showDropdown.style.width = `${viewToggleRef.current.offsetWidth}px`;
        }
      }
    };
    
    // Sync on mount and when view mode changes
    syncWidth();
    
    // Also sync on window resize
    window.addEventListener('resize', syncWidth);
    return () => window.removeEventListener('resize', syncWidth);
  }, [viewMode]); // Recalculate when view mode changes (might affect button sizes)

  // Compute trait counts from NFTs filtered by current tab (All/Live/Sold) only
  // This ensures counts reflect the NFTs available in the current tab context
  const tabFilteredNFTs = useMemo(() => {
    return nfts.filter(nft => {
      // START with sale-state filter
      // Match the same logic used in filteredNFTs for tab filtering
      // Live: NFTs that are currently for sale
      // Sold: NFTs that were listed and are now sold (exclude unlisted)
      if (showLive && showSold) {
        // Show everything (skip filter)
      } else if (showLive) {
        if (!nft.isForSale) return false;
      } else if (showSold) {
        if (nft.isForSale || (!nft.priceEth && !nft.soldPriceEth)) return false;
      } else {
        // If both off, show nothing
        return false;
      }
      return true;
    });
  }, [nfts, showLive, showSold]);

  // Compute trait counts from tab-filtered NFTs so counts match available options
  const traitCounts = useMemo(() => {
    return computeTraitCounts(tabFilteredNFTs, ["background", "skinTone", "shirt", "eyewear", "hair", "headwear", "rarity"]);
  }, [tabFilteredNFTs]);

  // Note: Using onChainLiveCount and onChainSoldCount from useOnChainOwnership hook for tab counts
  // These update immediately on purchase events and provide accurate aggregate counts

  const prevFilteredCountRef = useRef<number>(0);
  const prevTraitCountsRef = useRef<Record<string, Record<string, number>>>({});

  useEffect(() => {
    if (onFilteredCountChange && filteredNFTs.length !== prevFilteredCountRef.current) {
      prevFilteredCountRef.current = filteredNFTs.length;
      onFilteredCountChange(filteredNFTs.length);
    }
  }, [filteredNFTs.length, onFilteredCountChange]);

  useEffect(() => {
    if (onTraitCountsChange) {
      const traitCountsString = JSON.stringify(traitCounts);
      const prevTraitCountsString = JSON.stringify(prevTraitCountsRef.current);

      if (traitCountsString !== prevTraitCountsString) {
        prevTraitCountsRef.current = traitCounts;
        onTraitCountsChange(traitCounts);
      }
    }
  }, [traitCounts, onTraitCountsChange]);

  if (isLoading) {
    return (
      <div className="w-full max-w-full">
        <div className="mb-6">
          <h2 className="text-fluid-xl font-medium">NFT Collection</h2>
          <div className="text-fluid-sm font-medium text-pink-500 mt-1">Loading...</div>
        </div>
        <div className="mt-8 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="bg-neutral-800 rounded-sm p-2 animate-pulse">
              <div className="aspect-square bg-neutral-700 rounded-sm mb-3"></div>
              <div className="h-4 bg-neutral-700 rounded-sm mb-2"></div>
              <div className="h-3 bg-neutral-700 rounded-sm mb-1"></div>
              <div className="h-3 bg-neutral-700 rounded-sm w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-2 mb-4 overflow-x-hidden">
        {/* Header section: Title, stats, and controls all together */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 w-full overflow-x-hidden">
          {/* Left side: Title and stats */}
          <div className="flex-shrink-0 min-w-0 w-full lg:w-auto">
            <h2 className="text-fluid-xl font-medium whitespace-nowrap">NFT Collection</h2>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <ToggleGroup 
                type="single" 
                variant="outline" 
                size="sm"
                value={
                  showLive && showSold ? "all" :
                  showLive && !showSold ? "live" :
                  !showLive && showSold ? "sold" :
                  "all"
                }
                defaultValue="all"
                onValueChange={(value) => {
                  if (value === "all") {
                    setShowLive?.(true);
                    setShowSold?.(true);
                  } else if (value === "live") {
                    setShowLive?.(true);
                    setShowSold?.(false);
                  } else if (value === "sold") {
                    setShowLive?.(false);
                    setShowSold?.(true);
                  }
                }}
                className="h-7"
              >
                <ToggleGroupItem 
                  value="all" 
                  aria-label="Show all NFTs"
                  className="h-7 px-3 rounded-sm data-[state=on]:bg-[#ff0099]/20 data-[state=on]:text-[#ff0099] data-[state=on]:border-[#ff0099] text-neutral-400 border-neutral-600 hover:bg-neutral-800 hover:text-[#ff0099] flex items-center justify-center leading-none text-fluid-sm font-normal"
                >
                  <span className="flex items-center justify-center w-full h-full">All</span>
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="live" 
                  aria-label={`Show live NFTs (${onChainLiveCount})`}
                  className="h-7 px-3 rounded-sm data-[state=on]:bg-blue-500/20 data-[state=on]:text-blue-400 data-[state=on]:border-blue-500 text-neutral-400 border-neutral-600 hover:bg-neutral-800 hover:text-blue-400 flex items-center justify-center leading-none text-fluid-sm font-normal"
                  disabled={!setShowLive}
                >
                  <span className="flex items-center justify-center w-full h-full">Live</span>
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="sold" 
                  aria-label={`Show sold NFTs (${onChainSoldCount})`}
                  className="h-7 px-3 rounded-sm data-[state=on]:bg-green-500/20 data-[state=on]:text-green-400 data-[state=on]:border-green-500 text-neutral-400 border-neutral-600 hover:bg-neutral-800 hover:text-green-400 flex items-center justify-center leading-none text-fluid-sm font-normal"
                  disabled={!setShowSold}
                >
                  <span className="flex items-center justify-center w-full h-full">Sold</span>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            {/* Dynamic count display based on selected tab */}
            <div className="text-neutral-400 mt-3 text-xs sm:text-sm">
              {showLive && showSold ? (
                // All tab: show total collection size
                `${TOTAL_COLLECTION_SIZE} NFTs`
              ) : showLive && !showSold ? (
                // Live tab: show live count
                `${onChainLiveCount} NFTs`
              ) : !showLive && showSold ? (
                // Sold tab: show sold count
                `${onChainSoldCount} NFTs`
              ) : (
                // Fallback (shouldn't happen)
                `${TOTAL_COLLECTION_SIZE} NFTs`
              )}
            </div>
          </div>

          {/* Right side: View toggles and dropdowns */}
          <div className="flex flex-col items-start sm:items-end gap-2 flex-shrink-0 w-full lg:w-auto overflow-x-hidden">
            <NFTViewModeToggle
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              viewToggleRef={viewToggleRef}
            />
            <NFTGridControls
              sortBy={sortBy}
              onSortChange={(value) => {
                setSortBy(value);
                // Sync column sort when using dropdown for favorites
                if (value === 'favorite') {
                  setColumnSort({ field: 'favorite', direction: 'asc' });
                } else {
                  setColumnSort(null);
                }
              }}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={setItemsPerPage}
              onColumnSortSync={(field) => setColumnSort({ field, direction: 'asc' })}
            />
          </div>
        </div>
      </div>

      {paginatedNFTs.length > 0 ? (
        <>
          {/* Grid Views */}
          {(viewMode === 'grid-large' || viewMode === 'grid-medium' || viewMode === 'grid-small') && (
            <div 
              ref={gridRef} 
              className="mt-4 mb-4 grid w-full gap-[clamp(0.5rem,0.8vw,1rem)] overflow-x-hidden overflow-y-visible"
              style={{
                gridTemplateColumns: viewMode === 'grid-large' ? 'repeat(auto-fit, minmax(clamp(180px, 20vw, 280px), 1fr))' : 
                                    viewMode === 'grid-medium' ? 'repeat(auto-fit, minmax(clamp(160px, 18vw, 240px), 1fr))' :
                                    'repeat(auto-fit, minmax(clamp(140px, 16vw, 200px), 1fr))'
              }}
            >
              {paginatedNFTs.map((nft, index) => {
                // Prioritize loading first 12-16 images (first visible rows depending on view mode)
                // This ensures above-the-fold images load immediately
                // Note: Priority logic available if needed - currently all images use lazy loading
                // const imagesPerRow = viewMode === 'grid-large' ? 5 : viewMode === 'grid-medium' ? 6 : 8;
                // const priorityThreshold = imagesPerRow * 2;
                // const isPriority = index < priorityThreshold;
                
                return (
                  <div
                    key={nft.id}
                    tabIndex={0}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className={`focus:outline-none focus:ring-2 focus:ring-brand-pink focus:ring-offset-2 focus:ring-offset-neutral-900 rounded-sm relative z-0 hover:z-10 ${
                      focusedIndex === index ? 'ring-2 ring-brand-pink ring-offset-2 ring-offset-neutral-900' : ''
                    }`}
                  >
                    <NFTCard
                      image={nft.image}
                      name={nft.name}
                      rank={nft.rank}
                      rarity={nft.rarity}
                      rarityPercent={nft.rarityPercent}
                      priceEth={nft.priceEth}
                      tokenId={nft.tokenId}
                      cardNumber={nft.cardNumber}
                      isForSale={nft.isForSale}
                      soldPriceEth={nft.soldPriceEth}
                      viewMode={viewMode}
                    />
                  </div>
                );
              })}
            </div>
          )}


          {/* Compact Table View */}
          {viewMode === 'compact' && (
            <NFTTableView
              nfts={paginatedNFTs}
              columnSort={columnSort}
              onColumnSort={handleColumnSort}
              focusedIndex={focusedIndex}
              onKeyDown={handleKeyDown}
            />
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-neutral-400">No NFTs found matching your criteria</p>
        </div>
      )}
      
      {/* Pagination - sticky to bottom, always visible */}
      <NFTPagination
        key={`pagination-${viewMode}-${filteredNFTs.length}`}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredNFTs.length}
        itemsPerPage={itemsPerPage}
        onPageChange={(page) => {
          // Ensure page is valid before updating
          if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            // Scroll to top of grid when page changes
            if (gridRef.current) {
              gridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }
        }}
      />
    </div>
    </>
  );
}


