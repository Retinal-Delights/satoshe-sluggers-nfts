"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NFTGridControlsProps {
  sortBy: string;
  onSortChange: (value: string) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (value: number) => void;
  onColumnSortSync?: (field: string) => void;
}

/**
 * Grid controls for sorting and items per page
 * 
 * Provides dropdowns for:
 * - Sorting (default, rank, rarity, price, favorites)
 * - Items per page (15, 25, 50, 100, 250)
 */
export default function NFTGridControls({
  sortBy,
  onSortChange,
  itemsPerPage,
  onItemsPerPageChange,
  onColumnSortSync,
}: NFTGridControlsProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 flex-wrap justify-start sm:justify-end w-full lg:w-auto overflow-x-hidden">
      <div className="flex items-center gap-2 min-w-0 flex-shrink-0 max-w-full">
        <span className="text-neutral-500 whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">Sort by:</span>
        <Select value={sortBy} onValueChange={(value) => {
          onSortChange(value);
          // Sync column sort when using dropdown for favorites
          if (value === 'favorite' && onColumnSortSync) {
            onColumnSortSync('favorite');
          }
        }}>
          <SelectTrigger className="w-full sm:w-[180px] md:w-[200px] lg:w-[240px] max-w-full bg-neutral-900 border-neutral-700 rounded-sm text-off-white font-normal min-w-0 text-xs sm:text-sm whitespace-nowrap flex-shrink-0">
            <SelectValue placeholder="Default" />
          </SelectTrigger>
          <SelectContent className="bg-neutral-950/95 backdrop-blur-md border-neutral-700 rounded-sm">
            <SelectItem value="default" className="text-xs sm:text-sm whitespace-nowrap">Default</SelectItem>
            <SelectItem value="rank-asc" className="text-xs sm:text-sm whitespace-nowrap">Rank: Low to High</SelectItem>
            <SelectItem value="rank-desc" className="text-xs sm:text-sm whitespace-nowrap">Rank: High to Low</SelectItem>
            <SelectItem value="rarity-asc" className="text-xs sm:text-sm whitespace-nowrap">Rarity: Low to High</SelectItem>
            <SelectItem value="rarity-desc" className="text-xs sm:text-sm whitespace-nowrap">Rarity: High to Low</SelectItem>
            <SelectItem value="price-asc" className="text-xs sm:text-sm whitespace-nowrap">Price: Low to High</SelectItem>
            <SelectItem value="price-desc" className="text-xs sm:text-sm whitespace-nowrap">Price: High to Low</SelectItem>
            <SelectItem value="favorite" className="text-xs sm:text-sm whitespace-nowrap">Favorites</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2 min-w-0 flex-shrink-0 max-w-full">
        <span className="text-neutral-500 whitespace-nowrap flex-shrink-0 text-xs sm:text-sm">Show:</span>
        <Select value={itemsPerPage.toString()} onValueChange={(val) => onItemsPerPageChange(Number(val))}>
          <SelectTrigger data-show-dropdown className="w-full sm:w-[140px] md:w-[160px] max-w-full bg-neutral-900 border-neutral-700 rounded-sm text-off-white font-normal min-w-0 text-xs sm:text-sm whitespace-nowrap flex-shrink-0">
            <SelectValue placeholder="15 items" />
          </SelectTrigger>
          <SelectContent className="bg-neutral-950/95 backdrop-blur-md border-neutral-700 rounded-sm">
            <SelectItem value="15" className="text-xs sm:text-sm whitespace-nowrap">15 items</SelectItem>
            <SelectItem value="25" className="text-xs sm:text-sm whitespace-nowrap">25 items</SelectItem>
            <SelectItem value="50" className="text-xs sm:text-sm whitespace-nowrap">50 items</SelectItem>
            <SelectItem value="100" className="text-xs sm:text-sm whitespace-nowrap">100 items</SelectItem>
            <SelectItem value="250" className="text-xs sm:text-sm whitespace-nowrap">250 items</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

