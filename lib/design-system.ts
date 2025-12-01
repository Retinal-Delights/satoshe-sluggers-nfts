/**
 * SATOSHE SLUGGERS DESIGN SYSTEM
 * Single source of truth based on docs/STYLE_GUIDE.md
 */

import { cn } from './utils';

// ============================================================================
// BREAKPOINTS
// ============================================================================
// sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  // Font Weights (from style guide)
  weights: {
    light: 'font-light',      // 300 - Values, body text
    normal: 'font-normal',     // 400 - Labels, categories, buttons
    medium: 'font-medium',     // 500 - Rare use
    semibold: 'font-semibold', // 600 - Headings, NFT names, prices
  },
  
  // Font Sizes (from style guide)
  sizes: {
    xs: 'text-xs',       // 12px - Footer, metadata
    sm: 'text-sm',       // 14px - Body text, descriptions
    base: 'text-base',   // 16px - Navigation, values
    lg: 'text-lg',       // 18px - Section headers
    xl: 'text-xl',       // 20px - Page titles (mobile)
    '2xl': 'text-2xl',   // 24px - NFT names, prices
    '3xl': 'text-3xl',   // 30px - Page titles (desktop)
  },
  
  // Line Heights
  leading: {
    tight: 'leading-tight',     // Headings
    normal: 'leading-normal',   // Body text
    relaxed: 'leading-relaxed', // Descriptions
  },
  
  // Fluid Typography for NFT Cards (scales smoothly with viewport)
  fluid: {
    // NFT name: scales from 0.875rem (14px) to 1.25rem (20px)
    nftName: 'text-[clamp(0.875rem,1vw+0.25rem,1.25rem)]',
    // Stats (rank/rarity/tier): scales from 0.75rem (12px) to 1rem (16px)
    stats: 'text-[clamp(0.75rem,0.8vw+0.2rem,1rem)]',
    // Price: scales from 0.875rem (14px) to 1.125rem (18px)
    price: 'text-[clamp(0.875rem,1vw+0.25rem,1.125rem)]',
  },
} as const;

// ============================================================================
// COLORS
// ============================================================================

export const colors = {
  // Brand Colors (from style guide)
  brand: {
    pink: '#ff0099',           // Primary brand
    pinkHover: '#ff0099/80',   // Hover state
    pinkFill: '#ff0099/90',    // Fill hover
  },
  
  // Semantic Colors (from style guide)
  semantic: {
    success: '#10B981',        // Green - Sold items, success
    successHover: '#10B981/90',
    successBg: '#10B981/10',
    successBorder: '#10B981/30',
    info: '#3B82F6',          // Blue - Unsold/purchasable, links
    infoHover: '#3B82F6/90',
    infoBg: '#3B82F6/10',
    infoBorder: '#3B82F6/30',
  },
  
  // Filter/Trait Colors (for sidebar filters and charts)
  filter: {
    red: '#EF4444',           // Red
    blue: '#3B82F6',          // Blue
    green: '#10B981',         // Green
    yellow: '#F59E0B',        // Yellow/Amber
    purple: '#8B5CF6',        // Purple
    cyan: '#06B6D4',          // Cyan/Teal
    orange: '#F97316',        // Orange
    neutral: '#6B7280',       // Gray
    violet: '#A855F7',        // Violet (for charts)
  },
  
  // Background Colors
  background: {
    dark: '#0a0a0a',          // Very dark background
    overlay: 'rgba(0, 0, 0, 0.5)', // Overlay
    stroke: '#262626',        // Stroke/border dark
  },
  
  // Neutral Colors (from style guide)
  neutral: {
    white: 'text-white',
    100: 'text-neutral-100',   // Primary text
    300: 'text-neutral-300',   // Light gray text
    400: 'text-neutral-400',   // Labels, inactive
    500: 'text-neutral-500',   // Placeholders
    700: 'border-neutral-700', // Borders
    800: 'bg-neutral-800',     // Cards
    900: 'bg-neutral-900',     // Dark backgrounds
    950: 'bg-neutral-950',     // Darkest backgrounds
  },
  
  // Text Colors
  text: {
    primary: 'text-neutral-100',
    secondary: 'text-neutral-400',
    muted: 'text-neutral-500',
    brand: 'text-[#ff0099]',
    success: 'text-green-400',
    info: 'text-blue-400',
  },
} as const;

// ============================================================================
// SPACING
// ============================================================================

export const spacing = {
  // Gaps (from style guide)
  gaps: {
    xs: 'gap-2',    // 8px - Tight
    sm: 'gap-3',    // 12px - Small
    md: 'gap-4',    // 16px - Default
    lg: 'gap-6',    // 24px - Large
    xl: 'gap-8',    // 32px - Extra large
  },
  
  // Grid Gaps (from style guide)
  gridGaps: {
    nftCards: 'gap-x-6 gap-y-8',
    details: 'gap-x-6 gap-y-4',
    attributes: 'gap-4',
  },
  
  // Margins (from style guide)
  margins: {
    xs: 'mb-2',     // 8px - Label/value
    sm: 'mb-4',     // 16px - Sections
    md: 'mb-8',     // 32px - Cards
  },
  
  // Padding (from style guide)
  padding: {
    sm: 'p-3',      // 12px - Small cards
    md: 'p-4',      // 16px - Standard cards
  },
} as const;

// ============================================================================
// BORDERS & RADIUS
// ============================================================================

export const borders = {
  // Border Radius (from style guide - rounded-sm everywhere)
  radius: {
    sm: 'rounded-sm',      // 2px - Standard
    full: 'rounded-full',  // Circles only
  },
  
  // Border Styles
  default: 'border border-neutral-700',
  hover: 'hover:border-[#ff0099]/50',
} as const;

// ============================================================================
// BUTTONS
// ============================================================================

export const buttons = {
  // Primary Button (from style guide)
  primary: 'px-6 py-2 bg-[#ff0099] text-white font-normal rounded-sm hover:bg-[#ff0099]/90 transition-all duration-200',
  
  // Outline Button (from style guide)
  outline: 'px-6 py-2 border border-[#ff0099] bg-transparent text-[#ff0099] font-normal rounded-sm hover:bg-[#ff0099] hover:text-off-white transition-all duration-200',
  
  // Buy Button (Green - for purchasable items)
  buy: 'px-6 py-2 border border-[#10B981] bg-green-500/10 text-green-400 font-normal rounded-sm hover:bg-green-500/30 hover:border-green-500/60 hover:text-green-300 transition-all duration-200',
  
  // Sold Button (Blue - for sold items)
  sold: 'px-6 py-2 border border-[#3B82F6] bg-blue-500/10 text-blue-400 font-normal rounded-sm hover:bg-blue-500/30 hover:border-blue-500/60 hover:text-blue-300 transition-all duration-200',
  
  // Small Buy/Sold Buttons
  buySmall: 'px-3 py-1 border border-[#10B981] bg-green-500/10 text-green-400 text-xs font-normal rounded-sm hover:bg-green-500/30 hover:border-green-500/60 hover:text-green-300 transition-all duration-200',
  soldSmall: 'px-3 py-1 border border-[#3B82F6] bg-blue-500/10 text-blue-400 text-xs font-normal rounded-sm hover:bg-blue-500/30 hover:border-blue-500/60 hover:text-blue-300 transition-all duration-200',
  
  // Disabled State
  disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',
} as const;

// ============================================================================
// CARDS & CONTAINERS
// ============================================================================

export const containers = {
  card: 'bg-neutral-800 p-4 rounded-sm border border-neutral-700',
  cardHover: 'bg-neutral-800 p-4 rounded-sm border border-neutral-700 hover:border-[#ff0099]/50 transition-colors',
  glass: 'bg-neutral-950/80 backdrop-blur-md border border-neutral-700 rounded-sm',
  attributeCard: 'bg-neutral-800 p-3 rounded-sm border border-neutral-700',
} as const;

// ============================================================================
// INPUTS
// ============================================================================

export const inputs = {
  base: 'text-sm font-normal rounded-sm text-neutral-100 border-neutral-700 bg-neutral-950/80 backdrop-blur-md placeholder:text-neutral-500 focus:outline-none focus:ring-0 focus:border-[#ff0099] transition-all duration-200',
  textarea: 'text-sm font-normal rounded-sm text-neutral-100 border-neutral-700 bg-neutral-950/80 backdrop-blur-md placeholder:text-neutral-500 focus:outline-none focus:ring-0 focus:border-[#ff0099] transition-all duration-200 resize-none',
} as const;

// ============================================================================
// TRANSITIONS
// ============================================================================

export const transitions = {
  default: 'transition-all duration-200',
  colors: 'transition-colors duration-200',
  transform: 'transition-transform duration-300',
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get NFT status color (green for live/unsold, blue for sold)
 */
export function getNFTStatusColor(isForSale: boolean): string {
  return isForSale ? colors.text.success : colors.text.info;
}

/**
 * Get button class for NFT action (buy vs sold)
 */
export function getNFTButtonClass(isForSale: boolean, size: 'default' | 'small' = 'default'): string {
  if (size === 'small') {
    return isForSale ? buttons.buySmall : buttons.soldSmall;
  }
  return isForSale ? buttons.buy : buttons.sold;
}

// Export cn utility
export { cn };

