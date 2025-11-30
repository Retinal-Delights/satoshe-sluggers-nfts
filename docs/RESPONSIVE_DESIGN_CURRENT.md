# 📱 Responsive Design Configuration - CURRENT STATE

**Documentation of current responsive design values in use**

**Last Updated:** December 2024  
**Status:** Current Implementation (Mixed Approach - Breakpoints + Clamp)

---

## 🎯 Design Philosophy

**Current Approach:** **HYBRID** - Mix of breakpoint-based and fluid clamp()
- Breakpoint-based: Used for headings, navigation, major layout elements
- Fluid clamp(): Used for NFT cards, sidebar text, stats, buttons

**Note:** This mixed approach is causing inconsistencies. Should be standardized to ONE approach.

---

## 📐 Breakpoints

### Standard Breakpoints (from tailwind.config.ts)

| Breakpoint | Min Width | Device Type | Current Usage |
|------------|-----------|-------------|---------------|
| **xs** | `475px` | Small phones | Limited use |
| **sm** | `640px` | Large phones | Common breakpoint for mobile → tablet |
| **md** | `768px` | Tablets | Common breakpoint for tablet → desktop |
| **lg** | `1024px` | Small laptops | Common breakpoint for desktop layouts |
| **xl** | `1280px` | Desktops | Sidebar visibility, main desktop layout |
| **2xl** | `1536px` | Large desktops | Sidebar width expansion, grid columns |
| **3xl** | `1920px` | Extra large | Not commonly used |
| **4xl** | `2560px` | Ultra wide | Not commonly used |

### Custom Breakpoints

| Name | Min Width | Purpose |
|------|-----------|---------|
| **tall** | `min-height: 800px` | Height-based breakpoint (not commonly used) |
| **short** | `max-height: 600px` | Height-based breakpoint (not commonly used) |

---

## 📝 Typography - Text Sizes by Breakpoint

### Approach: **HYBRID** (Breakpoint-based + Fluid clamp)

### Headings

#### H1 - Main Page Titles (NFTs Page)
| Breakpoint | Size | Class | Pixels |
|------------|------|-------|--------|
| **Default (mobile)** | `text-4xl` | `text-4xl` | 36px |
| **sm (640px+)** | `text-5xl` | `sm:text-5xl` | 48px |
| **md (768px+)** | `text-6xl` | `md:text-6xl` | 60px |
| **lg (1024px+)** | `text-7xl` | `lg:text-7xl` | 72px |
| **xl (1280px+)** | `text-8xl` | `xl:text-8xl` | 96px |
| **2xl (1536px+)** | `text-8xl` | (inherits xl) | 96px |

**Location:** `app/nfts/page.tsx` line 129

#### H2 - Section Headers (Collection Stats, Grid Headers)
| Breakpoint | Size | Class | Pixels |
|------------|------|-------|--------|
| **Default** | `text-lg` | `text-lg` | 18px |
| **sm** | `text-lg` | (inherits) | 18px |
| **md** | `text-lg` | (inherits) | 18px |
| **lg** | `text-lg` | (inherits) | 18px |

**Location:** `components/nft-grid.tsx` line 713

#### H3 - Subsection Headers (Sidebar Sections)
| Breakpoint | Size | Class | Pixels |
|------------|------|-------|--------|
| **Default** | `text-sm` | `text-sm` | 14px |
| **sm** | `text-base` | `sm:text-base` | 16px |
| **md** | `text-base` | (inherits) | 16px |

**Location:** `components/nft-sidebar.tsx` line 198

### Body Text

#### Primary Body Text (Tagline on NFTs Page)
| Breakpoint | Size | Class | Pixels |
|------------|------|-------|--------|
| **Default** | `text-sm` | `text-sm` | 14px |
| **sm** | `text-base` | `sm:text-base` | 16px |
| **md** | `text-lg` | `md:text-lg` | 18px |
| **lg** | `text-xl` | `lg:text-xl` | 20px |

**Location:** `app/nfts/page.tsx` line 132

#### Secondary Body Text / Descriptions
| Breakpoint | Size | Class | Pixels |
|------------|------|-------|--------|
| **Default** | `text-sm` | `text-sm` | 14px |
| **sm** | `text-sm` | (inherits) | 14px |
| **md** | `text-sm` | (inherits) | 14px |

### UI Elements

#### Navigation Links
| Breakpoint | Size | Class | Pixels |
|------------|------|-------|--------|
| **Default** | `text-base` | `text-base` | 16px (typical) |
| **sm** | `text-base` | (inherits) | 16px |
| **md** | `text-base` | (inherits) | 16px |
| **lg** | `text-base` | (inherits) | 16px |

#### Buttons (Mobile Filter Button)
| Breakpoint | Size | Class | Pixels |
|------------|------|-------|--------|
| **Default** | `text-sm` | `text-sm` | 14px |
| **sm** | `text-sm` | (inherits) | 14px |
| **md** | `text-sm` | (inherits) | 14px |

**Location:** `app/nfts/page.tsx` line 163

#### Form Inputs / Labels
| Breakpoint | Size | Class | Pixels |
|------------|------|-------|--------|
| **Default** | `text-xs` | `text-xs` | 12px |
| **sm** | `text-sm` | `sm:text-sm` | 14px |
| **md** | `text-sm` | (inherits) | 14px |

**Location:** `components/nft-sidebar.tsx` line 229

### NFT-Specific Elements

#### NFT Card Names (Grid Large View)
**Using Fluid Typography (clamp):**
```
text-fluid-md = clamp(0.9rem, 0.5vw + 0.8rem, 1.1rem)
Min: 14.4px, Preferred: 0.5vw + 12.8px, Max: 17.6px
```

**Location:** `components/nft-card.tsx` line 152, `app/globals.css` line 422

#### NFT Card Stats (Rank, Rarity, Tier)
**Using Fluid Typography (clamp):**
```
nft-meta-label / nft-meta-value = clamp(0.85rem, 0.6vw, 1rem)
Min: 13.6px, Preferred: 0.6vw, Max: 16px
```

**Location:** `app/globals.css` lines 442-448

#### NFT Card Price
**Using Fluid Typography (clamp):**
```
text-fluid-sm = clamp(0.75rem, 0.3vw + 0.7rem, 0.9rem)
Min: 12px, Preferred: 0.3vw + 11.2px, Max: 14.4px
```

**Location:** `components/nft-card.tsx` line 195, `app/globals.css` line 418

#### NFT Card Buttons (Buy/Sold)
**Using Fluid Typography (clamp):**
```
text-[clamp(0.7rem,0.5vw,0.85rem)]
Min: 11.2px, Preferred: 0.5vw, Max: 13.6px
```

**Location:** `components/nft-card.tsx` lines 201, 220

**Padding:**
| Breakpoint | Horizontal | Vertical | Class |
|------------|-----------|----------|-------|
| **Default** | `8px` | `6px` | `px-2 py-1.5` |
| **sm** | `12px` | `6px` | `sm:px-3 py-1.5` |

### Sidebar Elements

#### Sidebar Section Headers
| Breakpoint | Size | Class | Pixels |
|------------|------|-------|--------|
| **Default** | `text-sm` | `text-sm` | 14px |
| **sm** | `text-base` | `sm:text-base` | 16px |
| **md** | `text-base` | (inherits) | 16px |

**Location:** `components/nft-sidebar.tsx` line 198

#### Sidebar Filter Labels
| Breakpoint | Size | Class | Pixels |
|------------|------|-------|--------|
| **Default** | `text-xs` | `text-xs` | 12px |
| **sm** | `text-sm` | `sm:text-sm` | 14px |
| **md** | `text-sm` | (inherits) | 14px |

**Location:** `components/nft-sidebar.tsx` line 565

#### Sidebar Search Input
| Breakpoint | Size | Class | Pixels |
|------------|------|-------|--------|
| **Default** | `text-xs` | `text-xs` | 12px |
| **sm** | `text-sm` | `sm:text-sm` | 14px |
| **md** | `text-sm` | (inherits) | 14px |

**Location:** `components/nft-sidebar.tsx` line 878

#### Sidebar Sort Labels
| Breakpoint | Size | Class | Pixels |
|------------|------|-------|--------|
| **Default** | `text-xs` | `text-xs` | 12px |
| **sm** | `text-sm` | `sm:text-sm` | 14px |

**Location:** `components/nft-sidebar.tsx` line 229

### Dropdowns & Selects

#### Dropdown Labels ("Sort by:", "Show:")
| Breakpoint | Size | Class | Pixels |
|------------|------|-------|--------|
| **Default** | `text-sm` | `text-sm` | 14px |
| **sm** | `text-sm` | (inherits) | 14px |
| **md** | `text-sm` | (inherits) | 14px |

**Location:** `components/nft-grid.tsx` line 857

#### Dropdown Options
| Breakpoint | Size | Class | Pixels |
|------------|------|-------|--------|
| **Default** | `text-sm` | `text-sm` | 14px |
| **sm** | `text-sm` | (inherits) | 14px |
| **md** | `text-sm` | (inherits) | 14px |

**Location:** `components/ui/select.tsx` (inherited from SelectTrigger)

#### Dropdown Selected Value
| Breakpoint | Size | Class | Pixels |
|------------|------|-------|--------|
| **Default** | `text-sm` | `text-sm` | 14px |
| **sm** | `text-sm` | (inherits) | 14px |
| **md** | `text-sm` | (inherits) | 14px |

**Location:** `components/nft-grid.tsx` line 862

### Table View (Compact Mode)

#### Table Headers
| Breakpoint | Size | Class | Pixels |
|------------|------|-------|--------|
| **Default** | `text-xs` | `text-xs` | 12px |
| **sm** | `text-sm` | `sm:text-sm` | 14px |
| **md** | `text-sm` | (inherits) | 14px |

**Location:** `components/nft-grid.tsx` line 943

#### Table Cell Text
| Breakpoint | Size | Class | Pixels |
|------------|------|-------|--------|
| **Default** | `text-xs` | `text-xs` | 12px |
| **sm** | `text-xs` | (inherits) | 12px |
| **md** | `text-xs` | (inherits) | 12px |

**Location:** `components/nft-grid.tsx` line 1026

---

## 📏 Spacing & Sizing

### Container Padding

| Breakpoint | Horizontal Padding | Vertical Padding | Class |
|------------|-------------------|------------------|-------|
| **Default** | `16px` | `24px` | `px-4 py-6` |
| **sm** | `24px` | `32px` | `sm:px-6 sm:py-8` |
| **md** | `32px` | `32px` | `md:px-8 md:py-8` |
| **lg** | `48px` | `40px` | `lg:px-12 lg:py-10` |
| **xl** | `64px` | `40px` | `xl:px-16 xl:py-10` |
| **2xl** | `80px` | `40px` | `2xl:px-20 2xl:py-10` |

**Location:** `app/nfts/page.tsx` line 127

### Gaps Between Elements

| Breakpoint | Gap Size | Class |
|------------|----------|-------|
| **Default** | `8px` | `gap-2` |
| **sm** | `16px` | `sm:gap-4` |
| **md** | `24px` | `md:gap-6` |

**Location:** `app/nfts/page.tsx` line 132 (tagline)

### Grid Gaps (NFT Grid)

#### Grid Large View
| Breakpoint | Horizontal Gap | Vertical Gap | Class |
|------------|---------------|--------------|-------|
| **Default** | `16px` | `24px` | `gap-x-4 gap-y-6` |
| **sm** | `16px` | `24px` | (inherits) |
| **md** | `16px` | `24px` | (inherits) |
| **lg** | `16px` | `24px` | (inherits) |

**Location:** `components/nft-grid.tsx` line 903

#### Grid Medium View
| Breakpoint | Horizontal Gap | Vertical Gap | Class |
|------------|---------------|--------------|-------|
| **Default** | `12px` | `20px` | `gap-x-3 gap-y-5` |
| **sm** | `12px` | `20px` | (inherits) |
| **md** | `12px` | `20px` | (inherits) |

**Location:** `components/nft-grid.tsx` line 904

#### Grid Small View
| Breakpoint | Horizontal Gap | Vertical Gap | Class |
|------------|---------------|--------------|-------|
| **Default** | `8px` | `16px` | `gap-x-2 gap-y-4` |
| **sm** | `8px` | `16px` | (inherits) |
| **md** | `8px` | `16px` | (inherits) |

**Location:** `components/nft-grid.tsx` line 905

---

## 🎨 Component-Specific Sizing

### NFT Cards

#### Card Width/Height
| Breakpoint | Width | Height | Aspect Ratio | Notes |
|------------|-------|--------|--------------|-------|
| **Default** | `100%` | `auto` | `0.9/1` (large), `0.85/1` (medium), `1/1` (small) | Responsive to grid |
| **sm** | `100%` | `auto` | Same | |
| **md** | `100%` | `auto` | Same | |
| **lg** | `100%` | `auto` | Same | |

**Location:** `components/nft-card.tsx` lines 133, 235

#### Card Padding
| Breakpoint | Padding | Class |
|------------|---------|-------|
| **Default** | `8px` | `px-2 pt-2` (large view) |
| **sm** | `8px` | (inherits) |

#### Card Image Max Height
**Using Fluid Typography (clamp):**
```
clamp(200px, 38vw, 400px)
Min: 200px, Preferred: 38vw, Max: 400px
```

**Location:** `components/nft-card.tsx` line 133

### Dropdowns

#### Dropdown Width
| Breakpoint | Width | Class |
|------------|-------|-------|
| **Default** | `220px` | `w-[220px]` (Sort by) |
| **sm** | `220px` | (inherits) |
| **md** | `220px` | (inherits) |
| **lg** | `220px` | (inherits) |

**Location:** `components/nft-grid.tsx` line 862

| Breakpoint | Width | Class |
|------------|-------|-------|
| **Default** | `150px` | `w-[150px]` (Show) |
| **sm** | `150px` | (inherits) |
| **md** | `150px` | (inherits) |
| **lg** | `150px` | (inherits) |

**Location:** `components/nft-grid.tsx` line 881

#### Dropdown Height
| Breakpoint | Height | Class |
|------------|--------|-------|
| **Default** | `auto` | (default Select height) |
| **sm** | `auto` | (inherits) |
| **md** | `auto` | (inherits) |

### Sidebar

#### Sidebar Width
| Breakpoint | Width | Class |
|------------|-------|-------|
| **Default** | `100%` | `w-full` (hidden on mobile) |
| **sm** | `100%` | (inherits) |
| **md** | `100%` | (inherits) |
| **lg** | `100%` | (inherits) |
| **xl** | `336px` | `xl:w-[21rem]` |
| **2xl** | `448px` | `2xl:w-[28rem]` |

**Location:** `app/nfts/page.tsx` line 145

---

## 📐 Grid Layouts

### NFT Grid - Columns

#### Grid Large View
| Breakpoint | Columns | Class | Notes |
|------------|---------|-------|-------|
| **Default** | `1` | `grid-cols-1` | Mobile - single column |
| **sm** | `2` | `sm:grid-cols-2` | Large phones - 2 columns |
| **md** | `2` | (inherits) | Tablets - 2 columns |
| **lg** | `3` | `lg:grid-cols-3` | Small laptops - 3 columns |
| **xl** | `4` | `xl:grid-cols-4` | Desktops - 4 columns |
| **2xl** | `5` | `2xl:grid-cols-5` | Large desktops - 5 columns |

**Location:** `components/nft-grid.tsx` line 903

#### Grid Medium View
| Breakpoint | Columns | Class | Notes |
|------------|---------|-------|-------|
| **Default** | `2` | `grid-cols-2` | Mobile - 2 columns |
| **sm** | `2` | `sm:grid-cols-2` | Large phones - 2 columns |
| **md** | `3` | `md:grid-cols-3` | Tablets - 3 columns |
| **lg** | `4` | `lg:grid-cols-4` | Small laptops - 4 columns |
| **xl** | `5` | `xl:grid-cols-5` | Desktops - 5 columns |
| **2xl** | `6` | `2xl:grid-cols-6` | Large desktops - 6 columns |

**Location:** `components/nft-grid.tsx` line 904

#### Grid Small View
| Breakpoint | Columns | Class | Notes |
|------------|---------|-------|-------|
| **Default** | `2` | `grid-cols-2` | Mobile - 2 columns |
| **sm** | `3` | `sm:grid-cols-3` | Large phones - 3 columns |
| **md** | `4` | `md:grid-cols-4` | Tablets - 4 columns |
| **lg** | `5` | `lg:grid-cols-5` | Small laptops - 5 columns |
| **xl** | `6` | `xl:grid-cols-6` | Desktops - 6 columns |
| **2xl** | `8` | `2xl:grid-cols-8` | Large desktops - 8 columns |

**Location:** `components/nft-grid.tsx` line 905

---

## 🎯 Current Issues Identified

### Problems with Current Implementation

1. **Mixed Approach Causes Inconsistency**
   - Some elements use breakpoint-based sizing (headings, navigation)
   - Other elements use fluid clamp() (NFT cards, buttons)
   - No clear pattern for when to use which approach

2. **Text Sizing Issues**
   - Text too large/small at certain breakpoints
   - Text getting cut off in dropdowns (partially fixed with width increase)
   - Inconsistent scaling between breakpoints

3. **Responsive Behavior**
   - Some elements jump at breakpoints (discrete)
   - Other elements scale smoothly (fluid)
   - Creates visual inconsistency

4. **Grid Spacing**
   - Recently updated to use separate gap-x and gap-y
   - Vertical spacing improved but may need further adjustment

---

## 📊 Summary Statistics

### Text Size Ranges
- **Smallest text:** 11.2px (NFT card buttons with clamp)
- **Largest text:** 96px (H1 at xl breakpoint)
- **Most common mobile size:** 14px (text-sm)
- **Most common desktop size:** 16px (text-base)

### Breakpoint Usage Frequency
- **sm (640px):** Most commonly used breakpoint
- **md (768px):** Frequently used for tablet layouts
- **lg (1024px):** Common for desktop layouts
- **xl (1280px):** Used for sidebar visibility and main desktop
- **2xl (1536px):** Used for sidebar width and grid expansion

### Approach Distribution
- **Breakpoint-based:** ~60% of text elements
- **Fluid clamp():** ~40% of text elements (mostly NFT cards)
- **Fixed sizes:** ~10% (some labels, metadata)

---

## ✅ Recommendations

1. **Standardize to ONE approach** - Choose either breakpoint-based OR clamp() for consistency
2. **Document decision** - Update this file once approach is chosen
3. **Apply consistently** - Update all components to use chosen approach
4. **Test at all breakpoints** - Verify text sizes work well at each breakpoint
5. **Fix text cutoff issues** - Ensure all text fits properly at all sizes

---

**Last Updated:** December 2024  
**Status:** Current Implementation Documentation

