// components/nft-grid.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { TOTAL_COLLECTION_SIZE } from "@/lib/contracts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Pagination from "@/components/ui/pagination";
import NFTCard from "./nft-card";
import { LayoutGrid, Rows3, Grid3x3, Heart, Square } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useFavorites } from "@/hooks/useFavorites";
import Link from "next/link";
import Image from "next/image";
import { loadAllNFTs } from "@/lib/simple-data-service";
import { announceToScreenReader } from "@/lib/accessibility-utils";
import { convertIpfsUrl } from "@/lib/utils";

type NFTGridItem = {
  id: string;
  tokenId: string;
  cardNumber: number;
  listingId?: string | number;
  name: string;
  image: string;
  priceEth: number; // Static price from metadata
  priceWei: string | number | bigint;
  rank: number | string;
  rarity: string;
  rarityPercent: string | number;
  tier: string | number;
  isForSale: boolean;
  soldPriceEth?: number;
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
  listingStatus: {
    live: boolean;
    sold: boolean;
    secondary: boolean;
  };
  sortBy: string;
  setSortBy: (value: string) => void;
  itemsPerPage: number;
  setItemsPerPage: (value: number) => void;
  onFilteredCountChange?: (count: number) => void;
  onTraitCountsChange?: (counts: Record<string, Record<string, number>>) => void;
  filtersButton?: ReactNode;
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

export default function NFTGrid({ searchTerm, searchMode, selectedFilters, listingStatus, sortBy, setSortBy, itemsPerPage, setItemsPerPage, onFilteredCountChange, onTraitCountsChange, filtersButton }: NFTGridProps) {
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  
  // Get current URL params for returnTo navigation
  const getReturnToUrl = useMemo(() => {
    const params = new URLSearchParams();
    searchParams.forEach((value, key) => {
      params.set(key, value);
    });
    return `/nfts${params.toString() ? `?${params.toString()}` : ''}`;
  }, [searchParams]);
  const [columnSort, setColumnSort] = useState<{ field: string; direction: 'asc' | 'desc' } | null>({ field: 'nft', direction: 'asc' });
  const [nfts, setNfts] = useState<NFTGridItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allMetadata, setAllMetadata] = useState<NFTMetadata[]>([]);
  const [viewMode, setViewMode] = useState<'grid-large' | 'grid-medium' | 'grid-small' | 'compact'>('grid-large');
  const [tab, setTab] = useState<"all" | "live" | "sold">("all");
  const [pricingMappings, setPricingMappings] = useState<Record<number, { price_eth: number; listing_id?: number }>>({});
  const [ownershipData, setOwnershipData] = useState<Array<{ tokenId: number; owner: string; status: "ACTIVE" | "SOLD" }>>([]);
  const [isLoadingOwnership, setIsLoadingOwnership] = useState(false);
  const [ownershipError, setOwnershipError] = useState<string | null>(null);
  const [saleOrder, setSaleOrder] = useState<number[]>([]); // Array of tokenIds in sale order (most recent first)
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [scrollPosition, setScrollPosition] = useState<number>(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Load ownership data from API (only once on mount)
  useEffect(() => {
    let cancelled = false;
    
    const loadOwnership = async () => {
      setIsLoadingOwnership(true);
      try {
        const res = await fetch("/api/ownership");
        if (!res.ok) {
          throw new Error(`Failed to fetch ownership: ${res.statusText}`);
        }
        const data = await res.json();
        if (!cancelled) {
          setOwnershipData(data);
          setOwnershipError(null);
        }
      } catch (error) {
        // On error, default all to empty array (counts will be 0)
        if (!cancelled) {
          setOwnershipData([]);
          setOwnershipError(error instanceof Error ? error.message : "Failed to load ownership data");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingOwnership(false);
        }
      }
    };
    
    loadOwnership();
    
    return () => {
      cancelled = true;
    };
  }, []); // Only run once on mount

  // Load sale order from API (only once on mount, non-blocking)
  // This is used for "Sold: Most Recent" sorting only - not critical for page load
  useEffect(() => {
    let cancelled = false;
    
    const loadSaleOrder = async () => {
      try {
        // Add timeout to prevent blocking page load
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const res = await fetch("/api/nft/sale-order", {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          throw new Error(`Failed to fetch sale order: ${res.statusText}`);
        }
        const data = await res.json();
        if (!cancelled && data.saleOrder) {
          setSaleOrder(data.saleOrder);
        }
      } catch {
        // On error or timeout, default to empty array (will fall back to tokenId sorting)
        // This is non-critical - only affects "Sold: Most Recent" sort option
        if (!cancelled) {
          setSaleOrder([]);
        }
      }
    };
    
    // Load in background, don't block page render
    loadSaleOrder();
    
    return () => {
      cancelled = true;
    };
  }, []); // Only run once on mount
  
  // Create lookup map for fast access
  const ownershipMap = useMemo(() => {
    const map: Record<number, { owner: string; status: "ACTIVE" | "SOLD" }> = {};
    ownershipData.forEach((item) => {
      map[item.tokenId] = { owner: item.owner, status: item.status };
    });
    return map;
  }, [ownershipData]);
  
  // Compute counts from ownershipData (always full collection, never filtered)
  const totalAll = 7777;
  const totalActive = useMemo(() => {
    return ownershipData.filter((o) => o.status === "ACTIVE").length;
  }, [ownershipData]);
  
  const totalSold = useMemo(() => {
    return ownershipData.filter((o) => o.status === "SOLD").length;
  }, [ownershipData]);
  
  // Load pricing mappings from nft-mapping.csv (static price data only, no status)
  useEffect(() => {
    const loadPricingMappings = async () => {
      try {
        const response = await fetch('/data/nft-mapping/nft-mapping.csv');
        if (response.ok) {
          const csvText = await response.text();
          const lines = csvText.trim().split('\n');
          const dataLines = lines.slice(1);
          
          const mappings: Record<number, { price_eth: number; listing_id?: number }> = {};
          
          dataLines.forEach((line) => {
            if (!line.trim()) return;
            
            const parts: string[] = [];
            let current = '';
            let inQuotes = false;
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                parts.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            parts.push(current.trim());
            
            // nft-mapping.csv format: listingId,tokenId,name,rarityTier,price
            if (parts.length >= 5) {
              const listingId = parts[0];
              const tokenId = parts[1];
              const price = parts[4];
              
              const tokenIdNum = parseInt(tokenId);
              const listingIdNum = parseInt(listingId);
              const priceNum = parseFloat(price);
              
              if (!isNaN(tokenIdNum) && !isNaN(priceNum) && priceNum > 0) {
                mappings[tokenIdNum] = {
                  price_eth: priceNum,
                  listing_id: !isNaN(listingIdNum) ? listingIdNum : undefined,
                };
              }
            }
          });
          
          setPricingMappings(mappings);
        }
        // If response is not ok, continue without pricing data - NFTs will show with price 0
      } catch {
        // Error loading pricing mappings - continue without pricing data - NFTs will show with price 0
      }
    };
    
    loadPricingMappings();
  }, []);

  // Favorites functionality
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
        
        // Set metadata directly (NFTData is compatible with NFTMetadata, cast through unknown for type compatibility)
        setAllMetadata((mainMetadata || []) as unknown as NFTMetadata[]);

      } catch {
        // Error loading NFT metadata - set empty array on error to prevent crashes
        setAllMetadata([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadMetadata();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, searchTerm, listingStatus, tab]);

  // Process NFTs from metadata and check marketplace listings
  useEffect(() => {
    if (allMetadata.length > 0) {
      const processNFTs = async () => {
        try {
          const mappedNFTs: NFTGridItem[] = await Promise.all(
            allMetadata
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
              let soldPriceEth = undefined;
              let listingId = undefined;
              let isForSale = false;
              
              // Get status from ownershipMap
              // IMPORTANT: Only use ownership status if ownership data has actually loaded
              // If ownershipData is empty or still loading, default to ACTIVE (optimistic)
              const ownershipInfo = ownershipMap[tokenIdNum];
              const hasOwnershipData = Object.keys(ownershipMap).length > 0; // Check if we have any ownership data at all
              const status = hasOwnershipData ? (ownershipInfo?.status || "ACTIVE") : "ACTIVE";
              // Only mark as sold if we have explicit SOLD status AND ownership data has loaded
              const isSold = hasOwnershipData && status === 'SOLD';
              
              // Get price from pricing mappings
              const pricing = pricingMappings[tokenIdNum];
              if (pricing) {
                priceEth = pricing.price_eth;
                listingId = pricing.listing_id || (tokenIdNum + 10000);
              }
              
              if (isSold) {
                // For sold NFTs, use price from pricing mappings as sold price
                soldPriceEth = priceEth;
                isForSale = false;
              } else {
                // For active listings, use pricing mappings
                isForSale = priceEth > 0;
              }
              
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
                soldPriceEth: soldPriceEth,
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
         } catch {
           // Error processing NFTs from metadata - set empty array
           setNfts([]);
         }
      };

      processNFTs();
    }
  }, [allMetadata, pricingMappings, ownershipMap]);


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
      selectedFilters.rarity.includes(nft.rarity);

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

    // Tab filtering (All/Live/Sold) - this is the primary status filter
    const tokenIdNum = parseInt(nft.tokenId);
    const status = ownershipMap[tokenIdNum]?.status || "ACTIVE";
    let matchesTab = true;
    
    if (tab === "live") {
      matchesTab = status === "ACTIVE";
    } else if (tab === "sold") {
      matchesTab = status === "SOLD";
    }
    // tab === "all" shows everything, so matchesTab stays true

    return (
      matchesSearch &&
      matchesRarity &&
      matchesBackground &&
      matchesSkinTone &&
      matchesShirt &&
      matchesEyewear &&
      matchesHair &&
      matchesHeadwear &&
      matchesTab
    );
  });
  }, [nfts, searchTerm, searchMode, selectedFilters, tab, ownershipMap]);

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
            // Sort by token ID numerically, not alphabetically by name
            return multiplier * (parseInt(a.tokenId) - parseInt(b.tokenId));
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
        case "favorites":
          // Sort favorites first - if user has favorites, show them first
          const aIsFavorited = isFavorited(a.tokenId);
          const bIsFavorited = isFavorited(b.tokenId);
          if (aIsFavorited && !bIsFavorited) return -1;
          if (!aIsFavorited && bIsFavorited) return 1;
          // If both are favorited or both are not, maintain original order
          return 0;
        case "most-recent":
          // Sort by most recent sale - use sale order from API (most recent first)
          // This works best when viewing the "Sold" tab
          if (saleOrder.length > 0) {
            const aIndex = saleOrder.indexOf(parseInt(a.tokenId));
            const bIndex = saleOrder.indexOf(parseInt(b.tokenId));
            // If both are in sale order, sort by their position (lower index = more recent)
            if (aIndex !== -1 && bIndex !== -1) {
              return aIndex - bIndex;
            }
            // If only one is in sale order, prioritize it
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
          }
          // Fallback: reverse tokenId order if sale order not available
          return parseInt(b.tokenId) - parseInt(a.tokenId);
        case "rank-asc":
          return Number(a.rank) - Number(b.rank);
        case "rank-desc":
          return Number(b.rank) - Number(a.rank);
        case "rarity-asc":
          return Number(a.rarityPercent) - Number(b.rarityPercent);
        case "rarity-desc":
          return Number(b.rarityPercent) - Number(a.rarityPercent);
        case "price-asc":
          return Number(a.priceWei) - Number(b.priceWei);
        case "price-desc":
          return Number(b.priceWei) - Number(a.priceWei);
        default:
          return 0;
      }
    });
  }, [filteredNFTs, sortBy, columnSort, isFavorited, saleOrder]);


  // Pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedNFTs = sortedNFTs.slice(startIndex, endIndex);

  const totalPages = Math.ceil(sortedNFTs.length / itemsPerPage) || 1;

  // Update page if out of bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  // Compute trait counts from ALL NFTs (not filtered) so all options remain visible
  const traitCounts = useMemo(() => {
    return computeTraitCounts(nfts, ["background", "skinTone", "shirt", "eyewear", "hair", "headwear", "rarity"]);
  }, [nfts]);

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

  if (isLoading || isLoadingOwnership) {
    return (
      <div className="w-full max-w-full">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">NFT Collection</h2>
          {isLoading && !isLoadingOwnership && (
            <div className="text-body-sm font-normal text-pink-500 mt-1">
              Loading...
            </div>
          )}
        </div>
        <div className="mt-8 mb-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 4xl:grid-cols-6 gap-x-4 gap-y-8">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="bg-neutral-800 rounded-[2px] p-4 animate-pulse">
              <div className="aspect-square bg-neutral-700 rounded-[2px] mb-3"></div>
              <div className="h-4 bg-neutral-700 rounded-[2px] mb-2"></div>
              <div className="h-3 bg-neutral-700 rounded-[2px] mb-1"></div>
              <div className="h-3 bg-neutral-700 rounded-[2px] w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden" data-nft-grid-container="true">
      {/* Header section: CSS Grid layout for responsive alignment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 w-full" style={{ maxWidth: '100%' }}>
        {/* Row 1, Col 1: NFT Collection heading */}
        <h2 className="text-h2 font-bold sm:col-span-1">NFT Collection</h2>
        
        {/* Row 1, Col 2: Filters button - right aligned on larger screens */}
        <div className="flex justify-start sm:justify-end items-center sm:col-span-1">
          {filtersButton}
        </div>

        {/* Row 2, Col 1: Status tabs */}
        <div className="flex items-center justify-start flex-shrink-0 min-w-0 sm:col-span-1">
          <div className="flex items-center gap-0 border border-neutral-700 rounded-[2px] p-1 bg-neutral-900/50 w-fit overflow-hidden flex-nowrap">
            <button
              onClick={() => setTab("all")}
              className={`px-4 py-2 text-body-xs font-normal transition-all duration-300 ease-in-out cursor-pointer rounded-[2px] whitespace-nowrap flex-shrink-0 leading-tight ${
                tab === "all"
                  ? "bg-brand-pink text-[#FFFBFB]"
                  : "text-neutral-400 hover:text-neutral-300 hover:bg-neutral-800"
              }`}
              aria-label="Show all NFTs"
              aria-pressed={tab === "all"}
            >
              All ({totalAll})
            </button>
            <button
              onClick={() => setTab("live")}
              className={`px-4 py-2 text-body-xs font-normal transition-all duration-300 ease-in-out cursor-pointer rounded-[2px] whitespace-nowrap flex-shrink-0 leading-tight ${
                tab === "live"
                  ? "bg-blue-500 text-[#FFFBFB]"
                  : "text-neutral-400 hover:text-neutral-300 hover:bg-neutral-800"
              }`}
              aria-label="Show live NFTs"
              aria-pressed={tab === "live"}
            >
              Live ({totalActive})
            </button>
            <button
              onClick={() => setTab("sold")}
              className={`px-4 py-2 text-body-xs font-normal transition-all duration-300 ease-in-out cursor-pointer rounded-[2px] whitespace-nowrap flex-shrink-0 leading-tight ${
                tab === "sold"
                  ? "bg-[#00FF99] text-[#000000]"
                  : "text-neutral-400 hover:text-neutral-300 hover:bg-neutral-800"
              }`}
              aria-label="Show sold NFTs"
              aria-pressed={tab === "sold"}
            >
              Sold ({totalSold})
            </button>
          </div>
        </div>

        {/* Row 2, Col 2: Sort by dropdown - right aligned on larger screens */}
        <div className="flex items-center gap-2 min-w-0 sm:justify-end sm:col-span-1">
          <span className="text-body-sm font-light opacity-80 whitespace-nowrap flex-shrink-0">Sort by:</span>
          <Select value={sortBy} onValueChange={(value) => {
            setSortBy(value);
            setColumnSort(null);
          }}>
            <SelectTrigger className="w-full sm:w-[180px] md:w-[220px] max-w-full bg-neutral-900 border-neutral-700 rounded-[2px] text-[#FFFBEB] text-body-sm font-normal focus-visible:ring-[#ff0099] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 flex-shrink-0 min-w-0">
              <SelectValue placeholder="Default" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-950/95 backdrop-blur-md border-neutral-700 rounded-[2px]" sideOffset={4} align="start" collisionPadding={8}>
              <SelectItem value="default" className="text-body-sm font-normal">Default</SelectItem>
              <SelectItem value="favorites" className="text-body-sm font-normal">Favorites</SelectItem>
              <SelectItem value="most-recent" className="text-body-sm font-normal">Sold: Most Recent</SelectItem>
              <SelectItem value="price-asc" className="text-body-sm font-normal">Price: Low to High</SelectItem>
              <SelectItem value="price-desc" className="text-body-sm font-normal">Price: High to Low</SelectItem>
              <SelectItem value="rank-desc" className="text-body-sm font-normal">Rank: High to Low</SelectItem>
              <SelectItem value="rank-asc" className="text-body-sm font-normal">Rank: Low to High</SelectItem>
              <SelectItem value="rarity-desc" className="text-body-sm font-normal">Rarity: High to Low</SelectItem>
              <SelectItem value="rarity-asc" className="text-body-sm font-normal">Rarity: Low to High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Row 3, Col 1: View toggles with label on small screens */}
        <div className="flex items-center gap-2 flex-shrink-0 min-w-0 sm:col-span-1">
          <span className="text-body-sm font-light opacity-80 whitespace-nowrap flex-shrink-0 sm:hidden">View:</span>
          <TooltipProvider>
            <div className="relative flex items-center gap-2 border border-neutral-700 rounded-[2px] p-1 flex-nowrap overflow-hidden">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      setViewMode('grid-large')
                      announceToScreenReader('Switched to large grid view')
                    }}
                    className={`p-2 rounded-[2px] transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus:rounded-[2px] cursor-pointer ${viewMode === 'grid-large' ? 'bg-neutral-800 text-[#ff0099]' : 'text-neutral-500 hover:text-neutral-300'}`}
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
                    className={`p-2 rounded-[2px] transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus:rounded-[2px] cursor-pointer ${viewMode === 'grid-medium' ? 'bg-neutral-800 text-[#ff0099]' : 'text-neutral-500 hover:text-neutral-300'}`}
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
                    className={`p-2 rounded-[2px] transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus:rounded-[2px] cursor-pointer ${viewMode === 'grid-small' ? 'bg-neutral-800 text-[#ff0099]' : 'text-neutral-500 hover:text-neutral-300'}`}
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
                    className={`p-2 rounded-[2px] transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus:rounded-[2px] cursor-pointer ${viewMode === 'compact' ? 'bg-neutral-800 text-[#ff0099]' : 'text-neutral-500 hover:text-neutral-300'}`}
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
        </div>

        {/* Row 3, Col 2: Show dropdown - right aligned on larger screens */}
        <div className="flex items-center gap-2 min-w-0 sm:justify-end sm:col-span-1">
          <span className="text-body-sm font-light opacity-80 whitespace-nowrap flex-shrink-0">Show:</span>
          <Select value={itemsPerPage.toString()} onValueChange={(val) => setItemsPerPage(Number(val))}>
            <SelectTrigger className="w-full sm:w-[130px] md:w-[150px] max-w-full bg-neutral-900 border-neutral-700 rounded-[2px] text-[#FFFBEB] text-body-sm font-normal focus-visible:ring-[#ff0099] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 flex-shrink-0 min-w-0">
              <SelectValue placeholder="15 items" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-950/95 backdrop-blur-md border-neutral-700 rounded-[2px]" sideOffset={4} align="end" collisionPadding={8}>
              <SelectItem value="15" className="text-body-sm font-normal">15 items</SelectItem>
              <SelectItem value="25" className="text-body-sm font-normal">25 items</SelectItem>
              <SelectItem value="50" className="text-body-sm font-normal">50 items</SelectItem>
              <SelectItem value="100" className="text-body-sm font-normal">100 items</SelectItem>
              <SelectItem value="250" className="text-body-sm font-normal">250 items</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Row 4, Col 1: Item count */}
        <div className="sm:col-span-1">
          {filteredNFTs.length > 0 && (
            <div className="text-body-xs font-thin leading-tight opacity-80">
              {`${startIndex + 1}-${Math.min(endIndex, filteredNFTs.length)} of ${filteredNFTs.length} NFTs`}
            </div>
          )}
        </div>

        {/* Row 4, Col 2: Warning text (if needed) */}
        {ownershipError && (
          <div className="text-body-xs leading-tight text-yellow-500 sm:justify-end flex sm:col-span-1" role="alert" aria-live="polite">
            ⚠️ Some ownership data may be out of date
          </div>
        )}
      </div>

      {paginatedNFTs.length > 0 ? (
        <>
           {/* Grid Views */}
           {(viewMode === 'grid-large' || viewMode === 'grid-medium' || viewMode === 'grid-small') && (
             <div ref={gridRef} className="mb-8 w-full">
               <div ref={gridContainerRef} className="w-full flex flex-wrap justify-start gap-x-4 gap-y-6">
                 {paginatedNFTs.map((nft, index) => (
                     <div
                       key={nft.id}
                       tabIndex={0}
                       onKeyDown={(e) => handleKeyDown(e, index)}
                       className={`${viewMode === 'grid-large' ? 'w-full sm:w-[calc(50%-8px)] md:w-[calc(33.333%-11px)] lg:w-[calc(33.333%-11px)] xl:w-[calc(25%-12px)] 2xl:w-[calc(20%-13px)] 4xl:w-[calc(16.666%-13px)]' : viewMode === 'grid-medium' ? 'w-full sm:w-[calc(50%-8px)] md:w-[calc(33.333%-11px)] lg:w-[calc(33.333%-11px)] xl:w-[calc(25%-12px)] 2xl:w-[calc(20%-13px)]' : 'w-full sm:w-[calc(50%-8px)] md:w-[calc(33.333%-11px)] lg:w-[calc(33.333%-11px)] xl:w-[calc(25%-12px)]'} focus:outline-none focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-1 rounded-[2px] overflow-visible ${
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
                         soldPriceEth={nft.soldPriceEth}
                         viewMode={viewMode}
                         priority={currentPage === 1 && index === 0}
                         returnToUrl={getReturnToUrl}
                       />
                     </div>
                 ))}
               </div>
             </div>
           )}


          {/* Compact Table View */}
          {viewMode === 'compact' && (
            <div className="mt-4 mb-8 border border-neutral-700 rounded-[2px] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                <thead className="bg-neutral-800/50 border-b border-neutral-700">
                  <tr>
                    <th 
                      className="text-left px-4 py-3 text-body-xs sm:text-body-sm font-normal text-[#FFFBEB] hover:text-neutral-200 cursor-pointer select-none"
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
                      className="text-left px-6 py-3 pl-8 text-body-xs sm:text-body-sm font-normal text-[#FFFBEB] hover:text-neutral-200 cursor-pointer select-none"
                      onClick={() => handleColumnSort('rank')}
                    >
                      <div className="flex items-center gap-1">
                        Rank
                        {columnSort?.field === 'rank' && (
                          <span className="text-[#ff0099]">
                            {columnSort.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-left px-4 py-3 text-body-xs sm:text-body-sm font-normal text-[#FFFBEB] hover:text-neutral-200 cursor-pointer select-none"
                      onClick={() => handleColumnSort('rarity')}
                      style={{ maxWidth: '120px' }}
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
                      className="text-left px-4 py-3 text-body-xs sm:text-body-sm font-normal text-[#FFFBEB] hover:text-neutral-200 cursor-pointer select-none"
                      onClick={() => handleColumnSort('tier')}
                      style={{ maxWidth: '150px' }}
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
                      className="text-left px-4 py-3 text-body-xs sm:text-body-sm font-normal text-[#FFFBEB] hover:text-neutral-200 cursor-pointer select-none"
                      onClick={() => handleColumnSort('price')}
                    >
                      <div className="flex items-center gap-1">
                        Price
                        {columnSort?.field === 'price' && (
                          <span className="text-[#ff0099]">
                            {columnSort.direction === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="text-center px-4 py-3 text-body-xs sm:text-body-sm font-medium text-[#FFFBEB] hover:text-neutral-200 cursor-pointer select-none"
                      onClick={() => {
                        setSortBy("favorites");
                        setColumnSort(null); // Clear column sort when using favorites
                      }}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Favorite
                        {sortBy === "favorites" && (
                          <span className="text-[#ff0099]">★</span>
                        )}
                      </div>
                    </th>
                    <th className="text-right px-4 py-3 text-body-xs sm:text-body-sm font-normal text-[#FFFBEB]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedNFTs.map((nft, index) => (
                    <tr 
                      key={nft.id} 
                      tabIndex={0}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      className={`border-b border-neutral-700/50 hover:bg-neutral-800/30 transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-inset ${
                        index % 2 === 0 ? 'bg-neutral-900/20' : ''
                      } ${focusedIndex === index ? 'ring-2 ring-[#ff0099] ring-inset' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Link href={`/nft/${nft.cardNumber && !isNaN(nft.cardNumber) ? nft.cardNumber : (parseInt(nft.tokenId) + 1)}${getReturnToUrl !== '/nfts' ? `?returnTo=${encodeURIComponent(getReturnToUrl)}` : ''}`} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity duration-300 ease-in-out">
                            <Image src={nft.image} alt={`${nft.name} - NFT #${nft.cardNumber || (parseInt(nft.tokenId) + 1)}, Rank ${nft.rank}, ${nft.rarity} rarity, Tier ${nft.tier}`} width={40} height={40} className="rounded object-contain" style={{ width: "auto", height: "40px" }} />
                            <div>
                              <p className="text-body-xs font-normal text-[#FFFBEB] truncate">{nft.name}</p>
                              <p className="text-body-xs text-neutral-500 truncate">Token ID: {nft.tokenId}</p>
                            </div>
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-[clamp(11px,0.4vw+5px,14px)] text-neutral-300 truncate font-normal pl-8">{nft.rank} / {TOTAL_COLLECTION_SIZE}</td>
                      <td className="px-4 py-3 text-[clamp(11px,0.4vw+5px,14px)] text-neutral-300 font-normal whitespace-nowrap overflow-hidden text-ellipsis max-w-[120px]">{nft.rarityPercent}%</td>
                      <td className="px-4 py-3 text-[clamp(11px,0.4vw+5px,14px)] text-neutral-300 font-normal whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">{nft.rarity}</td>
                      {(() => {
                        const tokenIdNum = parseInt(nft.tokenId);
                        const status = ownershipMap[tokenIdNum]?.status || "ACTIVE";
                        const isSold = status === 'SOLD';
                        return (
                          <>
                            <td className={`px-4 py-3 text-body-xs font-normal whitespace-nowrap min-w-[80px] ${isSold ? 'text-[#00FF99]' : 'text-blue-500'}`}>{nft.priceEth} ETH</td>
                            <td className="px-4 py-3 text-center">
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
                                className="p-1 hover:bg-transparent transition-colors duration-300 ease-in-out"
                                aria-label={isFavorited(nft.tokenId) ? "Remove from favorites" : "Add to favorites"}
                              >
                                <Heart className={`w-4 h-4 transition-colors duration-300 ease-in-out cursor-pointer ${isFavorited(nft.tokenId) ? "fill-[#FF0099] text-[#FF0099]" : "text-[#FFFBE8] hover:text-[#FF0099]"}`} />
                              </button>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center gap-2 justify-end">
                                  {isSold ? (
                                    <Link
                                      href={`/nft/${nft.cardNumber && !isNaN(nft.cardNumber) ? nft.cardNumber : (parseInt(nft.tokenId) + 1)}${getReturnToUrl !== '/nfts' ? `?returnTo=${encodeURIComponent(getReturnToUrl)}` : ''}`}
                                      className="px-3 py-2 bg-[#00FF99]/10 border border-[#00FF99]/30 rounded-sm text-[#00FF99] text-nft-button font-normal hover:bg-[#00FF99]/20 hover:border-[#00FF99]/50 transition-colors duration-300 ease-in-out whitespace-nowrap cursor-pointer"
                                    >
                                      Sold
                                    </Link>
                                  ) : (
                                    <Link
                                      href={`/nft/${nft.cardNumber && !isNaN(nft.cardNumber) ? nft.cardNumber : (parseInt(nft.tokenId) + 1)}${getReturnToUrl !== '/nfts' ? `?returnTo=${encodeURIComponent(getReturnToUrl)}` : ''}`}
                                      className="px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-sm text-blue-400 text-nft-button font-normal hover:bg-blue-500/20 hover:border-blue-500/50 transition-colors duration-300 ease-in-out whitespace-nowrap"
                                    >
                                      Buy
                                    </Link>
                                  )}
                              </div>
                            </td>
                          </>
                        );
                      })()}
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


