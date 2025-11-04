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
import { CONTRACT_ADDRESS } from "@/lib/constants";

// Type definitions
interface NFTAttribute {
  trait_type: string;
  value: string;
  occurrence?: number;
  rarity?: number;
  percentage?: number;
}

// Consistent color scheme based on the radial chart
const COLORS = {
  background: "#3B82F6", // blue
  skinTone: "#F59E0B", // yellow/orange
  shirt: "#EF4444", // red
  hair: "#10B981", // green
  eyewear: "#06B6D4", // teal/cyan
  headwear: "#A855F7", // purple
  // Keep the hot pink as requested
  accent: "#EC4899", // hot pink
  // UI colors
  neutral: {
    100: "#F5F5F5",
    400: "#A3A3A3",
    600: "#525252",
    700: "#404040",
    800: "#262626",
    900: "#171717",
  }
};

// Helper to get color for attribute
function getColorForAttribute(attributeName: string) {
  const colorMap: { [key: string]: string } = {
    "Background": COLORS.background,
    "Skin Tone": COLORS.skinTone,
    "Shirt": COLORS.shirt,
    "Hair": COLORS.hair,
    "Eyewear": COLORS.eyewear,
    "Headwear": COLORS.headwear,
  };
  return colorMap[attributeName] || COLORS.background;
}

export default function NFTDetailPage() {
  const params = useParams<{ id: string }>();
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
  
  const { isFavorited, toggleFavorite, isConnected } = useFavorites();

  // Display-friendly NFT number: prefer metadata token_id (0-based), fallback to route param (0-based)
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

  // Load NFT metadata
  useEffect(() => {
    setIsLoading(true);

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
    }, 10000); // 10 second timeout

    const tokenIdNum = parseInt(tokenId);
    
    // Load NFT data using data service
    // Note: token IDs in metadata start from 0, but URLs use human-friendly numbers (1-based)
    const actualTokenId = tokenIdNum - 1;
      getNFTByTokenId(actualTokenId)
            .then((nftData: NFTData | null) => {
            
            if (nftData) {
              setMetadata(nftData);
              
              // Set image URL from metadata - try multiple sources
              const mediaUrl = nftData.merged_data?.media_url || nftData.image || null;
              if (mediaUrl) {
                setImageUrl(convertIpfsUrl(mediaUrl));
              } else {
                setImageUrl("/nfts/placeholder-nft.webp");
              }
            } else {
              setMetadata(null);
              setImageUrl("/nfts/placeholder-nft.webp");
            }
            clearTimeout(timeoutId);
            setIsLoading(false);
          })
          .catch(() => {
            setMetadata(null);
            setImageUrl("/nfts/placeholder-nft.webp");
            clearTimeout(timeoutId);
            setIsLoading(false);
          });

    // Cleanup timeout on unmount
    return () => clearTimeout(timeoutId);
  }, [tokenId]);


  // Load pricing data
  useEffect(() => {
    const loadPricingData = async () => {
      try {
        const tokenIdNum = parseInt(tokenId) - 1;
        
        // Load token pricing mappings first (has updated listing IDs from CSV)
        let response = await fetch('/data/pricing/token_pricing_mappings.json');
        if (response.ok) {
          const data = await response.json();
          const pricing = data.find((item: { token_id: number }) => item.token_id === tokenIdNum);
          if (pricing) {
            // Use listing_id from mappings if available, otherwise fallback to generated ID
            const listingId = pricing.listing_id !== null && pricing.listing_id !== undefined 
              ? pricing.listing_id 
              : (tokenIdNum + 10000);
            setPricingData({
              price_eth: pricing.price_eth,
              listing_id: listingId
            });
            return;
          }
        }
        
        // Fallback to optimized pricing (may not have listing IDs)
        response = await fetch('/data/pricing/optimized_pricing.json');
        if (response.ok) {
          const data = await response.json();
          const pricing = data[tokenIdNum];
          if (pricing) {
            setPricingData({
              price_eth: pricing.price_eth,
              listing_id: pricing.listing_id || (tokenIdNum + 10000)
            });
          }
        }
      } catch (error) {
        // Error loading pricing data - continue without pricing
      }
    };
    
    loadPricingData();
  }, [tokenId]);

  // Load current owner from chain (ERC-721 ownerOf) with rate limiting
  useEffect(() => {
    const fetchOwner = async () => {
      setOwnerCheckComplete(false);
      try {
        const contract = getContract({ client, chain: base, address: CONTRACT_ADDRESS });
        const actualTokenId = BigInt(parseInt(tokenId) - 1);
        const result = await rpcRateLimiter.execute(async () => {
          return await readContract({
            contract,
            method: "function ownerOf(uint256 tokenId) view returns (address)",
            params: [actualTokenId],
          });
        });
        if (typeof result === "string") {
          setOwnerAddress(result);
        } else if (result && typeof result === "object" && "_value" in result) {
          setOwnerAddress(String((result as { _value: unknown })._value));
        }
      } catch {
        setOwnerAddress(null);
      } finally {
        setOwnerCheckComplete(true);
      }
    };
    fetchOwner();
  }, [tokenId]);

  // Listen for purchase events to update immediately (for when navigating from grid)
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ tokenId: number; priceEth?: number }>;
      const tokenIdNum = custom.detail?.tokenId;
      const actualTokenId = parseInt(tokenId) - 1; // Convert display number to token ID
      if (typeof tokenIdNum === 'number' && !Number.isNaN(tokenIdNum) && tokenIdNum === actualTokenId) {
        setIsPurchased(true);
        // Refetch owner immediately with rate limiting
        const fetchOwner = async () => {
          try {
            const contract = getContract({ client, chain: base, address: CONTRACT_ADDRESS });
            const actualTokenIdBigInt = BigInt(actualTokenId);
            const result = await rpcRateLimiter.execute(async () => {
              return await readContract({
                contract,
                method: "function ownerOf(uint256 tokenId) view returns (address)",
                params: [actualTokenIdBigInt],
              });
            });
            if (typeof result === "string") {
              setOwnerAddress(result);
            } else if (result && typeof result === "object" && "_value" in result) {
              setOwnerAddress(String((result as { _value: unknown })._value));
            }
            setOwnerCheckComplete(true);
          } catch {
            setOwnerCheckComplete(true);
          }
        };
        fetchOwner();
      }
    };
    window.addEventListener('nftPurchased', handler as EventListener);
    return () => window.removeEventListener('nftPurchased', handler as EventListener);
  }, [tokenId]);

  const attributes = useMemo(() => {
    // Use real attributes from complete metadata
    if (metadata && metadata.attributes) {
      const mappedAttributes = metadata.attributes.map((attr: NFTAttribute) => {
        // Generate a simple percentage based on attribute value if not provided
        let percentage = attr.percentage || attr.rarity || 0;
        
        // If no percentage data, create a simple distribution
        if (percentage === 0) {
          // Simple hash-based percentage for demo purposes
          const hash = attr.value.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
          }, 0);
          percentage = Math.abs(hash) % 50 + 1; // 1-50% range
        }
        
        return {
          name: attr.trait_type,
          value: attr.value,
          percentage: percentage,
          occurrence: attr.occurrence
        };
      });
      return mappedAttributes;
    }
    return [];
  }, [metadata]);

  // Get pricing data from loaded pricing data or metadata fallback
  const priceEth = pricingData?.price_eth || metadata?.merged_data?.price_eth || 0;
  const listingId = pricingData?.listing_id || metadata?.merged_data?.listing_id || 0;
  const creatorAddress = process.env.NEXT_PUBLIC_CREATOR_ADDRESS?.toLowerCase();
  const isSoldOnChain = ownerAddress && creatorAddress ? ownerAddress.toLowerCase() !== creatorAddress : false;
  // Only show "Buy Now" if owner check is complete AND NFT is confirmed for sale
  const isForSale = ownerCheckComplete && priceEth > 0 && !isPurchased && !isSoldOnChain;

  // Confetti celebration function
  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#ff0099', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
    });
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
    triggerConfetti();
    track('NFT Purchase Success', { 
      tokenId: tokenId,
      transactionHash: receipt.transactionHash,
      blockNumber: Number(receipt.blockNumber)
    });
    // Broadcast to update other views (grid, owned tab)
    try {
      const purchasedActualTokenId = parseInt(tokenId) - 1;
      const priceEthNumber = typeof priceEth === 'number' ? priceEth : Number(priceEth);
      window.dispatchEvent(new CustomEvent('nftPurchased', { detail: { tokenId: purchasedActualTokenId, priceEth: priceEthNumber } }));
    } catch {}
    
    // Refetch owner address to update sold state
    try {
      const contract = getContract({ client, chain: base, address: CONTRACT_ADDRESS });
      const actualTokenId = BigInt(parseInt(tokenId) - 1);
            const result = await rpcRateLimiter.execute(async () => {
              return await readContract({
                contract,
                method: "function ownerOf(uint256 tokenId) view returns (address)",
                params: [actualTokenId],
              });
            });
      if (typeof result === "string") {
        setOwnerAddress(result);
      } else if (result && typeof result === "object" && "_value" in result) {
        setOwnerAddress(String((result as { _value: unknown })._value));
      }
      setOwnerCheckComplete(true);
    } catch {
      // Ignore errors, owner will be fetched on next load
      setOwnerCheckComplete(true);
    }
    
    // Hide success message after 5 seconds
    setTimeout(() => {
      setShowSuccess(false);
    }, 5000);
  };

  const handleTransactionError = (error: Error) => {
    // Transaction failed - error handled by UI
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
    track('NFT Purchase Failed', { 
      tokenId: tokenId,
      error: errorMessage
    });
    
    // Clear error after 10 seconds
    setTimeout(() => {
      setTransactionState('idle');
      setTransactionError(null);
    }, 10000);
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
          <p className="text-xl" style={{ color: COLORS.shirt }}>NFT not found in local metadata.</p>
        </div>
        <Footer />
      </main>
    );
  }

  const isFav = isFavorited((parseInt(tokenId) - 1).toString());

  return (
    <main id="main-content" className="min-h-screen bg-background text-foreground flex flex-col">
      <Navigation activePage="nfts" />
      <div className="max-w-7xl mx-auto py-4 sm:py-6 flex-grow pt-24 sm:pt-28 pb-16 sm:pb-20 px-6 sm:px-8 md:px-12 lg:px-16 xl:px-20 2xl:px-24">
        <div className="flex items-center justify-between mb-8 sm:mb-10">
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
                className="inline-flex items-center text-neutral-400 hover:text-brand-pink text-sm transition-colors group"
              >
                <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
                Back to collection
              </Link>
            );
          })()}

          {/* Navigation Arrows */}
          <div className="flex items-center gap-3">
            {navigationTokens.prev !== null && (
              <Link
                href={`/nft/${navigationTokens.prev}`}
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-neutral-800 hover:bg-neutral-900 text-neutral-400 hover:text-brand-pink transition-colors border border-neutral-700 hover:border-brand-pink"
                title={`Previous NFT #${navigationTokens.prev + 1}`}
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
            )}
            
            <span className="text-sm text-neutral-500 px-2">
              {parseInt(tokenId) + 1} of {TOTAL_COLLECTION_SIZE}
            </span>
            
            {navigationTokens.next !== null && (
              <Link
                href={`/nft/${navigationTokens.next}`}
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-neutral-800 hover:bg-neutral-900 text-neutral-400 hover:text-brand-pink transition-colors border border-neutral-700 hover:border-brand-pink"
                title={`Next NFT #${navigationTokens.next + 1}`}
              >
                <ChevronRight className="h-5 w-5" />
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:gap-12 xl:gap-16">
          {/* Left Column - Image and metadata links */}
          <div className="space-y-6 order-1 lg:order-1">
            {/* NFT Image Card */}
            <div className="relative" style={{ aspectRatio: "2700/3000" }}>
              <div className="relative w-full h-full">
                <Image
                  src={imageUrl || "/nfts/placeholder-nft.webp"}
                  alt={metadata?.name || `SATOSHE SLUGGER #${parseInt(tokenId) + 1}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-contain"
                  onError={() => setImageUrl("/nfts/placeholder-nft.webp")}
                  unoptimized={Boolean(imageUrl && typeof imageUrl === 'string' && (imageUrl.includes('/ipfs/') || imageUrl.includes('cloudflare-ipfs') || imageUrl.includes('ipfs.io')))}
                />
              </div>
            </div>

            {/* Artist and Platform - Two Column Layout - Mobile order-6 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 order-6 lg:order-none">
              <a
                href="https://kristenwoerdeman.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full px-4 py-3 bg-neutral-800 hover:bg-neutral-900 border border-neutral-600 rounded transition-colors group cursor-pointer"
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
                    <p className="text-sm font-medium text-off-white">Artist</p>
                    <p className="text-xs text-neutral-400">Kristen Woerdeman</p>
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
                className="flex items-center justify-between w-full px-4 py-3 bg-neutral-800 hover:bg-neutral-900 border border-neutral-600 rounded transition-colors group cursor-pointer"
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
                    <p className="text-sm font-medium text-off-white">Platform</p>
                    <p className="text-xs text-neutral-400">Retinal Delights</p>
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

            {/* IPFS Links - CID Information - Mobile order-7 */}
            <div className="space-y-3 order-7 lg:order-none">
                <a
                  href={metadata?.merged_data?.metadata_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between w-full px-4 py-3 bg-neutral-800 hover:bg-[#171717] border border-neutral-600 rounded transition-colors group focus:ring-2 focus:ring-green-500 focus:outline-none"
                  aria-label="View token metadata on IPFS"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: COLORS.hair + '20' }}>
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
                        style={{ color: COLORS.hair }}
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
                      <p className="text-sm font-medium" style={{ color: COLORS.hair }}>Token URI</p>
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
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: COLORS.background + '20' }}>
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
                        style={{ color: COLORS.background }}
                        aria-hidden="true"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21,15 16,10 5,21"></polyline>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: COLORS.background }}>Media URI</p>
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

            {/* Attributes - 3 rows, 2 columns - Mobile order-9 */}
            <div className="bg-neutral-800 p-4 rounded border border-neutral-700 order-9 lg:order-none">
              <h3 className="text-lg font-semibold mb-4 text-off-white">Attributes</h3>
              <div className="grid grid-cols-2 gap-3">
                {attributes.map((attr: { name: string; value: string; percentage?: number; occurrence?: number }, index: number) => (
                  <div key={index} className="bg-neutral-800 p-3 rounded border border-neutral-700">
                    <div className="flex items-center mb-2">
                      <div
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: getColorForAttribute(attr.name) }}
                      ></div>
                      <span className="text-sm md:text-xs text-neutral-400">{attr.name}</span>
                    </div>
                    <div className="text-base md:text-sm font-medium text-off-white mb-1">{attr.value}</div>
                    <div className="text-sm md:text-xs text-neutral-400">
                      {attr.percentage}% • {attr.occurrence} of {TOTAL_COLLECTION_SIZE}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column - NFT Details */}
          <div className="space-y-6 order-2 lg:order-2 flex flex-col">
            {/* NFT Name with Heart Icon - Mobile order-2 (after image) */}
            <div className="flex items-start justify-between gap-4 order-2 lg:order-none">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold leading-tight text-off-white">
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
              <div className="bg-neutral-800 p-4 rounded border border-neutral-700 order-3 lg:order-none">
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
            ) : isPurchased || isSoldOnChain ? (
              <div className="bg-neutral-800 p-4 rounded border border-green-500/30 order-3 lg:order-none">
                <div>
                  <p className="text-sm md:text-base mb-1 text-green-400">Sold!</p>
                  <p className="text-2xl sm:text-3xl md:text-2xl font-bold mb-3 text-green-400">
                    {priceEth > 0 ? `${priceEth} ETH` : '—'}
                  </p>
                  {ownerAddress && (
                    <p className="text-sm text-neutral-400 mt-2 mb-3">
                      Owner: <a href={`https://basescan.org/address/${ownerAddress}`} target="_blank" rel="noopener noreferrer" className="text-green-400 underline hover:text-green-300">{ownerAddress.slice(0,6)}...{ownerAddress.slice(-4)}</a>
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-3 mt-4">
                    <button
                      disabled
                      className="px-4 py-2 rounded-sm text-sm font-normal bg-green-500/10 border border-green-500/30 text-green-400 cursor-not-allowed opacity-75"
                    >
                      Sold
                    </button>
                    <Link
                      href={`https://opensea.io/assets/base/${CONTRACT_ADDRESS}/${parseInt(tokenId) - 1}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-green-400 hover:text-green-300 underline transition-colors"
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



            {/* Additional Details - Mobile order-4 */}
            <div className="bg-neutral-800 p-4 rounded border border-neutral-700 order-4 lg:order-none">
              <h3 className="text-lg font-semibold mb-4 text-off-white">Collection Details</h3>
              <div className="grid grid-cols-2 gap-4 text-base md:text-sm">
                <div>
                  <p className="text-neutral-400 mb-1 text-sm md:text-xs">NFT Number</p>
                  <p className="font-normal text-off-white">{metadata?.card_number ?? parseInt(tokenId) + 1}</p>
                </div>
                <div>
                  <p className="text-neutral-400 mb-1 text-sm md:text-xs">Token ID</p>
                  <p className="font-normal text-off-white">{metadata?.token_id ?? parseInt(tokenId) - 1}</p>
                </div>
                <div>
                  <p className="text-neutral-400 mb-1 text-sm md:text-xs">Collection</p>
                  <p className="font-normal text-off-white">
                    {metadata?.collection_number ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-neutral-400 mb-1 text-sm md:text-xs">Edition</p>
                  <p className="font-normal text-off-white">{metadata?.edition ?? "—"}</p>
                </div>
                <div>
                  <p className="text-neutral-400 mb-1 text-sm md:text-xs">Series</p>
                  <p className="font-normal text-off-white">{metadata?.series ?? "—"}</p>
                </div>
                <div>
                  <p className="text-neutral-400 mb-1 text-sm md:text-xs">Rarity Tier</p>
                  <p className="font-normal text-off-white">{metadata?.rarity_tier ?? "Unknown"}</p>
                </div>
                <div>
                  <p className="text-neutral-400 mb-1 text-sm md:text-xs">Rarity Score</p>
                  <p className="font-normal text-off-white">{metadata?.rarity_score ?? "—"}</p>
                </div>
                <div>
                  <p className="text-neutral-400 mb-1 text-sm md:text-xs">Rank</p>
                  <p className="font-normal text-off-white">{metadata?.rank ?? "—"} of {TOTAL_COLLECTION_SIZE}</p>
                </div>
                <div>
                  <p className="text-neutral-400 mb-1 text-sm md:text-xs">Rarity Percentage</p>
                  <p className="font-normal text-off-white">{metadata?.rarity_percent ?? "—"}%</p>
                </div>
              </div>
            </div>


            {/* Contract Details - Mobile order-5 */}
            <div className="bg-neutral-800 p-4 rounded border border-neutral-700 order-5 lg:order-none">
              <h3 className="text-lg font-semibold mb-4 text-off-white">Contract Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">Contract Address</span>
                    <div className="flex items-center gap-2">
                      <span className="text-off-white">{CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(CONTRACT_ADDRESS);
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
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">Token ID</span>
                    <span className="text-off-white">{metadata?.token_id ?? tokenId}</span>
                  </div>
                  <Separator className="bg-neutral-600" />
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">Token Standard</span>
                    <span className="text-off-white">ERC-721</span>
                  </div>
                  <Separator className="bg-neutral-600" />
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">Blockchain</span>
                    <span className="text-off-white">Base</span>
                  </div>
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
  );
}
