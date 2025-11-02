// components/nft-card.tsx
"use client"

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { track } from '@vercel/analytics';
import { TOTAL_COLLECTION_SIZE } from "@/lib/contracts";
// Removed BuyDirectListingButton imports - using regular buttons to avoid RPC calls

interface NFTCardProps {
  image: string;
  name: string;
  rank: string | number;
  rarity: string;
  rarityPercent: string | number;
  priceEth: number; // Static price from metadata
  tokenId: string;
  cardNumber: number; // NFT card number (not token ID)
  isForSale: boolean;
  tier: string | number;
  viewMode?: 'grid-large' | 'grid-medium' | 'grid-small' | 'compact';
}

export default function NFTCard({
  image,
  name,
  rank,
  rarity,
  rarityPercent,
  priceEth,
  tokenId,
  cardNumber,
  isForSale,
  tier,
  viewMode = 'grid-medium',
}: NFTCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
  const placeholder = "/nfts/placeholder-nft.webp";
  const showPlaceholder = !imgLoaded || imgError;

  // Favorites functionality
  const { isFavorited, toggleFavorite, isConnected } = useFavorites();
  const isFav = isFavorited(tokenId);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isConnected) {
      alert('Please connect your wallet to favorite NFTs');
      return;
    }

    const wasFavorited = isFav;
    toggleFavorite({
      tokenId,
      name,
      image,
      rarity,
      rank,
      rarityPercent,
    });

    // Minimal analytics
    track(wasFavorited ? 'NFT Unfavorited' : 'NFT Favorited', {
      tokenId,
      rarity,
    });
  };


  // Small grid - just images, tightly packed
  if (viewMode === 'grid-small') {
    return (
      <div className="overflow-visible w-full rounded-lg flex flex-col h-full bg-neutral-900 group relative">
        <div className="absolute -bottom-1 left-0 right-0 h-1 bg-black/20 blur-sm"></div>
        
        {/* NFT Image Only */}
        <Link href={`/nft/${cardNumber}${typeof window !== 'undefined' && window.location.search ? `?returnTo=${encodeURIComponent(`/nfts${window.location.search}`)}` : ''}`} className="block w-full">
          <div className="relative bg-neutral-900 w-full overflow-visible" style={{ aspectRatio: "0.9/1" }}>
            <Image
              src={showPlaceholder ? placeholder : image}
              alt={`${name} - NFT #${cardNumber}, Rank ${rank}, ${rarity} rarity, Tier ${tier}`}
              fill
              loading="lazy"
              className={`object-contain p-2 hover:scale-[1.02] hover:rotate-[5deg] hover:-translate-y-1 transition-all duration-300 ease-out relative z-20 ${showPlaceholder ? 'animate-pulse' : ''}`}
              onLoad={() => {
                setImgLoaded(true);
                setImgLoading(false);
              }}
              onError={() => {
                setImgError(true);
                setImgLoading(false);
              }}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            {imgLoading && !showPlaceholder && (
              <div className="absolute inset-0 bg-neutral-900/80 flex items-center justify-center">
                <div className="animate-pulse text-neutral-400 text-sm">Loading...</div>
              </div>
            )}
          </div>
        </Link>
      </div>
    );
  }

  // Large grid - full details (original design)
  if (viewMode === 'grid-large') {
    return (
      <div className="overflow-visible w-full rounded-lg flex flex-col h-full bg-neutral-900 group relative">
        <div className="absolute -bottom-1 left-0 right-0 h-1 bg-black/20 blur-sm"></div>
        
        {/* NFT Image */}
        <Link href={`/nft/${cardNumber}${typeof window !== 'undefined' && window.location.search ? `?returnTo=${encodeURIComponent(`/nfts${window.location.search}`)}` : ''}`} className="block w-full">
          <div className="relative bg-neutral-900 w-full overflow-visible" style={{ aspectRatio: "0.9/1" }}>
            <Image
              src={showPlaceholder ? placeholder : image}
              alt={`${name} - NFT #${cardNumber}, Rank ${rank}, ${rarity} rarity, Tier ${tier}`}
              fill
              loading="lazy"
              className={`object-contain p-2 hover:scale-[1.02] hover:rotate-[5deg] hover:-translate-y-1 transition-all duration-300 ease-out relative z-20 ${showPlaceholder ? 'animate-pulse' : ''}`}
              onLoad={() => {
                setImgLoaded(true);
                setImgLoading(false);
              }}
              onError={() => {
                setImgError(true);
                setImgLoading(false);
              }}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            {imgLoading && !showPlaceholder && (
              <div className="absolute inset-0 bg-neutral-900/80 flex items-center justify-center">
                <div className="animate-pulse text-neutral-400 text-sm">Loading...</div>
              </div>
            )}
          </div>
        </Link>

        {/* Details Section - Full details for large grid */}
        <div className="space-y-1 pl-4 pr-2 pb-2">
          {/* Title and Favorite */}
          <div className="flex items-start justify-between gap-2">
            <Link href={`/nft/${cardNumber}${typeof window !== 'undefined' && window.location.search ? `?returnTo=${encodeURIComponent(`/nfts${window.location.search}`)}` : ''}`} className="flex-1 min-w-0">
              <h3 className="font-medium text-sm leading-tight text-[#FFFBEB] truncate">
                {name}
              </h3>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-transparent flex-shrink-0"
              onClick={handleFavoriteClick}
              aria-label={isFav ? `Remove ${name} from favorites` : `Add ${name} to favorites`}
              aria-pressed={isFav}
            >
              <Heart className={`w-4 h-4 ${isFav ? "fill-[#ff0099] text-[#ff0099]" : "text-neutral-400 hover:text-[#ff0099] hover:outline hover:outline-1 hover:outline-[#ff0099]"}`} />
            </Button>
          </div>

          {/* Stats */}
          <div className="text-xs text-neutral-400 space-y-0.5">
            <div className="flex justify-between">
              <span className="text-neutral-400">Rank:</span>
              <span className="text-neutral-400">{rank} of {TOTAL_COLLECTION_SIZE}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Rarity:</span>
              <span className="text-neutral-400">{rarityPercent}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Tier:</span>
              <span className="text-neutral-400">{rarity.replace(" (Ultra-Legendary)", "")}</span>
            </div>
          </div>

          {/* Buy Section */}
          <div className="pt-1">
            {isForSale ? (
              <div className="flex items-end justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-blue-500 font-medium mb-0.5">
                    Buy Now
                  </div>
                  <div className="text-sm text-blue-400 font-semibold">
                    {priceEth} ETH
                  </div>
                </div>
                <div className="flex-shrink-0 -mt-1">
                  <Link
                    href={`/nft/${cardNumber}${typeof window !== 'undefined' && window.location.search ? `?returnTo=${encodeURIComponent(`/nfts${window.location.search}`)}` : ''}`}
                    className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-sm text-blue-400 text-xs font-medium hover:bg-blue-500/20 hover:border-blue-500/50 transition-colors"
                    aria-label={`Buy ${name} for ${priceEth} ETH`}
                  >
                    BUY
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // Medium grid - current compact design
  return (
    <div className="overflow-visible w-full max-w-xs mx-auto rounded-lg flex flex-col h-full bg-neutral-900 group relative">
      <div className="absolute -bottom-1 left-0 right-0 h-1 bg-black/20 blur-sm"></div>
      
      {/* NFT Image */}
      <Link href={`/nft/${cardNumber}${typeof window !== 'undefined' && window.location.search ? `?returnTo=${encodeURIComponent(`/nfts${window.location.search}`)}` : ''}`} className="block w-full">
        <div className="relative w-full overflow-visible" style={{ aspectRatio: "0.8/1" }}>
          <Image
            src={showPlaceholder ? placeholder : image}
            alt={name}
            fill
            loading="lazy"
            className={`object-contain p-1 hover:scale-[1.02] hover:rotate-[5deg] hover:-translate-y-1 transition-all duration-300 ease-out relative z-20 ${showPlaceholder ? 'animate-pulse' : ''}`}
            onLoad={() => {
              setImgLoaded(true);
              setImgLoading(false);
            }}
            onError={() => {
              setImgError(true);
              setImgLoading(false);
            }}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {imgLoading && !showPlaceholder && (
            <div className="absolute inset-0 bg-neutral-900/80 flex items-center justify-center">
              <div className="animate-pulse text-neutral-400 text-sm">Loading...</div>
            </div>
          )}
          
        </div>
      </Link>

      {/* NFT Details Section - Medium grid design */}
      <div className="pl-4 pr-3 -mt-1 pb-2 flex flex-col">
        {/* NFT Info and Heart - Top Row */}
        <div className="flex items-center justify-between mb-1">
          {/* NFT Info */}
          <div className="text-green-400 text-xs font-medium leading-tight">
            NFT — #{cardNumber}
          </div>
          
          {/* Heart Icon */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-transparent flex-shrink-0"
            onClick={handleFavoriteClick}
            aria-label={isFav ? `Remove ${name} from favorites` : `Add ${name} to favorites`}
            aria-pressed={isFav}
          >
            <Heart className={`w-4 h-4 ${isFav ? "fill-[#ff0099] text-[#ff0099]" : "text-[#FFFBEB] hover:text-[#ff0099] hover:outline hover:outline-1 hover:outline-[#ff0099]"}`} />
          </Button>
        </div>

        {/* Buy Button - Bottom Row */}
        <div className="flex justify-start">
          {isForSale ? (
            <Link
              href={`/nft/${cardNumber}${typeof window !== 'undefined' && window.location.search ? `?returnTo=${encodeURIComponent(`/nfts${window.location.search}`)}` : ''}`}
              className="px-2.5 py-1 bg-blue-500/10 border-2 border-blue-500/30 rounded-sm text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors"
              aria-label={`Buy ${name} for ${priceEth} ETH`}
            >
              Buy
            </Link>
          ) : (
            <Link
              href={`/nft/${cardNumber}${typeof window !== 'undefined' && window.location.search ? `?returnTo=${encodeURIComponent(`/nfts${window.location.search}`)}` : ''}`}
              className="px-2.5 py-1 bg-green-500/10 border border-green-500/30 rounded-sm text-green-400 text-xs font-medium hover:bg-green-500/20 hover:border-green-500/50 transition-colors"
              aria-label={`View sold ${name} details`}
            >
              Sold
            </Link>
          )}
        </div>

      </div>

    </div>
  );
}
