"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Heart, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import Footer from "@/components/footer";
import Navigation from "@/components/navigation";
import AttributeRarityChart from "@/components/attribute-rarity-chart";
import { BuyDirectListingButton } from "thirdweb/react";
import { base } from "thirdweb/chains";
import { getContract, readContract } from "thirdweb";
import { client } from "@/lib/thirdweb";
import { useFavorites } from "@/hooks/useFavorites";
import { getNFTByTokenId, NFTData } from "@/lib/simple-data-service";
import { track } from '@vercel/analytics';
import { TOTAL_COLLECTION_SIZE } from "@/lib/contracts";
import confetti from 'canvas-confetti';
import { Separator } from "@/components/ui/separator";
import { convertIpfsUrl } from "@/lib/utils";
import { getContractAddress } from "@/lib/constants";
import { rpcRateLimiter } from "@/lib/rpc-rate-limiter";
import PageTransition from "@/components/page-transition";
import { colors } from "@/lib/design-system";

// Type definitions
interface NFTAttribute {
  trait_type: string;
  value: string;
  occurrence?: number;
  rarity?: number;
  percentage?: number;
}

// Helper to get color for attribute using design system
function getColorForAttribute(attributeName: string) {
  const colorMap: { [key: string]: string } = {
    "Background": colors.filter.blue,
    "Skin Tone": colors.filter.yellow,
    "Shirt": colors.filter.red,
    "Hair": colors.filter.green,
    "Eyewear": colors.filter.cyan,
    "Headwear": colors.filter.violet,
  };
  return colorMap[attributeName] || colors.filter.blue;
}

export default function NFTDetailPage() {
  const params = useParams<{ id: string }>();
  
  // TOKEN ID HANDLING:
  // Route param (from URL) is 1-based (display/NFT #), but all on-chain and array lookups are 0-based.
  // Always treat tokenId from the route as 1-based (display number)
  const tokenId = params.id;
  
  const [metadata, setMetadata] = useState<NFTData | null>(null);
  const [imageUrl, setImageUrl] = useState<string>("/nfts/placeholder-nft.webp");
  const [isLoading, setIsLoading] = useState(true);
  const [navigationTokens, setNavigationTokens] = useState<{prev: number | null, next: number | null}>({prev: null, next: null});
  const [isPurchased, setIsPurchased] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [transactionState, setTransactionState] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [pricingData, setPricingData] = useState<{ price_eth: number; listing_id?: number } | null>(null);
  const [ownerAddress, setOwnerAddress] = useState<string | null>(null);
  const [ownerCheckComplete, setOwnerCheckComplete] = useState(false);
  const [confettiTriggered, setConfettiTriggered] = useState(false); // Prevent confetti from running twice
  const [hasActiveListing, setHasActiveListing] = useState<boolean | null>(null); // null = not checked yet
  const [listingCheckComplete, setListingCheckComplete] = useState(false);

  // Always reset all significant state when the token changes (prevents UI bleed when flipping NFTs)
  // This ensures a clean state for each NFT viewed and prevents stale data from previous NFT
  useEffect(() => {
    setIsPurchased(false);
    setShowSuccess(false);
    setTransactionState('idle');
    setTransactionError(null);
    setOwnerAddress(null);
    setOwnerCheckComplete(false);
    setPricingData(null);
    setConfettiTriggered(false); // Reset confetti trigger when navigating between NFTs
    setHasActiveListing(null);
    setListingCheckComplete(false);
  }, [tokenId]);
  
  const { isFavorited, toggleFavorite, isConnected } = useFavorites();

  // The display number is always 1-based for user context
  // Convert: route param (1-based) -> metadata token_id (0-based) -> display number (1-based)
  const displayNftNumber = (metadata?.token_id ?? parseInt(tokenId)) + 1;

  // Calculate navigation tokens (previous and next)
  useEffect(() => {
    const currentTokenId = parseInt(tokenId);
    
    // For main collection, navigate within main range (1-TOTAL_COLLECTION_SIZE)
    const prevToken = currentTokenId > 1 ? currentTokenId - 1 : null;
    const nextToken = currentTokenId < TOTAL_COLLECTION_SIZE ? currentTokenId + 1 : null;
    
    setNavigationTokens({
      prev: prevToken,
      next: nextToken
    });
  }, [tokenId]);

  // LOAD METADATA
  // Fetch NFT metadata from data service with proper error handling and timeout
  useEffect(() => {
    setIsLoading(true);
    
    // Set a timeout to prevent infinite loading state
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
    }, 10000);

    // Convert route param (1-based display number) to 0-based token ID for array/on-chain lookups
    const tokenIdNum = parseInt(tokenId);
    const actualTokenId = tokenIdNum - 1; // Convert display number to token ID
    
    getNFTByTokenId(actualTokenId)
      .then((nftData: NFTData | null) => {
        if (nftData) {
          setMetadata(nftData);
          
          // Set image URL from metadata - try multiple sources with fallback
          const mediaUrl = nftData.merged_data?.media_url || nftData.image || null;
          setImageUrl(
            mediaUrl ? convertIpfsUrl(mediaUrl) : "/nfts/placeholder-nft.webp"
          );
        } else {
          // NFT not found in metadata - set fallback state
          setMetadata(null);
          setImageUrl("/nfts/placeholder-nft.webp");
        }
        
        clearTimeout(timeoutId);
        setIsLoading(false);
      })
      .catch(() => {
        // Error loading metadata - set fallback state
        setMetadata(null);
        setImageUrl("/nfts/placeholder-nft.webp");
        clearTimeout(timeoutId);
        setIsLoading(false);
      });

    // Cleanup timeout on unmount or tokenId change
    return () => clearTimeout(timeoutId);
  }, [tokenId]);


  // LOAD PRICING DATA
  // Fetch pricing information from static JSON files with proper error handling
  useEffect(() => {
    const loadPricingData = async () => {
      try {
        // Convert route param (1-based) to 0-based token ID for pricing lookup
        const tokenIdNum = parseInt(tokenId) - 1;
        
        // Load pricing data from CSV file
        const response = await fetch('/data/nft-mapping/nft-mapping.csv');
        if (response.ok) {
          const csvText = await response.text();
          const lines = csvText.trim().split('\n');
          
          // Skip header row
          const dataLines = lines.slice(1);
          
          // Find the row matching this token ID
          for (const line of dataLines) {
            if (!line.trim()) continue; // Skip empty lines
            
            // Parse CSV line properly - handle quoted fields
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
            parts.push(current.trim()); // Add last part
            
            // Expected format: listingId,tokenId,name,rarityTier,price
            if (parts.length >= 5) {
              const listingId = parts[0];
              const tokenId = parts[1];
              const price = parts[4]; // Last field is price
              
              const tokenIdFromCsv = parseInt(tokenId);
              
              if (tokenIdFromCsv === tokenIdNum) {
                const listingIdNum = parseInt(listingId);
                const priceNum = parseFloat(price);
                
                if (!isNaN(priceNum)) {
                  const listingId = !isNaN(listingIdNum) ? listingIdNum : (tokenIdNum + 10000);
                  setPricingData({
                    price_eth: priceNum,
                    listing_id: listingId
                  });
                  return; // Success, exit early
                }
              }
            }
          }
        }
      } catch {
        // Error loading pricing data - continue without pricing
        // NFT will show as "not for sale"
      }
    };
    
    loadPricingData();
  }, [tokenId]);

  // Get listing ID from pricing data or metadata (needed for listing status check)
  const listingId = pricingData?.listing_id || metadata?.merged_data?.listing_id || 0;

  // CHECK LISTING STATUS ON MARKETPLACE
  // This is the CORRECT way to determine if an NFT is for sale:
  // If there's an ACTIVE listing on the marketplace → FOR SALE
  // If there's NO active listing → SOLD (or not listed)
  useEffect(() => {
    const checkListingStatus = async () => {
      // Reset state when tokenId changes
      setHasActiveListing(null);
      setListingCheckComplete(false);

      try {
        const marketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS;
        if (!marketplaceAddress || !listingId || listingId === 0) {
          // No listing ID means no listing exists
          setHasActiveListing(false);
          setListingCheckComplete(true);
          return;
        }

        // Get the marketplace contract
        const marketplace = getContract({ 
          client, 
          chain: base, 
          address: marketplaceAddress 
        });

        // Check if the listing exists and is active
        // Use readContract to call the marketplace's getListing function directly
        try {
          const listing = await readContract({
            contract: marketplace,
            method: "function getListing(uint256 _listingId) view returns ((uint256 listingId, uint256 tokenId, uint256 quantity, uint256 pricePerToken, uint128 startTimestamp, uint128 endTimestamp, address listingCreator, address assetContract, address currency, uint8 tokenType, uint8 status, bool reserved))",
            params: [BigInt(listingId)],
          });

          // Check if listing is active (status === 1 means ACTIVE)
          const listingData = listing as {
            status: number | string;
            endTimestamp?: bigint;
            quantity?: bigint;
          };
          
          const isActive = listingData.status === 1 || listingData.status === "ACTIVE";
          
          // Also check if it's not expired
          const now = Math.floor(Date.now() / 1000);
          const endTime = listingData.endTimestamp ? Number(listingData.endTimestamp) : 0;
          const notExpired = endTime === 0 || endTime > now;
          
          // Check if quantity available > 0
          const quantity = listingData.quantity ? Number(listingData.quantity) : 0;
          const hasQuantity = quantity > 0;

          setHasActiveListing(isActive && notExpired && hasQuantity);
        } catch {
          // Listing doesn't exist or error fetching → no active listing
          setHasActiveListing(false);
        }
      } catch {
        // Error checking listing → assume no active listing (safer default)
        setHasActiveListing(false);
      } finally {
        setListingCheckComplete(true);
      }
    };

    // Only check if we have a listing ID
    if (listingId && listingId > 0) {
      checkListingStatus();
    } else {
      // No listing ID → no active listing
      setHasActiveListing(false);
      setListingCheckComplete(true);
    }
  }, [tokenId, listingId, pricingData, metadata]);

  // LOAD OWNER ADDRESS
  // Fetch current owner from chain (ERC-721 ownerOf) with rate limiting
  // Also re-check periodically to catch any ownership changes
  useEffect(() => {
    // Reset state immediately when tokenId changes
    setOwnerAddress(null);
    setOwnerCheckComplete(false);
    
    const fetchOwner = async () => {
      try {
        const contract = getContract({ client, chain: base, address: getContractAddress() });
        // Convert route param (1-based) to 0-based token ID for on-chain lookup
        const actualTokenId = BigInt(parseInt(tokenId) - 1);
        
        const result = await rpcRateLimiter.execute(async () => {
          return await readContract({
            contract,
            method: "function ownerOf(uint256 tokenId) view returns (address)",
            params: [actualTokenId],
          });
        });
        
        // Normalize owner address to lowercase for consistent comparison
        // Only set owner address if it's a valid non-empty string
        let normalizedOwner: string | null = null;
        if (typeof result === "string" && result.trim() !== "") {
          normalizedOwner = result.toLowerCase().trim();
        } else if (result && typeof result === "object" && "_value" in result) {
          const value = String((result as { _value: unknown })._value).trim();
          if (value !== "") {
            normalizedOwner = value.toLowerCase();
          }
        }
        setOwnerAddress(normalizedOwner);
      } catch {
        // Error fetching owner - set null (will show as "not for sale" by default)
        setOwnerAddress(null);
      } finally {
        // Always mark check as complete, even on error (prevents infinite loading state)
        setOwnerCheckComplete(true);
      }
    };
    
    // Fetch owner immediately on mount/tokenId change
    fetchOwner();
    
    // Re-check ownership every 60 seconds to catch any changes (reduced frequency to prevent flashing)
    const interval = setInterval(fetchOwner, 60000);
    return () => clearInterval(interval);
  }, [tokenId]);

  // LISTEN FOR PURCHASE EVENTS
  // Handle purchase events from other components (e.g., grid view) to update immediately
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ tokenId: number; priceEth?: number }>;
      const tokenIdNum = custom.detail?.tokenId;
      // Convert route param (1-based) to 0-based token ID for comparison
      const actualTokenId = parseInt(tokenId) - 1;
      
      // Only process if this event is for the current NFT
      if (typeof tokenIdNum === 'number' && !Number.isNaN(tokenIdNum) && tokenIdNum === actualTokenId) {
        setIsPurchased(true);
        
        // Refetch owner immediately with rate limiting (after delay to allow transaction to confirm)
        const fetchOwner = async () => {
          try {
            const contract = getContract({ client, chain: base, address: getContractAddress() });
            const actualTokenIdBigInt = BigInt(actualTokenId);
            const result = await rpcRateLimiter.execute(async () => {
              return await readContract({
                contract,
                method: "function ownerOf(uint256 tokenId) view returns (address)",
                params: [actualTokenIdBigInt],
              });
            });
            
            // Normalize owner address to lowercase - only set if valid
            let normalizedOwner: string | null = null;
            if (typeof result === "string" && result.trim() !== "") {
              normalizedOwner = result.toLowerCase().trim();
            } else if (result && typeof result === "object" && "_value" in result) {
              const value = String((result as { _value: unknown })._value).trim();
              if (value !== "") {
                normalizedOwner = value.toLowerCase();
              }
            }
            setOwnerAddress(normalizedOwner);
            setOwnerCheckComplete(true);
          } catch {
            // Error fetching owner - still mark as complete to prevent infinite loading
            setOwnerCheckComplete(true);
          }
        };
        
        // Wait 5 seconds for transaction to confirm on-chain before checking owner
        setTimeout(fetchOwner, 5000);
      }
    };
    
    window.addEventListener('nftPurchased', handler as EventListener);
    return () => window.removeEventListener('nftPurchased', handler as EventListener);
  }, [tokenId]);

  // ATTRIBUTE LIST GENERATION (robust)
  // Generate attribute list from metadata with fallback percentage calculation
  const attributes = useMemo(() => {
    if (metadata && metadata.attributes) {
      return metadata.attributes.map((attr: NFTAttribute) => {
        // Use provided percentage/rarity, or generate fallback if missing
        let percentage = attr.percentage || attr.rarity || 0;
        
        if (percentage === 0) {
          // Generate fallback percentage based on attribute value hash
          const hash = attr.value.split("").reduce((a, b) => {
            a = (a << 5) - a + b.charCodeAt(0);
            return a & a;
          }, 0);
          percentage = (Math.abs(hash) % 50) + 1; // 1-50% range
        }
        
        return {
          name: attr.trait_type,
          value: attr.value,
          percentage,
          occurrence: attr.occurrence,
        };
      });
    }
    return [];
  }, [metadata]);

  // Get pricing data from loaded pricing data or metadata fallback
  const priceEth = pricingData?.price_eth || metadata?.merged_data?.price_eth || 0;
  
  // Determine if for sale:
  // 1. Check marketplace listing status (most reliable)
  // 2. Fallback: has price and not purchased
  const isForSale = Boolean(
    (listingCheckComplete && hasActiveListing === true) || // Has active listing on marketplace
    (!listingCheckComplete && priceEth > 0 && !isPurchased) // Fallback: has price and not sold
  );
  
  // Get sold price (from pricing data if available)
  const soldPriceEth = undefined;
  
  // NFT is confirmed as SOLD if:
  // 1. Manually marked as purchased
  // 2. OR listing check is complete AND there's NO active listing AND has a price (was listed but no longer active = sold)
  // 3. OR (fallback) owner check shows owner is NOT marketplace (but only if listing check failed)
  const marketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS?.toLowerCase()?.trim();
  const isConfirmedSold = Boolean(
    isPurchased ||
    (listingCheckComplete && hasActiveListing === false && priceEth > 0) || // Had price but no active listing = sold
    (!listingCheckComplete && ownerCheckComplete && ownerAddress && ownerAddress.trim() !== '' && 
     marketplaceAddress && marketplaceAddress.trim() !== '' && marketplaceAddress.length >= 42 &&
     ownerAddress.toLowerCase() !== marketplaceAddress.toLowerCase()) // Fallback: owner is not marketplace
  );

  // CONFETTI CELEBRATION FUNCTION
  // Trigger confetti safely - only once per purchase to prevent double-triggering
  const triggerConfetti = () => {
    if (!confettiTriggered) {
      setConfettiTriggered(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ff0099', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
      });
    }
  };

  // Handle transaction state changes
  const handleTransactionPending = () => {
    setTransactionState('pending');
    setTransactionError(null);
  };

  const handleTransactionSuccess = async (receipt: { transactionHash: string; blockNumber: bigint }) => {
    setTransactionState('success');
    setIsPurchased(true);
    setShowSuccess(true);
    
    // Trigger confetti celebration (safely, only once)
    triggerConfetti();
    
    // Track successful purchase
    track('NFT Purchase Success', { 
      tokenId: tokenId,
      transactionHash: receipt.transactionHash,
      blockNumber: Number(receipt.blockNumber)
    });
    
    // Broadcast to update other views (grid, owned tab)
    // Convert route param (1-based) to 0-based token ID for event
    try {
      const purchasedActualTokenId = parseInt(tokenId) - 1;
      const priceEthNumber = typeof priceEth === 'number' ? priceEth : Number(priceEth);
      window.dispatchEvent(new CustomEvent('nftPurchased', { 
        detail: { tokenId: purchasedActualTokenId, priceEth: priceEthNumber } 
      }));
    } catch {
      // Error broadcasting purchase event - silently fail
    }
    
    // Refetch owner address to update sold state
    // Wait 5 seconds for transaction to confirm on-chain before checking owner
    const ownerCheckTimeout = setTimeout(async () => {
      try {
        const contract = getContract({ client, chain: base, address: getContractAddress() });
        // Convert route param (1-based) to 0-based token ID for on-chain lookup
        const actualTokenId = BigInt(parseInt(tokenId) - 1);
        const result = await rpcRateLimiter.execute(async () => {
          return await readContract({
            contract,
            method: "function ownerOf(uint256 tokenId) view returns (address)",
            params: [actualTokenId],
          });
        });
        
        // Normalize owner address to lowercase
        if (typeof result === "string") {
          setOwnerAddress(result.toLowerCase());
        } else if (result && typeof result === "object" && "_value" in result) {
          setOwnerAddress(String((result as { _value: unknown })._value).toLowerCase());
        }
        setOwnerCheckComplete(true);
      } catch {
        // Error fetching owner - still mark as complete (prevents infinite loading)
        setOwnerCheckComplete(true);
      }
    }, 5000);
    
    // Hide success message after 5 seconds (ensures overlay doesn't get stuck)
    const successHideTimeout = setTimeout(() => {
      setShowSuccess(false);
    }, 5000);
    
    // Store timeouts for cleanup (though component unmount will handle cleanup)
    return () => {
      clearTimeout(ownerCheckTimeout);
      clearTimeout(successHideTimeout);
    };
  };

  const handleTransactionError = (error: Error) => {
    // Transaction failed - set error state
    setTransactionState('error');
    
    // Parse error message for user-friendly display
    let errorMessage = "Transaction failed. Please try again.";
    
    if (error?.message) {
      if (error.message.includes("user rejected")) {
        errorMessage = "Transaction was cancelled by user.";
      } else if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for this transaction.";
      } else if (error.message.includes("gas")) {
        errorMessage = "Transaction failed due to gas issues. Please try again.";
      } else if (error.message.includes("already sold")) {
        errorMessage = "This NFT has already been sold.";
      } else {
        errorMessage = error.message;
      }
    }
    
    setTransactionError(errorMessage);
    
    // Track failed purchase
    track('NFT Purchase Failed', { 
      tokenId: tokenId,
      error: errorMessage
    });
    
    // Clear error after 10 seconds (ensures error overlay doesn't get stuck)
    const errorClearTimeout = setTimeout(() => {
      setTransactionState('idle');
      setTransactionError(null);
    }, 10000);
    
    // Store timeout for cleanup
    return () => clearTimeout(errorClearTimeout);
  };
  

  // Handle favorite toggle
  const handleFavoriteToggle = () => {
    if (!isConnected) {
      alert("Please connect your wallet to favorite NFTs");
      return;
    }

    if (metadata) {
      toggleFavorite({
        tokenId: (parseInt(tokenId) - 1).toString(),
        name: metadata.name || `SATOSHE SLUGGER #${parseInt(tokenId) + 1}`,
        image: imageUrl,
        rarity: metadata.rarity_tier || "Unknown",
        rank: metadata.rank || "—",
        rarityPercent: metadata.rarity_percent || "—",
      });
    }
  };



  if (isLoading) {
    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col">
        <Navigation activePage="nfts" />
        <div className="flex-grow flex flex-col items-center justify-center pt-24 sm:pt-28">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-pink mx-auto mb-4"></div>
            <p className="text-neutral-400">Loading NFT details...</p>
            <p className="text-sm text-gray-500 mt-2">Token ID: {tokenId}</p>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  if (!metadata) {
    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col">
        <Navigation activePage="nfts" />
        <div className="flex-grow flex flex-col items-center justify-center pt-24 sm:pt-28">
          <p className="text-xl" style={{ color: colors.filter.red }}>NFT not found in local metadata.</p>
        </div>
        <Footer />
      </main>
    );
  }

  const isFav = isFavorited((parseInt(tokenId) - 1).toString());

  return (
    <PageTransition>
      <main id="main-content" className="min-h-screen bg-background text-foreground flex flex-col">
        <Navigation activePage="nfts" />
      <div className="max-w-[90rem] mx-auto py-4 sm:py-6 flex-grow pt-24 sm:pt-28 pb-16 sm:pb-20 px-4 sm:px-6 md:px-6 lg:px-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-8 sm:mb-10">
          {(() => {
            // Prefer returning to the exact filtered collection URL when provided
            let backTo = "/nfts";
            if (typeof window !== 'undefined') {
              const sp = new URLSearchParams(window.location.search);
              const rt = sp.get('returnTo');
              if (rt) backTo = rt;
            }
            return (
              <Link
                href={backTo}
                className="inline-flex items-center text-neutral-400 hover:text-off-white text-sm transition-colors group flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4 mr-2 transition-all group-hover:-translate-x-1 group-hover:text-off-white" />
                Back to collection
              </Link>
            );
          })()}

          {/* Navigation Arrows */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {navigationTokens.prev !== null && (
              <Link
                href={`/nft/${navigationTokens.prev}`}
                className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-neutral-800 hover:bg-neutral-900 text-neutral-400 transition-all border border-neutral-700 hover:border-brand-pink group flex-shrink-0"
                title={`Previous NFT #${navigationTokens.prev}`}
              >
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5 transition-colors group-hover:text-brand-pink" />
              </Link>
            )}
            
            <span className="text-xs sm:text-sm text-neutral-500 px-1 sm:px-2 whitespace-nowrap">
              {parseInt(tokenId)} of {TOTAL_COLLECTION_SIZE}
            </span>
            
            {navigationTokens.next !== null && (
              <Link
                href={`/nft/${navigationTokens.next}`}
                className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-neutral-800 hover:bg-neutral-900 text-neutral-400 transition-all border border-neutral-700 hover:border-brand-pink group flex-shrink-0"
                title={`Next NFT #${navigationTokens.next}`}
              >
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 transition-colors group-hover:text-brand-pink" />
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8">
          {/* Left Column - Image and metadata links - 50% width */}
          <div className="space-y-4 order-1 lg:order-1 w-full lg:w-1/2 lg:flex-shrink-0 lg:pr-4 min-w-0">
            {/* NFT Image Card */}
            <div className="relative w-full" style={{ aspectRatio: "2700/3000", maxWidth: "100%" }}>
              <div className="relative w-full h-full">
                <Image
                  src={imageUrl || "/nfts/placeholder-nft.webp"}
                  alt={metadata?.name || `SATOSHE SLUGGER #${parseInt(tokenId) + 1}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 400px"
                  className="object-contain"
                  onError={() => setImageUrl("/nfts/placeholder-nft.webp")}
                  unoptimized={Boolean(imageUrl && typeof imageUrl === 'string' && (imageUrl.includes('/ipfs/') || imageUrl.includes('cloudflare-ipfs') || imageUrl.includes('ipfs.io')))}
                />
              </div>
            </div>

            {/* Artist and Platform - Moved to right column after Collection Details - Mobile order-5 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 order-5 lg:order-none hidden lg:grid">
              <a
                href="https://kristenwoerdeman.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full px-4 py-3 bg-neutral-800 hover:bg-neutral-900 border border-neutral-600 hover:border-brand-pink rounded transition-all group cursor-pointer"
                aria-label="Visit Kristen Woerdeman's website"
              >
                <div className="flex items-center gap-3">
                  <Image
                    src="/brands/kristen-woerdeman/kwoerd-circular-offwhite-32.png"
                    alt="Kristen Woerdeman"
                    width={26}
                    height={26}
                    className="w-6 h-6"
                    sizes="26px"
                  />
                  <div>
                    <p className="text-sm font-medium text-off-white group-hover:text-off-white transition-colors">Artist</p>
                    <p className="text-xs text-neutral-400 group-hover:text-off-white transition-colors">Kristen Woerdeman</p>
                  </div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-neutral-400 group-hover:text-brand-pink transition-colors"
                  aria-hidden="true"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>

              <a
                href="https://retinaldelights.io"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full px-4 py-3 bg-neutral-800 hover:bg-neutral-900 border border-neutral-600 hover:border-brand-pink rounded transition-all group cursor-pointer"
                aria-label="Visit Retinal Delights website"
              >
                <div className="flex items-center gap-3">
                  <Image
                    src="/brands/retinal-delights/retinal-delights-cicular-offwhite-32.png"
                    alt="Retinal Delights"
                    width={26}
                    height={26}
                    className="w-6 h-6"
                    sizes="26px"
                  />
                  <div>
                    <p className="text-sm font-medium text-off-white group-hover:text-off-white transition-colors">Platform</p>
                    <p className="text-xs text-neutral-400 group-hover:text-off-white transition-colors">Retinal Delights</p>
                  </div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-neutral-400 group-hover:text-brand-pink transition-colors"
                  aria-hidden="true"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>

            {/* IPFS Links - Moved to right column after Collection Details - Mobile order-6 */}
            <div className="space-y-3 order-6 lg:order-none hidden lg:block">
                <a
                  href={metadata?.merged_data?.metadata_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full px-4 py-3 bg-neutral-800 hover:bg-[#171717] border border-neutral-600 rounded transition-colors group focus:ring-2 focus:ring-green-500 focus:outline-none"
                  aria-label="View token metadata on IPFS"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.filter.green + '20' }}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ color: colors.filter.green }}
                        aria-hidden="true"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14,2 14,8 20,8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10,9 9,9 8,9"></polyline>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: colors.filter.green }}>Token URI</p>
                      <p className="text-xs text-neutral-400">View metadata on IPFS</p>
                    </div>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-neutral-400 group-hover:text-green-500 transition-colors"
                    aria-hidden="true"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </a>

                <a
                  href={metadata?.merged_data?.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full px-4 py-3 bg-neutral-800 hover:bg-[#171717] border border-neutral-600 rounded transition-colors group focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  aria-label="View NFT image on IPFS"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.filter.blue + '20' }}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ color: colors.filter.blue }}
                        aria-hidden="true"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21,15 16,10 5,21"></polyline>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: colors.filter.blue }}>Media URI</p>
                      <p className="text-xs text-neutral-400">View image on IPFS</p>
                    </div>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-neutral-400 group-hover:text-blue-500 transition-colors"
                    aria-hidden="true"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </a>
              </div>

            {/* Attributes - Moved to right column after Collection Details - Mobile order-7 */}
            <div className="bg-neutral-800 p-4 rounded border border-neutral-700 order-7 lg:order-none hidden lg:block">
              <h3 className="text-lg font-semibold mb-4 text-off-white">Attributes</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attributes.map((attr: { name: string; value: string; percentage?: number; occurrence?: number }, index: number) => (
                  <div key={index} className="bg-neutral-800 p-3 rounded border border-neutral-700">
                    <div className="flex items-center mb-2">
                      <div
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: getColorForAttribute(attr.name) }}
                      ></div>
                      <span className="text-xs text-neutral-400">{attr.name}</span>
                    </div>
                    <div className="text-base md:text-sm font-medium text-off-white mb-1">{attr.value}</div>
                    <div className="text-xs text-neutral-400">
                      {attr.percentage}% • {attr.occurrence} of {TOTAL_COLLECTION_SIZE}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column - NFT Details - 50% width */}
          <div className="space-y-6 order-2 lg:order-2 flex flex-col w-full lg:w-1/2 lg:flex-shrink-0 lg:pl-4 min-w-0">
            {/* NFT Name with Heart Icon - Mobile order-2 (after image) */}
            <div className="flex items-start justify-between gap-4 order-2 lg:order-none min-w-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold leading-tight text-off-white break-words min-w-0 flex-1">
                {metadata?.name || `Satoshe Slugger #${displayNftNumber}`}
              </h1>
              <button
                onClick={handleFavoriteToggle}
                className={`p-2 rounded-full hover:bg-neutral-800 transition-colors ${
                  isFav
                    ? "text-brand-pink fill-brand-pink"
                    : "text-neutral-400 hover:text-brand-pink"
                }`}
                aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart
                  className={`w-6 h-6 transition-colors cursor-pointer ${
                    isFav
                      ? "text-brand-pink fill-brand-pink"
                      : "text-neutral-400 hover:text-brand-pink"
                  }`}
                />
              </button>
            </div>

            {/* Connect to Interact Message */}
            {!isConnected && isForSale && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-3 mb-4">
                <p className="text-yellow-400 text-sm text-center">
                  🔗 Connect your wallet to purchase this NFT
                </p>
              </div>
            )}

            {/* Buy Now Section - Simplified - Mobile order-3 */}
            {isForSale ? (
              <div className="bg-neutral-800 p-6 rounded border border-neutral-700 order-3 lg:order-none">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex-1">
                    <p className="text-sm md:text-base text-blue-500 mb-1">Buy Now Price</p>
                    <p className="text-2xl sm:text-3xl md:text-2xl font-bold text-blue-500">
                      {priceEth} ETH
                    </p>
                    {transactionState === 'pending' && (
                      <p className="text-xs text-yellow-400 mt-1">
                        ⏳ Transaction pending... Please wait for confirmation.
                      </p>
                    )}
                  </div>
                  <BuyDirectListingButton
                    contractAddress={process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS!}
                    client={client}
                    chain={base}
                    listingId={BigInt(listingId)}
                    quantity={1n}
                    onTransactionSent={handleTransactionPending}
                    onTransactionConfirmed={handleTransactionSuccess}
                    onError={handleTransactionError}
                    className="px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base font-bold transition-all duration-500 ease-out focus:ring-2 focus:ring-offset-2 text-white rounded-sm disabled:opacity-50 disabled:cursor-not-allowed hover:!bg-blue-700 w-full sm:w-auto"
                    style={{
                      backgroundColor: transactionState === 'pending' ? "#6B7280" : "#3B82F6",
                      color: "white",
                      borderColor: transactionState === 'pending' ? "#6B7280" : "#3B82F6",
                      borderRadius: "2px"
                    }}
                  >
                    {transactionState === 'pending' ? 'PROCESSING...' : 'BUY NOW'}
                  </BuyDirectListingButton>
                </div>
              </div>
            ) : isConfirmedSold ? (
              <div className="bg-neutral-800 p-6 rounded border border-green-500/30 order-3 lg:order-none">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm md:text-base text-green-400 mb-1">Purchased for</p>
                      <p className="text-2xl sm:text-3xl md:text-2xl font-bold text-green-500">
                        {soldPriceEth && soldPriceEth > 0 ? `${soldPriceEth} ETH` : (priceEth > 0 ? `${priceEth} ETH` : '—')}
                      </p>
                    </div>
                    <button
                      disabled
                      className="px-4 py-2 sm:px-6 sm:py-3 rounded-sm text-sm sm:text-base font-bold bg-green-500/10 border border-green-500/30 text-green-400 cursor-not-allowed opacity-75"
                    >
                      Sold
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-neutral-700">
                    {ownerAddress && (
                      <p className="text-xs sm:text-sm text-neutral-400">
                        Owner: <a href={`https://basescan.org/address/${ownerAddress}`} target="_blank" rel="noopener noreferrer" className="text-green-400 underline hover:text-green-300">{ownerAddress.slice(0,6)}...{ownerAddress.slice(-4)}</a>
                      </p>
                    )}
                    <Link
                      href={`https://opensea.io/assets/base/${getContractAddress()}/${parseInt(tokenId) - 1}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-green-400 hover:text-green-300 underline transition-colors whitespace-nowrap"
                    >
                      View on OpenSea
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-neutral-800 p-4 rounded border border-neutral-700 order-3 lg:order-none">
                <p className="text-blue-400 text-center">This NFT is not currently for sale</p>
              </div>
            )}

            {/* Error Message */}
            {transactionState === 'error' && transactionError && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-neutral-800 p-8 rounded-lg border border-red-500/50 text-center max-w-md mx-4">
                  <div className="text-6xl mb-4">❌</div>
                  <h3 className="text-2xl font-bold text-red-400 mb-2">Transaction Failed</h3>
                  <p className="text-neutral-300 mb-4">
                    {transactionError}
                  </p>
                  <p className="text-sm text-neutral-400">
                    This message will disappear in a few seconds...
                  </p>
                </div>
              </div>
            )}

            {/* Success Message */}
            {showSuccess && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-neutral-800 p-8 rounded-lg border border-neutral-700 text-center max-w-md mx-4">
                  <div className="text-6xl mb-4">🎉</div>
                  <h3 className="text-2xl font-bold text-green-400 mb-2">Purchase Successful!</h3>
                  <p className="text-neutral-300 mb-4">
                    You successfully purchased <strong>Satoshe Slugger #{displayNftNumber}</strong> for {priceEth} ETH!
                  </p>
                  <p className="text-sm text-neutral-400 mb-4">
                    Transaction confirmed on the blockchain.
                  </p>
                  <p className="text-xs text-neutral-500">
                    This message will disappear in a few seconds...
                  </p>
                </div>
              </div>
            )}

            {/* Collection Details - Mobile order-5 */}
            <div className="bg-neutral-800 p-6 rounded border border-neutral-700 order-5 lg:order-none">
              <h3 className="text-lg font-semibold mb-5 text-off-white">Collection Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-4 sm:gap-y-5 text-sm">
                <div className="min-w-0">
                  <p className="text-neutral-400 mb-1 text-xs sm:text-sm">NFT Number</p>
                  <p className="font-normal text-off-white break-words">{metadata?.card_number ?? parseInt(tokenId) + 1}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-neutral-400 mb-1 text-xs sm:text-sm">Token ID</p>
                  <p className="font-normal text-off-white break-words">{metadata?.token_id ?? parseInt(tokenId) - 1}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-neutral-400 mb-1 text-xs sm:text-sm">Collection</p>
                  <p className="font-normal text-off-white break-words">
                    {metadata?.collection_number ?? "—"}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-neutral-400 mb-1 text-xs sm:text-sm">Edition</p>
                  <p className="font-normal text-off-white break-words">{metadata?.edition ?? "—"}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-neutral-400 mb-1 text-xs sm:text-sm">Series</p>
                  <p className="font-normal text-off-white break-words">{metadata?.series ?? "—"}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-neutral-400 mb-1 text-xs sm:text-sm">Rarity Tier</p>
                  <p className="font-normal text-off-white break-words">{metadata?.rarity_tier ?? "Unknown"}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-neutral-400 mb-1 text-xs sm:text-sm">Rarity Score</p>
                  <p className="font-normal text-off-white break-words">{metadata?.rarity_score ?? "—"}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-neutral-400 mb-1 text-xs sm:text-sm">Rank</p>
                  <p className="font-normal text-off-white break-words">{metadata?.rank ?? "—"} of {TOTAL_COLLECTION_SIZE}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-neutral-400 mb-1 text-xs sm:text-sm">Rarity Percentage</p>
                  <p className="font-normal text-off-white break-words">{metadata?.rarity_percent ?? "—"}%</p>
                </div>
              </div>
            </div>

            {/* Contract Details - Mobile order-6 (moved below Collection Details) */}
            <div className="bg-neutral-800 p-6 rounded border border-neutral-700 order-6 lg:order-none">
              <h3 className="text-lg font-semibold mb-5 text-off-white">Contract Details</h3>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between items-center gap-2 min-w-0">
                    <span className="text-neutral-400 flex-shrink-0">Contract Address</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-off-white truncate">{getContractAddress().slice(0, 6)}...{getContractAddress().slice(-4)}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(getContractAddress());
                          // You could add a toast notification here if desired
                        }}
                        className="p-1 hover:bg-neutral-700 rounded transition-colors group"
                        aria-label="Copy contract address"
                        title="Copy contract address"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-neutral-400 group-hover:text-green-500 transition-colors"
                        >
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <Separator className="bg-neutral-600" />
                  <div className="flex justify-between items-center gap-2 min-w-0">
                    <span className="text-neutral-400 flex-shrink-0">Token ID</span>
                    <span className="text-off-white truncate">{metadata?.token_id ?? tokenId}</span>
                  </div>
                  <Separator className="bg-neutral-600" />
                  <div className="flex justify-between items-center gap-2 min-w-0">
                    <span className="text-neutral-400 flex-shrink-0">Token Standard</span>
                    <span className="text-off-white truncate">ERC-721</span>
                  </div>
                  <Separator className="bg-neutral-600" />
                  <div className="flex justify-between items-center gap-2 min-w-0">
                    <span className="text-neutral-400 flex-shrink-0">Blockchain</span>
                    <span className="text-off-white truncate">Base</span>
                  </div>
                </div>
            </div>

            {/* Artist and Platform - Mobile order-7 (after Collection Details) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 order-7 lg:order-none lg:hidden">
              <a
                href="https://kristenwoerdeman.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full px-4 py-3 bg-neutral-800 hover:bg-neutral-900 border border-neutral-600 hover:border-brand-pink rounded transition-all group cursor-pointer"
                aria-label="Visit Kristen Woerdeman's website"
              >
                <div className="flex items-center gap-3">
                  <Image
                    src="/brands/kristen-woerdeman/kwoerd-circular-offwhite-32.png"
                    alt="Kristen Woerdeman"
                    width={26}
                    height={26}
                    className="w-6 h-6"
                    sizes="26px"
                  />
                  <div>
                    <p className="text-sm font-medium text-off-white group-hover:text-off-white transition-colors">Artist</p>
                    <p className="text-xs text-neutral-400 group-hover:text-off-white transition-colors">Kristen Woerdeman</p>
                  </div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-neutral-400 group-hover:text-brand-pink transition-colors"
                  aria-hidden="true"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>

              <a
                href="https://retinaldelights.io"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full px-4 py-3 bg-neutral-800 hover:bg-neutral-900 border border-neutral-600 hover:border-brand-pink rounded transition-all group cursor-pointer"
                aria-label="Visit Retinal Delights website"
              >
                <div className="flex items-center gap-3">
                  <Image
                    src="/brands/retinal-delights/retinal-delights-cicular-offwhite-32.png"
                    alt="Retinal Delights"
                    width={26}
                    height={26}
                    className="w-6 h-6"
                    sizes="26px"
                  />
                  <div>
                    <p className="text-sm font-medium text-off-white group-hover:text-off-white transition-colors">Platform</p>
                    <p className="text-xs text-neutral-400 group-hover:text-off-white transition-colors">Retinal Delights</p>
                  </div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-neutral-400 group-hover:text-brand-pink transition-colors"
                  aria-hidden="true"
                >
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
              </a>
            </div>

            {/* IPFS Links - Mobile order-8 (after Collection Details) */}
            <div className="space-y-3 order-8 lg:order-none lg:hidden">
                <a
                  href={metadata?.merged_data?.metadata_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full px-4 py-3 bg-neutral-800 hover:bg-[#171717] border border-neutral-600 rounded transition-colors group focus:ring-2 focus:ring-green-500 focus:outline-none"
                  aria-label="View token metadata on IPFS"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.filter.green + '20' }}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ color: colors.filter.green }}
                        aria-hidden="true"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14,2 14,8 20,8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10,9 9,9 8,9"></polyline>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: colors.filter.green }}>Token URI</p>
                      <p className="text-xs text-neutral-400">View metadata on IPFS</p>
                    </div>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-neutral-400 group-hover:text-green-500 transition-colors"
                    aria-hidden="true"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </a>

                <a
                  href={metadata?.merged_data?.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full px-4 py-3 bg-neutral-800 hover:bg-[#171717] border border-neutral-600 rounded transition-colors group focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  aria-label="View NFT image on IPFS"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.filter.blue + '20' }}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{ color: colors.filter.blue }}
                        aria-hidden="true"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21,15 16,10 5,21"></polyline>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: colors.filter.blue }}>Media URI</p>
                      <p className="text-xs text-neutral-400">View image on IPFS</p>
                    </div>
                  </div>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-neutral-400 group-hover:text-blue-500 transition-colors"
                    aria-hidden="true"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </a>
              </div>

            {/* Attributes - Mobile order-9 (after Collection Details) */}
            <div className="bg-neutral-800 p-4 rounded border border-neutral-700 order-9 lg:order-none lg:hidden">
              <h3 className="text-lg font-semibold mb-4 text-off-white">Attributes</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {attributes.map((attr: { name: string; value: string; percentage?: number; occurrence?: number }, index: number) => (
                  <div key={index} className="bg-neutral-800 p-3 rounded border border-neutral-700 min-w-0">
                    <div className="flex items-center mb-2 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                        style={{ backgroundColor: getColorForAttribute(attr.name) }}
                      ></div>
                      <span className="text-xs text-neutral-400 truncate">{attr.name}</span>
                    </div>
                    <div className="text-sm font-medium text-off-white mb-1 break-words">{attr.value}</div>
                    <div className="text-xs text-neutral-400 break-words">
                      {attr.percentage}% • {attr.occurrence} of {TOTAL_COLLECTION_SIZE}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rarity Distribution - Mobile order-10 */}
            <div className="order-10 lg:order-none">
              <h3 className="text-lg font-semibold mb-4 text-off-white">Rarity Distribution</h3>
            {attributes.length > 0 ? (
              <AttributeRarityChart
                attributes={attributes.map((attr: { name: string; value: string; percentage?: number; occurrence?: number }) => ({
                  name: attr.name,
                  value: attr.value,
                  percentage: attr.percentage || 0,
                  occurrence: attr.occurrence,
                  color: getColorForAttribute(attr.name)
                }))}
                overallRarity={metadata?.rarity_percent || "93.5"}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-neutral-400">No attributes available for rarity distribution</p>
                <p className="text-xs text-neutral-500 mt-2">Attributes count: {attributes.length}</p>
                <p className="text-xs text-neutral-500 mt-1">Metadata: {metadata ? 'Loaded' : 'Not loaded'}</p>
              </div>
            )}
            </div>



          </div>
        </div>

      </div>

      <Footer />
    </main>
    </PageTransition>
  );
}
