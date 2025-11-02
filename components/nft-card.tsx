"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { track } from "@vercel/analytics";
import { TOTAL_COLLECTION_SIZE } from "@/lib/contracts";

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
  tier: string | number;
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
  tier,
  viewMode = "grid-medium",
}: NFTCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);
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

  // --- Fluid font sizes (via clamp) ---
  const titleSize = "text-[clamp(0.85rem,0.25vw+0.8rem,1.05rem)]";
  const labelSize = "text-[clamp(0.7rem,0.2vw+0.65rem,0.9rem)]";
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
                setImgLoading(false);
              }}
              onError={() => {
                setImgError(true);
                setImgLoading(false);
              }}
              sizes="(max-width:768px)100vw,(max-width:1200px)50vw,33vw"
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
              onLoad={() => { setImgLoaded(true); setImgLoading(false); }}
              onError={() => { setImgError(true); setImgLoading(false); }}
            />
          </div>
        </Link>

        {/* NFT Details - aligned with card content, not drop shadow */}
        <div className="space-y-1 pl-3 pr-2 pb-2 w-full box-border">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <h3
              className="font-semibold text-[#FFFBEB]
                         text-[clamp(0.9rem,0.7vw,1.1rem)]
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
                    ? "fill-[#ff0099] text-[#ff0099]"
                    : "text-neutral-400 hover:text-[#ff0099]"
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

          {/* Buy Section */}
          {isForSale && (
            <div className="pt-1">
              <div className="flex items-end justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="text-blue-500 font-medium text-[clamp(0.65rem,0.4vw,0.85rem)]">
                    Buy Now
                  </div>
                  <div className="text-blue-400 font-semibold text-[clamp(0.75rem,0.6vw,1rem)] leading-none whitespace-nowrap">
                    {priceEth} ETH
                  </div>
                </div>
                <Link
                  href={`/nft/${cardNumber}`}
                  className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-sm 
                             text-blue-400 text-[clamp(0.6rem,0.5vw,0.85rem)] font-medium 
                             hover:bg-blue-500/20 transition-colors whitespace-nowrap"
                >
                  BUY
                </Link>
              </div>
            </div>
          )}
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
              setImgLoading(false);
            }}
            onError={() => {
              setImgError(true);
              setImgLoading(false);
            }}
            sizes="(max-width:768px)100vw,(max-width:1200px)50vw,33vw"
          />
        </div>
      </Link>

      <div className="pl-4 pr-3 pb-2 flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <div className={`text-green-400 font-medium leading-tight ${smallText}`}>
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
                  ? "fill-[#ff0099] text-[#ff0099]"
                  : "text-[#FFFBEB] hover:text-[#ff0099]"
              }`}
            />
          </Button>
        </div>

        <div className="flex justify-start">
          {isForSale ? (
            <Link
              href={`/nft/${cardNumber}`}
              className="px-2.5 py-1 bg-blue-500/10 border-2 border-blue-500/30 rounded-sm text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors"
            >
              Buy
            </Link>
          ) : (
            <Link
              href={`/nft/${cardNumber}`}
              className="px-2.5 py-1 bg-green-500/10 border border-green-500/30 rounded-sm text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors"
            >
              Sold
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
