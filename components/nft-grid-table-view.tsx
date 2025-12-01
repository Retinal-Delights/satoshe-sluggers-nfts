"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";
import { TOTAL_COLLECTION_SIZE } from "@/lib/contracts";
import { useFavorites } from "@/hooks/useFavorites";

interface NFTGridItem {
  id: string;
  tokenId: string;
  cardNumber: number;
  name: string;
  image: string;
  rank: number | string;
  rarity: string;
  rarityPercent: string | number;
  tier: string | number;
  priceEth: number;
  isForSale: boolean;
  soldPriceEth?: number;
}

interface NFTTableViewProps {
  nfts: NFTGridItem[];
  columnSort: { field: string; direction: 'asc' | 'desc' } | null;
  onColumnSort: (field: string) => void;
  focusedIndex: number;
  onKeyDown: (e: React.KeyboardEvent, index: number) => void;
}

/**
 * Compact table view for NFT grid
 * 
 * Displays NFTs in a table format with sortable columns for:
 * - NFT (image + name)
 * - Rank
 * - Rarity %
 * - Rarity Tier
 * - Price
 * - Favorite
 * - Actions
 */
export default function NFTTableView({
  nfts,
  columnSort,
  onColumnSort,
  focusedIndex,
  onKeyDown,
}: NFTTableViewProps) {
  const { isFavorited, toggleFavorite } = useFavorites();

  return (
    <div className="mt-4 mb-4 border border-neutral-700 rounded-sm overflow-x-hidden w-full">
      <div className="w-full min-w-0 overflow-x-hidden">
        <table className="w-full" style={{ tableLayout: 'auto' }}>
          <colgroup>
            <col style={{ width: '14.28%' }} />
            <col style={{ width: '14.28%' }} />
            <col style={{ width: '14.28%' }} />
            <col style={{ width: '14.28%' }} />
            <col style={{ width: '14.28%' }} />
            <col style={{ width: '14.28%' }} />
            <col style={{ width: '14.28%' }} />
          </colgroup>
          <thead className="bg-neutral-800/50 border-b border-neutral-700">
            <tr>
              <th 
                className="text-left px-2 sm:px-3 py-3 text-xs sm:text-sm font-medium text-off-white hover:text-brand-pink hover:underline cursor-pointer select-none transition-colors"
                onClick={() => onColumnSort('nft')}
              >
                <div className="flex items-center gap-1">
                  NFT
                  {columnSort?.field === 'nft' && (
                    <span className="text-brand-pink font-semibold">
                      {columnSort.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="text-left px-2 sm:px-3 py-3 text-xs sm:text-sm font-medium text-off-white hover:text-brand-pink hover:underline cursor-pointer select-none transition-colors"
                onClick={() => onColumnSort('rank')}
              >
                <div className="flex items-center gap-1">
                  Rank
                  {columnSort?.field === 'rank' && (
                    <span className="text-brand-pink font-semibold">
                      {columnSort.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="text-left px-2 sm:px-3 py-3 text-xs sm:text-sm font-medium text-off-white hover:text-brand-pink hover:underline cursor-pointer select-none transition-colors"
                onClick={() => onColumnSort('rarity')}
              >
                <div className="flex items-center gap-1">
                  Rarity
                  {columnSort?.field === 'rarity' && (
                    <span className="text-brand-pink font-semibold">
                      {columnSort.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="text-left px-2 sm:px-3 py-3 text-xs sm:text-sm font-medium text-off-white hover:text-brand-pink hover:underline cursor-pointer select-none transition-colors"
                onClick={() => onColumnSort('tier')}
              >
                <div className="flex items-center gap-1">
                  Rarity Tier
                  {columnSort?.field === 'tier' && (
                    <span className="text-brand-pink font-semibold">
                      {columnSort.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="text-left px-2 sm:px-3 py-3 text-xs sm:text-sm font-medium text-off-white hover:text-brand-pink hover:underline cursor-pointer select-none transition-colors"
                onClick={() => onColumnSort('price')}
              >
                <div className="flex items-center gap-1">
                  Price
                  {columnSort?.field === 'price' && (
                    <span className="text-brand-pink font-semibold">
                      {columnSort.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th 
                className="text-center px-1 sm:px-2 py-3 text-xs sm:text-sm font-medium text-off-white hover:text-brand-pink hover:underline cursor-pointer select-none transition-colors"
                onClick={() => onColumnSort('favorite')}
              >
                <div className="flex items-center justify-center gap-1">
                  Favorite
                  {columnSort?.field === 'favorite' && (
                    <span className="text-brand-pink font-semibold">
                      {columnSort.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
              <th className="text-left px-2 sm:px-3 py-3 text-xs sm:text-sm font-medium text-off-white">Actions</th>
            </tr>
          </thead>
          <tbody>
            {nfts.map((nft, index) => (
              <tr 
                key={nft.id} 
                tabIndex={0}
                onKeyDown={(e) => onKeyDown(e, index)}
                className={`border-b border-neutral-700/50 hover:bg-neutral-800/30 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-pink focus:ring-inset ${
                  index % 2 === 0 ? 'bg-neutral-900/20' : ''
                } ${focusedIndex === index ? 'ring-2 ring-brand-pink ring-inset' : ''}`}
              >
                <td className="px-2 sm:px-3 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Link href={`/nft/${nft.cardNumber}${typeof window !== 'undefined' && window.location.search ? `?returnTo=${encodeURIComponent(`/nfts${window.location.search}`)}` : ''}`} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity min-w-0 flex-1">
                      <Image src={nft.image} alt={`${nft.name} - NFT #${nft.cardNumber}, Rank ${nft.rank}, ${nft.rarity} rarity, Tier ${nft.tier}`} width={32} height={32} className="rounded object-contain flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-normal text-off-white leading-tight line-clamp-2">NFT #{nft.cardNumber}</p>
                        <p className="text-xs text-neutral-500 leading-tight line-clamp-1">Token ID: {nft.tokenId}</p>
                      </div>
                    </Link>
                  </div>
                </td>
                <td className="px-2 sm:px-3 py-3 text-xs text-neutral-300 font-normal text-left">{nft.rank} / {TOTAL_COLLECTION_SIZE}</td>
                <td className="px-2 sm:px-3 py-3 text-xs text-neutral-300 font-normal text-left">{nft.rarityPercent}%</td>
                <td className="px-2 sm:px-3 py-3 text-xs text-neutral-300 font-normal text-left">{nft.rarity || (typeof nft.tier === 'string' ? nft.tier.replace(" (Ultra-Legendary)", "") : nft.tier || '—')}</td>
                <td className="px-2 sm:px-3 py-3 text-xs font-normal text-left">
                  {nft.isForSale && nft.priceEth > 0 ? (
                    <div className="leading-tight text-blue-500">
                      <span className="whitespace-nowrap">{nft.priceEth}</span>
                      <span className="block sm:inline sm:ml-1">ETH</span>
                    </div>
                  ) : nft.soldPriceEth || !nft.isForSale ? (
                    <div className="leading-tight text-green-500">
                      <span className="whitespace-nowrap">{nft.soldPriceEth || nft.priceEth}</span>
                      <span className="block sm:inline sm:ml-1">ETH</span>
                    </div>
                  ) : (
                    <span className="text-neutral-500">—</span>
                  )}
                </td>
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
                    <Heart className={`w-4 h-4 ${isFavorited(nft.tokenId) ? "fill-brand-pink text-brand-pink" : "text-neutral-400 hover:text-neutral-300"}`} />
                  </button>
                </td>
                <td className="px-2 sm:px-3 py-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 flex-wrap">
                      {nft.isForSale ? (
                        <>
                          <Link
                            href={`/nft/${nft.cardNumber}${typeof window !== 'undefined' && window.location.search ? `?returnTo=${encodeURIComponent(`/nfts${window.location.search}`)}` : ''}`}
                            className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded-sm text-yellow-400 text-xs font-normal hover:bg-yellow-500/20 hover:border-yellow-500/50 transition-colors whitespace-nowrap"
                          >
                            View
                          </Link>
                          <Link
                            href={`/nft/${nft.cardNumber}${typeof window !== 'undefined' && window.location.search ? `?returnTo=${encodeURIComponent(`/nfts${window.location.search}`)}` : ''}`}
                            className="px-2 py-0.5 bg-green-500/10 border border-green-500 rounded-sm text-green-400 text-xs font-normal hover:bg-green-500/20 hover:border-green-500 transition-colors whitespace-nowrap"
                          >
                            Buy
                          </Link>
                        </>
                      ) : (
                        <Link
                          href={`/nft/${nft.cardNumber}${typeof window !== 'undefined' && window.location.search ? `?returnTo=${encodeURIComponent(`/nfts${window.location.search}`)}` : ''}`}
                          className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded-sm text-blue-400 text-xs font-normal hover:bg-blue-500/20 hover:border-blue-500/50 transition-colors whitespace-nowrap"
                        >
                          Sold
                        </Link>
                      )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

