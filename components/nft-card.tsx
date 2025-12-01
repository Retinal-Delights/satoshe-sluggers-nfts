"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { track } from "@vercel/analytics";
import { TOTAL_COLLECTION_SIZE } from "@/lib/contracts";

/**
 * NFTCard Component
 * 
 * Displays a single NFT card with image, details, and purchase/favorite options.
 * Supports multiple view modes: grid-large, grid-medium, grid-small, and compact.
 * 
 * @example
 * ```tsx
 * <NFTCard
 *   name="Satoshe Slugger #1"
 *   image="/nfts/1.webp"
 *   rank={1}
 *   rarity="Legendary"
 *   rarityPercent="0.01"
 *   priceEth={0.5}
 *   tokenId="1"
 *   cardNumber={1}
 *   isForSale={true}
 *   viewMode="grid-large"
 * />
 * ```
 * 
 * @param {NFTCardProps} props - Component props
 * @returns {JSX.Element} NFT card component
 */
interface NFTCardProps {
  image: string;
  name: string;
  rank: string | number;
  rarity: string;
  rarityPercent: string | number;
  priceEth: number;
  tokenId: string;
  cardNumber: number;
  isForSale: boolean;
  soldPriceEth?: number;
  viewMode?: "grid-large" | "grid-medium" | "grid-small" | "compact";
  priority?: boolean;
  returnToUrl?: string;
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
  soldPriceEth,
  viewMode = "grid-medium",
  priority = false,
  returnToUrl,
}: NFTCardProps) {
  // Use soldPriceEth if available and not for sale, otherwise use priceEth
  const displayPrice = (!isForSale && soldPriceEth) ? soldPriceEth : priceEth;
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const placeholder = "/nfts/placeholder-nft.webp";
  const showPlaceholder = !imgLoaded || imgError;

  const { isFavorited, toggleFavorite, isConnected } = useFavorites();
  const isFav = isFavorited(tokenId);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isConnected) {
      alert("Please connect your wallet to favorite NFTs");
      return;
    }

    const wasFavorited = isFav;
    toggleFavorite({ tokenId, name, image, rarity, rank, rarityPercent });

    track(wasFavorited ? "NFT Unfavorited" : "NFT Favorited", {
      tokenId,
      rarity,
    });
  };

  // --- View: Small grid ---
  if (viewMode === "grid-small") {
    return (
      <div className="nft-card-wrapper">
        <div className="nft-card-image">
          <div
            className="relative overflow-visible"
            style={{ aspectRatio: "1/1" }}
          >
            <Link
              href={`/nft/${cardNumber}${returnToUrl ? `?returnTo=${encodeURIComponent(returnToUrl)}` : ''}`}
              className="block w-full h-full relative"
            >
              <Image
                src={showPlaceholder ? placeholder : image}
                alt={name}
                fill
                priority={priority}
                loading={priority ? undefined : "lazy"}
                className={`object-contain p-2 hover:scale-[1.02] hover:rotate-[5deg] transition-transform duration-300 ease-out ${showPlaceholder ? "animate-pulse" : ""}`}
                onLoad={() => {
                  setImgLoaded(true);
                }}
                onError={() => {
                  setImgError(true);
                }}
                sizes="(max-width:768px)100vw,(max-width:1200px)50vw,33vw"
                unoptimized={Boolean(image && (image.includes('/ipfs/') || image.includes('cloudflare-ipfs') || image.includes('ipfs.io')))}
              />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --- View: Large grid ---
  if (viewMode === "grid-large") {
    return (
      <div className="nft-card-wrapper">
        <div className="w-full flex flex-col">
          <div className="nft-card-image">
            <div className="relative" style={{ aspectRatio: "0.9/1", maxHeight: "var(--nft-image-height)" }}>
              <Link href={`/nft/${cardNumber}${returnToUrl ? `?returnTo=${encodeURIComponent(returnToUrl)}` : ''}`} className="block w-full h-full relative">
                <Image
                  src={showPlaceholder ? placeholder : image}
                  alt={`${name} - NFT #${cardNumber}`}
                  fill
                  priority={priority}
                  loading={priority ? undefined : "lazy"}
                  className="object-contain transition-transform duration-300 ease-out hover:scale-[1.02] hover:rotate-[5deg]"
                  sizes="(max-width:768px) 100vw, (max-width:1200px) 50vw, 33vw"
                  onLoad={() => { setImgLoaded(true); }}
                  onError={() => { setImgError(true); }}
                  unoptimized={Boolean(image && (image.includes('/ipfs/') || image.includes('cloudflare-ipfs') || image.includes('ipfs.io')))}
                />
              </Link>
            </div>
          </div>

          <div className="pl-2 pr-2 w-full">
            <div className="flex items-start justify-between gap-2 min-w-0">
              <h3 className="font-semibold text-off-white text-nft-title leading-snug truncate min-w-0 flex-1 whitespace-nowrap">
                #{cardNumber}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 flex-shrink-0 hover:bg-transparent"
                onClick={handleFavoriteClick}
                aria-label="Favorite NFT"
              >
                <Heart
                  className={`w-4 h-4 transition-colors ${
                    isFav
                      ? "fill-[#FF0099] text-[#FF0099]"
                      : "text-[#FFFBE8] hover:text-[#FF0099]"
                  }`}
                />
              </Button>
            </div>

            <div className="w-full flex flex-col gap-[2px] leading-[1.2]">
              <div className="flex justify-between gap-2">
                <span className="text-[0.75rem] text-gray-300 font-normal whitespace-nowrap truncate flex-shrink-0">Rank:</span>
                <span className="text-[0.8rem] text-gray-300 font-normal whitespace-nowrap truncate">{rank} of {TOTAL_COLLECTION_SIZE}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[0.75rem] text-gray-300 font-normal whitespace-nowrap truncate flex-shrink-0">Rarity:</span>
                <span className="text-[0.8rem] text-gray-300 font-normal whitespace-nowrap truncate">{rarityPercent}%</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-[0.75rem] text-gray-300 font-normal whitespace-nowrap truncate flex-shrink-0">Tier:</span>
                <span className="text-[0.8rem] text-gray-300 font-normal break-words">{rarity}</span>
              </div>
            </div>

            {isForSale ? (
              <div className="w-full flex items-center justify-between mt-2">
                <div className="overflow-hidden min-w-0 flex-1">
                  <div className="text-[clamp(11px,0.4vw+5px,14px)] font-medium text-blue-500 whitespace-nowrap truncate">
                    Buy Now
                  </div>
                  <div className="text-[clamp(12px,0.55vw+6px,15px)] font-normal leading-[1.15] text-blue-400 whitespace-nowrap truncate">
                    {displayPrice} ETH
                  </div>
                </div>
                <Link
                  href={`/nft/${cardNumber}${returnToUrl ? `?returnTo=${encodeURIComponent(returnToUrl)}` : ''}`}
                  className="px-2 sm:px-3 py-1.5 rounded-sm font-normal transition-all duration-200 whitespace-nowrap flex-shrink-0 text-[clamp(11px,0.5vw+5px,15px)] bg-blue-500/10 border border-blue-500 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500"
                >
                  BUY
                </Link>
              </div>
            ) : (
              <div className="w-full flex items-center justify-between mt-2">
                <div className="overflow-hidden min-w-0 flex-1">
                  <div className="text-[clamp(11px,0.4vw+5px,14px)] font-medium text-[#00FF99] whitespace-nowrap truncate">
                    Sold
                  </div>
                  {soldPriceEth && soldPriceEth > 0 ? (
                    <div className="text-[clamp(12px,0.55vw+6px,15px)] font-normal leading-[1.15] text-[#00FF99] whitespace-nowrap truncate">
                      {soldPriceEth} ETH
                    </div>
                  ) : null}
                </div>
                <span className="px-2 sm:px-3 py-1.5 rounded-sm font-normal transition-all duration-200 whitespace-nowrap flex-shrink-0 text-[clamp(11px,0.5vw+5px,15px)] bg-[#00FF99]/10 border-[1.5px] border-[#00FF99]/30 text-[#00FF99] cursor-not-allowed opacity-75">
                  Sold
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- View: Medium grid ---
  return (
    <div className="nft-card-wrapper">
      <div className="w-full flex flex-col">
        <div className="nft-card-image">
          <div className="relative" style={{ aspectRatio: "0.85/1" }}>
            <Link href={`/nft/${cardNumber}${returnToUrl ? `?returnTo=${encodeURIComponent(returnToUrl)}` : ''}`} className="block w-full h-full relative">
              <Image
                src={showPlaceholder ? placeholder : image}
                alt={name}
                fill
                priority={priority}
                loading={priority ? undefined : "lazy"}
                className={`object-contain transition-transform duration-300 ease-out hover:scale-[1.02] hover:rotate-[5deg] ${showPlaceholder ? "animate-pulse" : ""}`}
                onLoad={() => {
                  setImgLoaded(true);
                }}
                onError={() => {
                  setImgError(true);
                }}
                sizes="(max-width:768px)100vw,(max-width:1200px)50vw,33vw"
              />
            </Link>
          </div>
        </div>

        <div className="pl-2 pr-2 w-full">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className={`font-medium leading-[1.15] text-[clamp(12px,0.55vw+6px,15px)] ${isForSale ? 'text-blue-400' : 'text-green-400'} whitespace-nowrap truncate min-w-0 flex-1`}>
              NFT — #{cardNumber}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-transparent flex-shrink-0"
              onClick={handleFavoriteClick}
            >
              <Heart
                className={`w-4 h-4 transition-colors ${
                  isFav
                    ? "fill-[#FF0099] text-[#FF0099]"
                    : "text-[#FFFBE8] hover:text-[#FF0099]"
                }`}
              />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
