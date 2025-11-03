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
  viewMode?: "grid-large" | "grid-medium" | "grid-small" | "compact";
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
  viewMode = "grid-medium",
}: NFTCardProps) {
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

  // Fluid font size for medium grid view
  const smallText = "text-[clamp(0.65rem,0.2vw+0.6rem,0.8rem)]";

  // --- View: Small grid ---
  if (viewMode === "grid-small") {
    return (
      <div className="overflow-visible w-full rounded-lg flex flex-col h-full bg-neutral-900 relative">
        <Link
          href={`/nft/${cardNumber}`}
          className="block w-full"
        >
          <div
            className="relative w-full overflow-visible"
            style={{ aspectRatio: "1/1" }}
          >
            <Image
              src={showPlaceholder ? placeholder : image}
              alt={name}
              fill
              loading="lazy"
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
          </div>
        </Link>
      </div>
    );
  }

  // --- View: Large grid ---
  if (viewMode === "grid-large") {
    return (
      <div className="overflow-visible w-full rounded-lg flex flex-col h-full bg-neutral-900 relative">
        {/* NFT Image */}
        <Link href={`/nft/${cardNumber}`} className="block w-full">
          <div
            className="relative w-full overflow-visible"
            style={{ aspectRatio: "0.9/1", maxHeight: "clamp(200px, 38vw, 400px)" }}
          >
            <Image
              src={showPlaceholder ? placeholder : image}
              alt={`${name} - NFT #${cardNumber}`}
              fill
              loading="lazy"
              className="object-contain p-2 rounded-lg transition-transform duration-300 ease-out hover:scale-[1.02] hover:rotate-[5deg] hover:-translate-y-1"
              sizes="(max-width:768px) 100vw, (max-width:1200px) 50vw, 33vw"
              onLoad={() => { setImgLoaded(true); }}
              onError={() => { setImgError(true); }}
              unoptimized={Boolean(image && (image.includes('/ipfs/') || image.includes('cloudflare-ipfs') || image.includes('ipfs.io')))}
            />
          </div>
        </Link>

        {/* NFT Details - aligned with card content, not drop shadow */}
        <div className="space-y-1 px-2 pb-2 w-full box-border max-w-full overflow-hidden">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <h3
              className="font-semibold text-off-white text-fluid-md
                         leading-snug break-words flex-1 min-w-0"
            >
              {name}
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
                    ? "fill-brand-pink text-brand-pink"
                    : "text-neutral-400 hover:text-brand-pink"
                }`}
              />
            </Button>
          </div>

          {/* Stats block */}
          <div className="text-neutral-400 space-y-0.5">
            <div className="flex justify-between">
              <span className="nft-meta-label">Rank:</span><span className="nft-meta-value">{rank} of {TOTAL_COLLECTION_SIZE}</span>
            </div>
            <div className="flex justify-between">
              <span className="nft-meta-label">Rarity:</span><span className="nft-meta-value">{rarityPercent}%</span>
            </div>
            <div className="flex justify-between">
              <span className="nft-meta-label">Tier:</span><span className="nft-meta-value">{rarity}</span>
            </div>
          </div>

          {/* Buy/Sold Section */}
          <div className="pt-1">
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className={`font-medium text-fluid-xs ${isForSale ? 'text-blue-500' : 'text-green-500'}`}>
                  {isForSale ? 'Buy Now' : 'Sold!'}
                </div>
                <div className={`font-semibold text-fluid-sm leading-none whitespace-nowrap ${isForSale ? 'text-blue-400' : 'text-green-400'}`}>
                  {priceEth} ETH
                </div>
              </div>
              <Link
                href={`/nft/${cardNumber}`}
                className={`px-3 py-1.5 rounded-sm text-[clamp(0.6rem,0.5vw,0.85rem)] font-medium transition-colors whitespace-nowrap ${
                  isForSale
                    ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
                    : 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20'
                }`}
              >
                {isForSale ? 'BUY' : 'Sold'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- View: Medium grid ---
  return (
    <div className="overflow-visible w-full rounded-lg flex flex-col h-full bg-neutral-900 relative">
      <Link href={`/nft/${cardNumber}`} className="block w-full">
        <div
          className="relative w-full overflow-visible"
          style={{ aspectRatio: "0.85/1" }}
        >
          <Image
            src={showPlaceholder ? placeholder : image}
            alt={name}
            fill
            loading="lazy"
            className={`object-contain p-1 hover:scale-[1.02] hover:rotate-[5deg] transition-transform duration-300 ease-out ${showPlaceholder ? "animate-pulse" : ""}`}
            onLoad={() => {
              setImgLoaded(true);
            }}
            onError={() => {
              setImgError(true);
            }}
            sizes="(max-width:768px)100vw,(max-width:1200px)50vw,33vw"
          />
        </div>
      </Link>

      <div className="px-2 pb-2 flex flex-col max-w-full overflow-hidden">
        <div className="flex items-center justify-between mb-1 gap-2">
          <div className={`font-medium leading-tight ${smallText} ${isForSale ? 'text-blue-400' : 'text-green-400'} truncate flex-1 min-w-0`}>
            NFT — #{cardNumber}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-transparent"
            onClick={handleFavoriteClick}
          >
            <Heart
              className={`w-4 h-4 ${
                isFav
                  ? "fill-brand-pink text-brand-pink"
                  : "text-off-white hover:text-brand-pink"
              }`}
            />
          </Button>
        </div>

        <div className="space-y-1 mt-1">
          <div className={`font-medium ${smallText} ${isForSale ? 'text-blue-500' : 'text-green-500'}`}>
            {isForSale ? 'Buy Now' : 'Sold!'}
          </div>
          <div className={`font-semibold ${smallText} ${isForSale ? 'text-blue-400' : 'text-green-400'}`}>
            {priceEth} ETH
          </div>
          <div className="flex justify-start">
            <Link
              href={`/nft/${cardNumber}`}
              className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-colors ${
                isForSale
                  ? 'bg-blue-500/10 border-2 border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
                  : 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20'
              }`}
            >
              {isForSale ? 'Buy' : 'Sold'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
