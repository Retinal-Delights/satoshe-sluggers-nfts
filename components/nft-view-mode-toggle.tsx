"use client";

import React from "react";
import { LayoutGrid, Rows3, Grid3x3, Square } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { announceToScreenReader } from "@/lib/accessibility-utils";

type ViewMode = 'grid-large' | 'grid-medium' | 'grid-small' | 'compact';

interface NFTViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  viewToggleRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * View mode toggle buttons for NFT grid
 * 
 * Allows users to switch between:
 * - Large grid view
 * - Medium grid view
 * - Small grid view
 * - Compact table view
 */
export default function NFTViewModeToggle({
  viewMode,
  onViewModeChange,
  viewToggleRef,
}: NFTViewModeToggleProps) {
  return (
    <TooltipProvider>
      <div ref={viewToggleRef} className="flex items-center gap-1 border border-neutral-700 rounded-sm p-1 bg-neutral-900 flex-shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => {
                onViewModeChange('grid-large');
                announceToScreenReader('Switched to large grid view');
              }}
              className={`p-2 rounded-sm transition-colors ${viewMode === 'grid-large' ? 'bg-neutral-800 text-brand-pink' : 'text-neutral-500 hover:text-neutral-300'}`}
              aria-label="Switch to large grid view"
              aria-pressed={viewMode === 'grid-large'}
            >
              <Square className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-neutral-800 text-off-white border-neutral-600">
            <p>Large Grid</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => {
                onViewModeChange('grid-medium');
                announceToScreenReader('Switched to medium grid view');
              }}
              className={`p-2 rounded-sm transition-colors ${viewMode === 'grid-medium' ? 'bg-neutral-800 text-brand-pink' : 'text-neutral-500 hover:text-neutral-300'}`}
              aria-label="Switch to medium grid view"
              aria-pressed={viewMode === 'grid-medium'}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-neutral-800 text-off-white border-neutral-600">
            <p>Medium Grid</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => {
                onViewModeChange('grid-small');
                announceToScreenReader('Switched to small grid view');
              }}
              className={`p-2 rounded-sm transition-colors ${viewMode === 'grid-small' ? 'bg-neutral-800 text-brand-pink' : 'text-neutral-500 hover:text-neutral-300'}`}
              aria-label="Switch to small grid view"
              aria-pressed={viewMode === 'grid-small'}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-neutral-800 text-off-white border-neutral-600">
            <p>Small Grid</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => {
                onViewModeChange('compact');
                announceToScreenReader('Switched to compact table view');
              }}
              className={`p-2 rounded-sm transition-colors ${viewMode === 'compact' ? 'bg-neutral-800 text-brand-pink' : 'text-neutral-500 hover:text-neutral-300'}`}
              aria-label="Switch to compact table view"
              aria-pressed={viewMode === 'compact'}
            >
              <Rows3 className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-neutral-800 text-off-white border-neutral-600">
            <p>Compact Table</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

