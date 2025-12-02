// components/nft-grid.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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

export default function NFTGrid({ searchTerm, searchMode, selectedFilters, listingStatus, sortBy, setSortBy, itemsPerPage, setItemsPerPage, onFilteredCountChange, onTraitCountsChange }: NFTGridProps) {
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
  const [allMetadata, setAllMetadata] = useState<unknown[]>([]);
  const [viewMode, setViewMode] = useState<'grid-large' | 'grid-medium' | 'grid-small' | 'compact'>('grid-large');
  const [pricingMappings, setPricingMappings] = useState<Record<number, { price_eth: number; listing_id?: number }>>({});
  const [inventoryData, setInventoryData] = useState<Record<number, { owner: string; status: string; price?: number }>>({});
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [scrollPosition, setScrollPosition] = useState<number>(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  
  // Function to refresh inventory data from real-time API
  const refreshInventoryData = async (tokenIds?: number[]) => {
    try {
      // If no tokenIds provided, refresh from CSV (initial load)
      if (!tokenIds || tokenIds.length === 0) {
        const response = await fetch('/data/nft-mapping/full-inventory.csv');
        
        if (response.ok) {
          const csvText = await response.text();
          const lines = csvText.trim().split('\n');
          const dataLines = lines.slice(1);
          
          const mappings: Record<number, { price_eth: number; listing_id?: number }> = {};
          const inventory: Record<number, { owner: string; status: string; price?: number }> = {};
          
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
            
            if (parts.length >= 7) {
              const listingId = parts[0];
              const tokenId = parts[1];
              const owner = parts[3];
              const price = parts[5];
              const status = parts[6];
              
              const tokenIdNum = parseInt(tokenId);
              const listingIdNum = parseInt(listingId);
              const priceNum = parseFloat(price);
              
              if (!isNaN(tokenIdNum)) {
                // Update inventory
                inventory[tokenIdNum] = {
                  owner: owner.toLowerCase(),
                  status: status,
                  price: !isNaN(priceNum) ? priceNum : undefined
                };
                
                // Update pricing mappings for ACTIVE listings
                if (!isNaN(priceNum) && status === 'ACTIVE') {
                  mappings[tokenIdNum] = {
                    price_eth: priceNum,
                    listing_id: !isNaN(listingIdNum) ? listingIdNum : undefined
                  };
                }
              }
            }
          });
          
          setPricingMappings(mappings);
          setInventoryData(inventory);
        }
      } else {
        // Refresh specific tokenIds from real-time API
        const response = await fetch('/api/nft/ownership', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tokenIds }),
        });
        
        if (response.ok) {
          const data = await response.json();
          const ownership = data.ownership || {};
          
          // Update inventory data with real-time ownership
          // Prioritize blockchain ownership: if owner changed away from marketplace → SOLD, if owner is marketplace → ACTIVE
          setInventoryData((prev) => {
            const updated = { ...prev };
            Object.entries(ownership).forEach(([tokenIdStr, data]: [string, unknown]) => {
              const tokenId = parseInt(tokenIdStr);
              const { owner } = data as { owner: string; isSold: boolean };
              
              if (!isNaN(tokenId)) {
                const ownerLower = owner.toLowerCase();
                const marketplaceAddr = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS?.toLowerCase() || '';
                
                // Prioritize blockchain ownership: if owner changed away from marketplace → SOLD, if owner is marketplace → ACTIVE
                const status = (ownerLower && ownerLower !== marketplaceAddr) ? 'SOLD' : 'ACTIVE';
                
                // Create or update entry, preserving price from CSV if it exists
                updated[tokenId] = {
                  owner: ownerLower,
                  status: status,
                  price: prev[tokenId]?.price, // Preserve existing price from CSV
                };
                
                // Remove from pricing mappings if sold
                if (status === 'SOLD') {
                  setPricingMappings((prevMappings) => {
                    const updatedMappings = { ...prevMappings };
                    delete updatedMappings[tokenId];
                    return updatedMappings;
                  });
                }
              }
            });
            return updated;
          });
        }
      }
     } catch {
       // Silent fail - inventory data will use CSV fallback
     }
  };

  // Load pricing mappings from full-inventory.csv (includes sale status)
  useEffect(() => {
    refreshInventoryData();
  }, []);
  
  // Refresh inventory when page becomes visible (user returns from detail page)
  useEffect(() => {
    let lastRefreshTime = 0;
    const REFRESH_COOLDOWN = 5000; // Don't refresh more than once every 5 seconds
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        // Throttle refreshes to avoid excessive API calls
        if (now - lastRefreshTime > REFRESH_COOLDOWN) {
          lastRefreshTime = now;
          // Refresh inventory for currently displayed NFTs
          if (nfts.length > 0) {
            const tokenIds = nfts.map(nft => parseInt(nft.tokenId));
            refreshInventoryData(tokenIds);
          } else {
            // If no NFTs loaded yet, refresh from CSV
            refreshInventoryData();
          }
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [nfts]);

  // Listen for custom purchase events (from purchase transactions on the same page)
  // This avoids RPC rate limiting while still providing immediate updates
  useEffect(() => {
    const handlePurchase = (e: Event) => {
      const custom = e as CustomEvent<{ tokenId: number; priceEth?: number }>;
      const tokenIdNum = custom.detail?.tokenId;
      
      if (tokenIdNum !== undefined && typeof tokenIdNum === 'number') {
        // Update pricing mappings to remove this NFT from sale
        setPricingMappings((prev) => {
          const updated = { ...prev };
          if (updated[tokenIdNum]) {
            delete updated[tokenIdNum];
          }
          return updated;
        });
        
        // Update inventory data to mark as SOLD
        setInventoryData((prev) => {
          const updated = { ...prev };
          // Create entry if it doesn't exist, or update existing entry
          const existing = updated[tokenIdNum];
          updated[tokenIdNum] = {
            owner: existing?.owner || '',
            status: 'SOLD',
            price: existing?.price || custom.detail?.priceEth
          };
          return updated;
        });
        
        // Announce to screen reader
        announceToScreenReader(`NFT #${tokenIdNum + 1} has been purchased`);
      }
    };

    window.addEventListener('nftPurchased', handlePurchase as EventListener);
    return () => {
      window.removeEventListener('nftPurchased', handlePurchase as EventListener);
    };
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
  }, [itemsPerPage, searchTerm, listingStatus]);

  // Process NFTs from metadata and check marketplace listings
  useEffect(() => {
    if (allMetadata.length > 0) {
      const processNFTs = async () => {
        try {
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
              
              // Use static price data from pricing mappings and inventory - no RPC calls for display
              const tokenIdNum = parseInt(tokenId);
              let priceEth = 0;
              let soldPriceEth = undefined;
              let listingId = undefined;
              let isForSale = false;
              
              // Check inventory status first (most reliable)
              const inventory = inventoryData[tokenIdNum];
              const isSold = inventory?.status === 'SOLD';
              
              if (isSold) {
                // For sold NFTs, use price from inventory (sold price)
                soldPriceEth = inventory.price || 0;
                priceEth = soldPriceEth;
                isForSale = false;
              } else {
                // For active listings, use pricing mappings
                const pricing = pricingMappings[tokenIdNum];
                if (pricing) {
                  priceEth = pricing.price_eth;
                  // Generate listing ID if not provided (all NFTs are live listings)
                  listingId = pricing.listing_id || (tokenIdNum + 10000); // Generate listing ID
                }
                isForSale = inventory?.status === 'ACTIVE' || (priceEth > 0 && !isSold);
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
           setNfts([]);
         }
      };

      processNFTs();
    }
  }, [allMetadata, pricingMappings, inventoryData]);


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

    // Listing status filtering
    const tokenIdNum = parseInt(nft.tokenId);
    const inventory = inventoryData[tokenIdNum];
    
    let matchesListingStatus = false;
    
    // If no listing status is selected, show all (shouldn't happen, but safety check)
    if (!listingStatus.live && !listingStatus.sold && !listingStatus.secondary) {
      matchesListingStatus = true;
    } else {
      // Check each status
      if (listingStatus.live && inventory?.status === 'ACTIVE') {
        matchesListingStatus = true;
      }
      if (listingStatus.sold && inventory?.status === 'SOLD') {
        matchesListingStatus = true;
      }
      if (listingStatus.secondary) {
        // Secondary market: owner is not the marketplace (coming soon - placeholder)
        // For now, this won't match anything since it's disabled
        matchesListingStatus = false;
      }
    }

    return (
      matchesSearch &&
      matchesRarity &&
      matchesBackground &&
      matchesSkinTone &&
      matchesShirt &&
      matchesEyewear &&
      matchesHair &&
      matchesHeadwear &&
      matchesListingStatus
    );
  });
  }, [nfts, searchTerm, searchMode, selectedFilters, listingStatus, inventoryData]);

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
  }, [filteredNFTs, sortBy, columnSort, isFavorited]);


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

  if (isLoading) {
    return (
      <div className="w-full max-w-full">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">NFT Collection</h2>
          <div className="text-body-sm font-medium text-pink-500 mt-1">Loading...</div>
        </div>
        <div className="mt-8 mb-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-8">
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
       <div className="w-full">
         <div className="flex flex-col gap-3 mb-6 pl-2">
          {/* Header section: Title, stats, and controls all together */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Left side: Title and stats */}
            <div className="flex-shrink-0 min-w-0">
              <h2 className="text-3xl font-bold mb-2">NFT Collection</h2>
            {filteredNFTs.length > 0 && (
              <>
                <div className="text-body-sm font-medium mt-1">
                  <span className="text-blue-400">
                    {filteredNFTs.filter(nft => {
                      const inv = inventoryData[parseInt(nft.tokenId)];
                      return inv?.status === 'ACTIVE';
                    }).length} Live
                  </span>
                  <span className="text-neutral-400"> • </span>
                  <span className="text-green-400">
                    {filteredNFTs.filter(nft => {
                      const inv = inventoryData[parseInt(nft.tokenId)];
                      return inv?.status === 'SOLD';
                    }).length} Sold
                  </span>
                  {listingStatus.secondary && (
                    <>
                      <span className="text-neutral-400"> • </span>
                      <span className="text-purple-400">
                        {filteredNFTs.filter(nft => {
                          const inv = inventoryData[parseInt(nft.tokenId)];
                          const marketplaceAddr = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS?.toLowerCase();
                          return inv && inv.owner !== marketplaceAddr && inv.status === 'ACTIVE';
                        }).length} Secondary
                      </span>
                    </>
                  )}
                </div>
                <div className="text-[clamp(11px,0.4vw+5px,14px)] text-neutral-500 mt-1.5">
                  {startIndex + 1}-{Math.min(endIndex, filteredNFTs.length)} of {filteredNFTs.length} NFTs
                </div>
              </>
            )}
          </div>

          {/* Right side: View toggles and dropdowns */}
          <div className="flex flex-col gap-3 items-end ml-auto">
            {/* View Mode Toggles */}
            <TooltipProvider>
              <div className="flex items-center gap-3 border border-neutral-700 rounded-[2px] p-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        setViewMode('grid-large')
                        announceToScreenReader('Switched to large grid view')
                      }}
                      className={`p-2 rounded-[2px] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus:rounded-[2px] ${viewMode === 'grid-large' ? 'bg-neutral-800 text-[#ff0099]' : 'text-neutral-500 hover:text-neutral-300'}`}
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
                      className={`p-2 rounded-[2px] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus:rounded-[2px] ${viewMode === 'grid-medium' ? 'bg-neutral-800 text-[#ff0099]' : 'text-neutral-500 hover:text-neutral-300'}`}
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
                      className={`p-2 rounded-[2px] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus:rounded-[2px] ${viewMode === 'grid-small' ? 'bg-neutral-800 text-[#ff0099]' : 'text-neutral-500 hover:text-neutral-300'}`}
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
                      className={`p-2 rounded-[2px] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-1 focus:rounded-[2px] ${viewMode === 'compact' ? 'bg-neutral-800 text-[#ff0099]' : 'text-neutral-500 hover:text-neutral-300'}`}
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
            <div className={`flex items-center gap-3 ${viewMode === 'compact' ? 'flex-wrap' : 'flex-shrink-0'}`}>
              <div className="flex items-center gap-2">
                <span className="text-sidebar text-neutral-500 whitespace-nowrap">Sort by:</span>
                <Select value={sortBy} onValueChange={(value) => {
                  setSortBy(value);
                  setColumnSort(null); // Clear column sort when using dropdown
                }}>
                  <SelectTrigger className={`${viewMode === 'compact' ? 'min-w-[180px] w-[180px]' : 'min-w-[200px] w-[200px] sm:min-w-[220px] sm:w-[220px]'} bg-neutral-900 border-neutral-700 rounded-[2px] text-[#FFFBEB] text-sidebar font-normal focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-1`}>
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-950/95 backdrop-blur-md border-neutral-700 rounded-[2px]">
                    <SelectItem value="default" className="text-sidebar">Default</SelectItem>
                    <SelectItem value="favorites" className="text-sidebar">Favorites</SelectItem>
                    <SelectItem value="price-asc" className="text-sidebar">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc" className="text-sidebar">Price: High to Low</SelectItem>
                    <SelectItem value="rank-desc" className="text-sidebar">Rank: High to Low</SelectItem>
                    <SelectItem value="rank-asc" className="text-sidebar">Rank: Low to High</SelectItem>
                    <SelectItem value="rarity-desc" className="text-sidebar">Rarity: High to Low</SelectItem>
                    <SelectItem value="rarity-asc" className="text-sidebar">Rarity: Low to High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sidebar text-neutral-500">Show:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(val) => setItemsPerPage(Number(val))}>
                  <SelectTrigger className={`${viewMode === 'compact' ? 'w-[130px]' : 'w-[150px]'} bg-neutral-900 border-neutral-700 rounded-[2px] text-[#FFFBEB] text-sidebar font-normal focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-1`}>
                    <SelectValue placeholder="15 items" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-950/95 backdrop-blur-md border-neutral-700 rounded-[2px]">
                    <SelectItem value="15" className="text-sidebar">15 items</SelectItem>
                    <SelectItem value="25" className="text-sidebar">25 items</SelectItem>
                    <SelectItem value="50" className="text-sidebar">50 items</SelectItem>
                    <SelectItem value="100" className="text-sidebar">100 items</SelectItem>
                    <SelectItem value="250" className="text-sidebar">250 items</SelectItem>
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
             <div ref={gridRef} className="mt-4 mb-8 w-full">
               <div ref={gridContainerRef} className="w-full flex flex-wrap justify-between gap-y-10">
                 {paginatedNFTs.map((nft, index) => (
                     <div
                       key={nft.id}
                       tabIndex={0}
                       onKeyDown={(e) => handleKeyDown(e, index)}
                       className={`${viewMode === 'grid-large' ? 'w-[280px] sm:w-[300px] lg:w-[320px]' : viewMode === 'grid-medium' ? 'w-[240px] sm:w-[260px] lg:w-[280px]' : 'w-[200px] sm:w-[220px] lg:w-[240px]'} focus:outline-none focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-offset-1 rounded-[2px] overflow-visible ${
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
                      className="text-left px-4 py-3 text-body-xs sm:text-body-sm font-medium text-[#FFFBEB] hover:text-neutral-200 cursor-pointer select-none"
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
                      className="text-left px-6 py-3 pl-8 text-body-xs sm:text-body-sm font-medium text-[#FFFBEB] hover:text-neutral-200 cursor-pointer select-none"
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
                      className="text-left px-4 py-3 text-body-xs sm:text-body-sm font-medium text-[#FFFBEB] hover:text-neutral-200 cursor-pointer select-none"
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
                      className="text-left px-4 py-3 text-body-xs sm:text-body-sm font-medium text-[#FFFBEB] hover:text-neutral-200 cursor-pointer select-none"
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
                      className="text-left px-4 py-3 text-body-xs sm:text-body-sm font-medium text-[#FFFBEB] hover:text-neutral-200 cursor-pointer select-none"
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
                    <th className="text-right px-4 py-3 text-body-xs sm:text-body-sm font-medium text-[#FFFBEB]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedNFTs.map((nft, index) => (
                    <tr 
                      key={nft.id} 
                      tabIndex={0}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      className={`border-b border-neutral-700/50 hover:bg-neutral-800/30 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/20 focus-visible:ring-inset ${
                        index % 2 === 0 ? 'bg-neutral-900/20' : ''
                      } ${focusedIndex === index ? 'ring-2 ring-[#ff0099] ring-inset' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Link href={`/nft/${nft.cardNumber}${getReturnToUrl !== '/nfts' ? `?returnTo=${encodeURIComponent(getReturnToUrl)}` : ''}`} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                            <Image src={nft.image} alt={`${nft.name} - NFT #${nft.cardNumber}, Rank ${nft.rank}, ${nft.rarity} rarity, Tier ${nft.tier}`} width={40} height={40} className="rounded object-contain" style={{ width: "auto", height: "40px" }} />
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
                        const inventory = inventoryData[tokenIdNum];
                        const status = inventory?.status || (nft.isForSale ? 'ACTIVE' : 'SOLD');
                        const isSold = status === 'SOLD';
                        return (
                          <>
                            <td className={`px-4 py-3 text-[clamp(12px,0.5vw+6px,16px)] font-medium break-words min-w-[80px] ${isSold ? 'text-[#00FF99]' : 'text-blue-500'}`}>{nft.priceEth} ETH</td>
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
                                className="p-1 hover:bg-neutral-700 rounded transition-colors"
                              >
                                <Heart className={`w-4 h-4 ${isFavorited(nft.tokenId) ? "fill-[#ff0099] text-[#ff0099]" : "text-neutral-400 hover:text-neutral-300"}`} />
                              </button>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center gap-2 justify-end">
                                  {isSold ? (
                                    <span className="px-2.5 py-1 bg-[#00FF99]/10 border border-[#00FF99]/30 rounded-[2px] text-[#00FF99] text-[clamp(11px,0.5vw+5px,15px)] font-medium whitespace-nowrap cursor-not-allowed opacity-75">
                                      Sold
                                    </span>
                                  ) : (
                                    <Link
                                      href={`/nft/${nft.cardNumber}${getReturnToUrl !== '/nfts' ? `?returnTo=${encodeURIComponent(getReturnToUrl)}` : ''}`}
                                      className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/30 rounded-[2px] text-blue-400 text-[clamp(11px,0.5vw+5px,15px)] font-medium hover:bg-blue-500/20 hover:border-blue-500/50 transition-colors whitespace-nowrap"
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


