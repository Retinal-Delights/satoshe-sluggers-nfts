// components/nft-grid.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { TOTAL_COLLECTION_SIZE } from "@/lib/contracts";
import { base } from "thirdweb/chains";
import { getContract, readContract } from "thirdweb";
import { client } from "@/lib/thirdweb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import Pagination from "@/components/ui/pagination";
// Removed BuyDirectListingButton imports - using regular buttons to avoid RPC calls
import NFTCard from "./nft-card";
import { LayoutGrid, Rows3, Grid3x3, Heart, Square } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useFavorites } from "@/hooks/useFavorites";
import Link from "next/link";
import Image from "next/image";
import { loadAllNFTs } from "@/lib/simple-data-service";
import { announceToScreenReader } from "@/lib/accessibility-utils";
import { convertIpfsUrl } from "@/lib/utils";
import { useOnChainOwnership } from "@/hooks/useOnChainOwnership";



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

// Helper to extract attribute value from metadata
function getAttribute(meta: NFTMetadata, traitType: string) {
  return meta?.attributes?.find((attr) => attr.trait_type === traitType)?.value;
}

// Compute dynamic trait counts
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

  // Listen for purchase events to mark items sold immediately
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ tokenId: number; priceEth?: number }>;
      const tokenIdNum = custom.detail?.tokenId;
      const priceEthFromEvent = custom.detail?.priceEth;
      if (typeof tokenIdNum === 'number' && !Number.isNaN(tokenIdNum)) {
        setNfts(prev => prev.map(item => {
          if (parseInt(item.tokenId) === tokenIdNum) {
            const soldPrice = typeof priceEthFromEvent === 'number' ? priceEthFromEvent : (typeof item.priceEth === 'number' ? item.priceEth : 0);
            return { ...item, isForSale: false, priceWei: '0', priceEth: 0, soldPriceEth: soldPrice };
          }
          return item;
        }));
      }
    };
    window.addEventListener('nftPurchased', handler as EventListener);
    return () => window.removeEventListener('nftPurchased', handler as EventListener);
  }, []);

  // Favorites functionality - call hook once at grid level
  const { isFavorited, toggleFavorite } = useFavorites();

  // Column sort handler
  const handleColumnSort = (field: string) => {
    if (columnSort?.field === field) {
      // Toggle direction if same field
      setColumnSort({
        field,
        direction: columnSort.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      // New field, start with ascending
      setColumnSort({ field, direction: 'asc' });
    }
    // Reset dropdown sort when using column sort
    setSortBy("default");
  };

  // Keyboard navigation for grid items
  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
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
  };

  // Load metadata
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        setIsLoading(true);
        
        // Load main collection using simple data service
        const mainMetadata = await loadAllNFTs();
        
        // Set metadata directly
        setAllMetadata(mainMetadata || []);

      } catch {
      } finally {
        setIsLoading(false);
      }
    };

    loadMetadata();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {

    setCurrentPage(1);
  }, [itemsPerPage, searchTerm]);

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

  // Filter NFTs
  const filteredNFTs = useMemo(() => {
    return nfts.filter(nft => {
    // Sale state filter based on checkboxes
    if (!showLive && nft.isForSale) return false;
    if (!showSold && !nft.isForSale) return false;
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

  // Sort filtered NFTs
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
            return multiplier * (a.rarity.localeCompare(b.rarity));
          case 'price':
            return multiplier * (Number(a.priceWei) - Number(b.priceWei));
          default:
            return 0;
        }
      }
      
      // Fallback to dropdown sort
      switch (sortBy) {
        // Rank: "High to Low" should show best rank first (rank #1 is highest)
        case "rank-asc":
          // Low to High (worst to best)
          return Number(b.rank) - Number(a.rank);
        case "rank-desc":
          // High to Low (best to worst)
          return Number(a.rank) - Number(b.rank);
        // Rarity percent: lower % is rarer (higher value)
        case "rarity-asc":
          // Low to High (rarest to most common) -> show common later
          return Number(b.rarityPercent) - Number(a.rarityPercent);
        case "rarity-desc":
          // High to Low (rarest first)
          return Number(a.rarityPercent) - Number(b.rarityPercent);
        case "price-asc":
          return Number(a.priceWei) - Number(b.priceWei);
        case "price-desc":
          return Number(b.priceWei) - Number(a.priceWei);
        default:
          return 0;
      }
    });
  }, [filteredNFTs, sortBy, columnSort]);


  // Pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedNFTs = sortedNFTs.slice(startIndex, endIndex);

  const totalPages = Math.ceil(sortedNFTs.length / itemsPerPage) || 1;

  // Verify ownership for current page items to reflect sold state from chain
  const prevPageItemsRef = useRef<string>('');
  useEffect(() => {
    // Create a stable key from token IDs to prevent re-running for same page content
    const pageItemsKey = paginatedNFTs.map(n => n.tokenId).join(',');
    if (pageItemsKey === prevPageItemsRef.current || paginatedNFTs.length === 0) {
      return;
    }
    prevPageItemsRef.current = pageItemsKey;

    const verifyOwnership = async () => {
      try {
        const creator = process.env.NEXT_PUBLIC_CREATOR_ADDRESS?.toLowerCase();
        if (!creator) return;

        const contract = getContract({ client, chain: base, address: process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS! });

        const pageItems = paginatedNFTs;
        const results = await Promise.allSettled(pageItems.map(item => {
          const tokenIdNum = BigInt(parseInt(item.tokenId));
          return readContract({
            contract,
            method: "function ownerOf(uint256 tokenId) view returns (address)",
            params: [tokenIdNum],
          }) as Promise<string>;
        }));

        const soldSet = new Set<number>();
        results.forEach((res, idx) => {
          if (res.status === 'fulfilled') {
            const owner = (res.value as string).toLowerCase();
            const item = pageItems[idx];
            if (owner !== creator) {
              soldSet.add(parseInt(item.tokenId));
            }
          }
        });

        if (soldSet.size > 0) {
          setNfts(prev => prev.map(item => soldSet.has(parseInt(item.tokenId)) ? { ...item, isForSale: false, priceWei: '0', priceEth: 0 } : item));
        }
      } catch {
        // ignore
      }
    };
    verifyOwnership();
  }, [paginatedNFTs]);

  // Update page if out of bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);


  // Compute trait counts from NFTs filtered by current tab (All/Live/Sold) only
  // This ensures counts reflect the NFTs available in the current tab context
  const tabFilteredNFTs = useMemo(() => {
    return nfts.filter(nft => {
      // Match the same logic used in filteredNFTs for tab filtering
      if (!showLive && nft.isForSale) return false;
      if (!showSold && !nft.isForSale) return false;
      return true;
    });
  }, [nfts, showLive, showSold]);

  // Compute trait counts from tab-filtered NFTs so counts match available options
  const traitCounts = useMemo(() => {
    return computeTraitCounts(tabFilteredNFTs, ["background", "skinTone", "shirt", "eyewear", "hair", "headwear", "rarity"]);
  }, [tabFilteredNFTs]);

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
          <h2 className="text-fluid-lg font-medium">NFT Collection</h2>
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
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-2 mb-4 pl-2 overflow-x-hidden">
        {/* Header section: Title, stats, and controls all together */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 overflow-x-hidden">
          {/* Left side: Title and stats */}
          <div>
            <h2 className="text-fluid-lg font-medium">NFT Collection</h2>
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
                  className="h-7 px-3 rounded-sm data-[state=on]:bg-brand-pink/20 data-[state=on]:text-brand-pink data-[state=on]:border-brand-pink text-neutral-400 border-neutral-600 hover:bg-neutral-800 hover:text-neutral-200 flex items-center justify-center leading-none text-fluid-md"
                >
                  <span className="flex items-center justify-center w-full h-full">All</span>
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="live" 
                  aria-label={`Show live NFTs (${isCheckingOwnership && checkedCount < totalToCheck ? (checkedCount > 0 ? onChainLiveCount : nfts.filter(n => n.isForSale).length) : onChainLiveCount})`}
                  className="h-7 px-3 rounded-sm data-[state=on]:bg-blue-500/20 data-[state=on]:text-blue-400 data-[state=on]:border-blue-500 text-neutral-400 border-neutral-600 hover:bg-neutral-800 hover:text-blue-300 flex items-center justify-center leading-none text-fluid-md"
                  disabled={!setShowLive}
                >
                  <span className="flex items-center justify-center w-full h-full">
                    {isCheckingOwnership && checkedCount < totalToCheck ? (
                      <span className="text-neutral-500">Live — {checkedCount > 0 ? onChainLiveCount : nfts.filter(n => n.isForSale).length}...</span>
                    ) : (
                      `Live — ${onChainLiveCount}`
                    )}
                  </span>
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="sold" 
                  aria-label={`Show sold NFTs (${isCheckingOwnership && checkedCount < totalToCheck ? (checkedCount > 0 ? onChainSoldCount : nfts.filter(n => !n.isForSale).length) : onChainSoldCount})`}
                  className="h-7 px-3 rounded-sm data-[state=on]:bg-green-500/20 data-[state=on]:text-green-400 data-[state=on]:border-green-500 text-neutral-400 border-neutral-600 hover:bg-neutral-800 hover:text-green-300 flex items-center justify-center leading-none text-fluid-md"
                  disabled={!setShowSold}
                >
                  <span className="flex items-center justify-center w-full h-full">
                    {isCheckingOwnership && checkedCount < totalToCheck ? (
                      <span className="text-neutral-500">Sold — {checkedCount > 0 ? onChainSoldCount : nfts.filter(n => !n.isForSale).length}...</span>
                    ) : (
                      `Sold — ${onChainSoldCount}`
                    )}
                  </span>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            {filteredNFTs.length > 0 && (
              <div className="text-neutral-500 mt-3 text-fluid-md">
                {startIndex + 1}-{Math.min(endIndex, filteredNFTs.length)} of {filteredNFTs.length} NFTs
              </div>
            )}
          </div>

          {/* Right side: View toggles and dropdowns */}
          <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto overflow-x-hidden">
            {/* View Mode Toggles - Above dropdowns */}
            <TooltipProvider>
              <div className="flex items-center gap-1 border border-neutral-700 rounded-sm p-1 bg-neutral-900 flex-shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        setViewMode('grid-large')
                        announceToScreenReader('Switched to large grid view')
                      }}
                      className={`p-2 rounded-sm transition-colors ${viewMode === 'grid-large' ? 'bg-neutral-800 text-[#ff0099]' : 'text-neutral-500 hover:text-neutral-300'}`}
                      aria-label="Switch to large grid view"
                      aria-pressed={viewMode === 'grid-large'}
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-neutral-800 text-[#FFFBEB] border-neutral-600">
                    <p>Large Grid</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        setViewMode('grid-medium')
                        announceToScreenReader('Switched to medium grid view')
                      }}
                      className={`p-2 rounded-sm transition-colors ${viewMode === 'grid-medium' ? 'bg-neutral-800 text-[#ff0099]' : 'text-neutral-500 hover:text-neutral-300'}`}
                      aria-label="Switch to medium grid view"
                      aria-pressed={viewMode === 'grid-medium'}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-neutral-800 text-[#FFFBEB] border-neutral-600">
                    <p>Medium Grid</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        setViewMode('grid-small')
                        announceToScreenReader('Switched to small grid view')
                      }}
                      className={`p-2 rounded-sm transition-colors ${viewMode === 'grid-small' ? 'bg-neutral-800 text-[#ff0099]' : 'text-neutral-500 hover:text-neutral-300'}`}
                      aria-label="Switch to small grid view"
                      aria-pressed={viewMode === 'grid-small'}
                    >
                      <Grid3x3 className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-neutral-800 text-[#FFFBEB] border-neutral-600">
                    <p>Small Grid</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        setViewMode('compact')
                        announceToScreenReader('Switched to compact table view')
                      }}
                      className={`p-2 rounded-sm transition-colors ${viewMode === 'compact' ? 'bg-neutral-800 text-[#ff0099]' : 'text-neutral-500 hover:text-neutral-300'}`}
                      aria-label="Switch to compact table view"
                      aria-pressed={viewMode === 'compact'}
                    >
                      <Rows3 className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-neutral-800 text-[#FFFBEB] border-neutral-600">
                    <p>Compact Table</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>

            {/* Dropdowns - Below view toggles */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto flex-wrap">
              <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
                <span className="text-neutral-500 whitespace-nowrap flex-shrink-0 text-fluid-md">Sort by: </span>
                <Select value={sortBy} onValueChange={(value) => {
                  setSortBy(value);
                  setColumnSort(null); // Clear column sort when using dropdown
                }}>
                  <SelectTrigger className="w-full sm:w-[200px] md:w-[240px] bg-neutral-900 border-neutral-700 rounded-sm text-off-white font-normal min-w-0 text-fluid-md">
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-950/95 backdrop-blur-md border-neutral-700 rounded-sm">
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="rank-asc">Rank: Low to High</SelectItem>
                    <SelectItem value="rank-desc">Rank: High to Low</SelectItem>
                    <SelectItem value="rarity-asc">Rarity: Low to High</SelectItem>
                    <SelectItem value="rarity-desc">Rarity: High to Low</SelectItem>
                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
                <span className="text-neutral-500 whitespace-nowrap flex-shrink-0 text-fluid-md">Show: </span>
                <Select value={itemsPerPage.toString()} onValueChange={(val) => setItemsPerPage(Number(val))}>
                  <SelectTrigger className="w-full sm:w-[120px] bg-neutral-900 border-neutral-700 rounded-sm text-off-white font-normal min-w-0 text-fluid-md">
                    <SelectValue placeholder="15 items" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-950/95 backdrop-blur-md border-neutral-700 rounded-sm">
                    <SelectItem value="15">15 items</SelectItem>
                    <SelectItem value="25">25 items</SelectItem>
                    <SelectItem value="50">50 items</SelectItem>
                    <SelectItem value="100">100 items</SelectItem>
                    <SelectItem value="250">250 items</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {paginatedNFTs.length > 0 ? (
        <>
          {/* Grid Views */}
          {(viewMode === 'grid-large' || viewMode === 'grid-medium' || viewMode === 'grid-small') && (
            <div ref={gridRef} className="mt-4 mb-8 grid w-full" style={{
              gridTemplateColumns: viewMode === 'grid-large' ? 'repeat(auto-fit, minmax(clamp(160px, 48vw, 300px), 1fr))' : 
                                  viewMode === 'grid-medium' ? 'repeat(auto-fit, minmax(clamp(140px, 45vw, 260px), 1fr))' :
                                  'repeat(auto-fit, minmax(clamp(120px, 40vw, 200px), 1fr))',
              gap: 'clamp(0.5rem, 0.8vw, 1rem)'
            }}>
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
                    className={`focus:outline-none focus:ring-2 focus:ring-[#ff0099] focus:ring-offset-2 focus:ring-offset-neutral-900 rounded-sm ${
                      focusedIndex === index ? 'ring-2 ring-[#ff0099] ring-offset-2 ring-offset-neutral-900' : ''
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
                      viewMode={viewMode}
                    />
                  </div>
                );
              })}
            </div>
          )}


          {/* Compact Table View */}
          {viewMode === 'compact' && (
            <div className="mt-4 mb-8 border border-neutral-700 rounded-sm overflow-hidden w-full">
              <div className="w-full">
                <table className="w-full table-fixed">
                <thead className="bg-neutral-800/50 border-b border-neutral-700">
                  <tr>
                    <th className="text-center px-1 sm:px-2 py-3 text-xs sm:text-sm font-medium text-[#FFFBEB] w-[5%] sm:w-[4%]">Favorite</th>
                    <th 
                      className="text-left px-2 sm:px-3 py-3 text-xs sm:text-sm font-medium text-[#FFFBEB] hover:text-neutral-200 cursor-pointer select-none w-[23%] sm:w-[21%]"
                      onClick={() => handleColumnSort('nft')}
                    >
                      <div className="flex items-center gap-1">
                        NFT
                        {columnSort?.field === 'nft' && (
                          <span className="text-[#ff0099]">
                            {columnSort.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left px-2 sm:px-3 py-3 text-xs sm:text-sm font-medium text-[#FFFBEB] hover:text-neutral-200 cursor-pointer select-none w-[10%] sm:w-[10%]"
                      onClick={() => handleColumnSort('rank')}
                    >
                      <div className="flex flex-col items-start gap-0.5">
                        <div className="flex items-center gap-1">
                          Rank
                          {columnSort?.field === 'rank' && (
                            <span className="text-[#ff0099]">
                              {columnSort.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] sm:text-[10px] text-neutral-500 font-normal whitespace-nowrap">(Out of {TOTAL_COLLECTION_SIZE})</div>
                      </div>
                    </th>
                    <th 
                      className="text-left px-2 sm:px-3 py-3 text-xs sm:text-sm font-medium text-[#FFFBEB] hover:text-neutral-200 cursor-pointer select-none w-[14%] sm:w-[10%]"
                      onClick={() => handleColumnSort('rarity')}
                    >
                      <div className="flex items-center gap-1">
                        Rarity
                        {columnSort?.field === 'rarity' && (
                          <span className="text-[#ff0099]">
                            {columnSort.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left px-2 sm:px-3 py-3 text-xs sm:text-sm font-medium text-[#FFFBEB] hover:text-neutral-200 cursor-pointer select-none w-[16%] sm:w-[18%]"
                      onClick={() => handleColumnSort('tier')}
                    >
                      <div className="flex items-center gap-1">
                        Tier
                        {columnSort?.field === 'tier' && (
                          <span className="text-[#ff0099]">
                            {columnSort.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-right px-2 sm:px-3 py-3 text-xs sm:text-sm font-medium text-[#FFFBEB] hover:text-neutral-200 cursor-pointer select-none w-[10%] sm:w-[12%]"
                      onClick={() => handleColumnSort('price')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        Price
                        {columnSort?.field === 'price' && (
                          <span className="text-[#ff0099]">
                            {columnSort.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="text-right px-2 sm:px-3 py-3 text-xs sm:text-sm font-medium text-[#FFFBEB] w-[16%]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedNFTs.map((nft, index) => (
                    <tr 
                      key={nft.id} 
                      tabIndex={0}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      className={`border-b border-neutral-700/50 hover:bg-neutral-800/30 transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff0099] focus:ring-inset ${
                        index % 2 === 0 ? 'bg-neutral-900/20' : ''
                      } ${focusedIndex === index ? 'ring-2 ring-[#ff0099] ring-inset' : ''}`}
                    >
                      <td className="px-1 sm:px-2 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleFavorite({
                              tokenId: nft.tokenId,
                              name: nft.name,
                              image: nft.image,
                              rarity: nft.rarity,
                              rank: nft.rank,
                              rarityPercent: nft.rarityPercent,
                            });
                          }}
                          className="p-1 hover:bg-neutral-700 rounded transition-colors mx-auto"
                        >
                          <Heart className={`w-4 h-4 ${isFavorited(nft.tokenId) ? "fill-[#ff0099] text-[#ff0099]" : "text-neutral-400 hover:text-neutral-300"}`} />
                        </button>
                      </td>
                      <td className="px-2 sm:px-3 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Link href={`/nft/${nft.cardNumber}${typeof window !== 'undefined' && window.location.search ? `?returnTo=${encodeURIComponent(`/nfts${window.location.search}`)}` : ''}`} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity min-w-0 flex-1">
                            <Image src={nft.image} alt={`${nft.name} - NFT #${nft.cardNumber}, Rank ${nft.rank}, ${nft.rarity} rarity, Tier ${nft.tier}`} width={32} height={32} className="rounded object-contain flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-normal text-[#FFFBEB] leading-tight line-clamp-2">NFT #{nft.cardNumber}</p>
                              <p className="text-xs text-neutral-500 leading-tight line-clamp-1">Token ID: {nft.tokenId}</p>
                            </div>
                          </Link>
                        </div>
                      </td>
                      <td className="px-2 sm:px-3 py-3 text-xs text-neutral-300 font-normal text-left">{nft.rank}</td>
                      <td className="px-2 sm:px-3 py-3 text-xs text-neutral-300 font-normal text-left line-clamp-2">{nft.rarityPercent}%</td>
                      <td className="px-2 sm:px-3 py-3 text-xs text-neutral-300 font-normal line-clamp-2">{nft.rarity.replace(" (Ultra-Legendary)", "")}</td>
                      <td className="px-2 sm:px-3 py-3 text-xs font-normal text-blue-500 text-right">
                        <div className="leading-tight">
                          <span className="whitespace-nowrap">{nft.priceEth}</span>
                          <span className="block sm:inline sm:ml-1">ETH</span>
                        </div>
                      </td>
                      <td className="px-2 sm:px-3 py-3 text-right">
                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 justify-end flex-wrap">
                            <Link
                              href={`/nft/${nft.cardNumber}${typeof window !== 'undefined' && window.location.search ? `?returnTo=${encodeURIComponent(`/nfts${window.location.search}`)}` : ''}`}
                              className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded-sm text-yellow-400 text-xs font-normal hover:bg-yellow-500/20 hover:border-yellow-500/50 transition-colors whitespace-nowrap"
                            >
                              View
                            </Link>
                            {nft.isForSale ? (
                              <Link
                                href={`/nft/${nft.cardNumber}${typeof window !== 'undefined' && window.location.search ? `?returnTo=${encodeURIComponent(`/nfts${window.location.search}`)}` : ''}`}
                                className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded-sm text-blue-400 text-xs font-normal hover:bg-blue-500/20 hover:border-blue-500/50 transition-colors whitespace-nowrap"
                              >
                                Buy
                              </Link>
                            ) : (
                              <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/30 rounded-sm text-green-400 text-xs font-normal whitespace-nowrap">
                                Sold
                              </span>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-neutral-400">No NFTs found matching your criteria</p>
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredNFTs.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}


