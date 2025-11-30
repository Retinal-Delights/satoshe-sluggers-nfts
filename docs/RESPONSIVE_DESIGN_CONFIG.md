# 📱 Responsive Design Configuration

**Single source of truth for all responsive breakpoints and sizing**

---

## 🎯 Design Philosophy

**Choose ONE approach for consistency:**
- [ ] **Option A: Breakpoint-based (discrete jumps)** - Fixed sizes at specific breakpoints
- [ ] **Option B: Fluid typography (clamp)** - Smooth scaling between min/max
- [ ] **Option C: Hybrid** - Breakpoints for layout, clamp for text

**Current Choice:** _[Fill in your preference]_

---

## 📐 Breakpoints

Define your breakpoint system here. These will be used consistently across the entire site.

### Standard Breakpoints

| Breakpoint | Min Width | Device Type | Usage |
|------------|-----------|-------------|-------|
| **xs** | `475px` | Small phones | _[Define usage]_ |
| **sm** | `640px` | Large phones | _[Define usage]_ |
| **md** | `768px` | Tablets | _[Define usage]_ |
| **lg** | `1024px` | Small laptops | _[Define usage]_ |
| **xl** | `1280px` | Desktops | _[Define usage]_ |
| **2xl** | `1536px` | Large desktops | _[Define usage]_ |
| **3xl** | `1920px` | Extra large | _[Define usage]_ |
| **4xl** | `2560px` | Ultra wide | _[Define usage]_ |

### Custom Breakpoints (if needed)

| Name | Min Width | Purpose |
|------|-----------|---------|
| _[Add custom]_ | `_px` | _[Purpose]_ |

---

## 📝 Typography - Text Sizes by Breakpoint

Define text sizes for each element at each breakpoint. Use ONE consistent approach (breakpoints OR clamp).

### Approach: _[Breakpoint-based / Fluid clamp / Hybrid]_

### Headings

#### H1 - Main Page Titles
| Breakpoint | Size | Class | Notes |
|------------|------|-------|-------|
| **Default (mobile)** | `_px` | `text-_` | _[e.g., 24px]_ |
| **sm (640px+)** | `_px` | `sm:text-_` | _[e.g., 32px]_ |
| **md (768px+)** | `_px` | `md:text-_` | _[e.g., 40px]_ |
| **lg (1024px+)** | `_px` | `lg:text-_` | _[e.g., 48px]_ |
| **xl (1280px+)** | `_px` | `xl:text-_` | _[e.g., 56px]_ |
| **2xl (1536px+)** | `_px` | `2xl:text-_` | _[e.g., 64px]_ |

**OR if using clamp:**
```
clamp([min]px, [preferred], [max]px)
Example: clamp(24px, 4vw + 8px, 64px)
```

#### H2 - Section Headers
| Breakpoint | Size | Class |
|------------|------|-------|
| **Default**| `_px` | `text-_` |
| **sm**     | `_px` | `sm:text-_` |
| **md** | `_px` | `md:text-_` |
| **lg** | `_px` | `lg:text-_` |
| **xl** | `_px` | `xl:text-_` |

#### H3 - Subsection Headers
| Breakpoint | Size | Class |
|------------|------|-------|
| **Default** | `_px` | `text-_` |
| **sm** | `_px` | `sm:text-_` |
| **md** | `_px` | `md:text-_` |
| **lg** | `_px` | `lg:text-_` |

### Body Text

#### Primary Body Text
| Breakpoint | Size | Class |
|------------|------|-------|
| **Default** | `_px` | `text-_` |
| **sm** | `_px` | `sm:text-_` |
| **md** | `_px` | `md:text-_` |
| **lg** | `_px` | `lg:text-_` |

#### Secondary Body Text / Descriptions
| Breakpoint | Size | Class |
|------------|------|-------|
| **Default** | `_px` | `text-_` |
| **sm** | `_px` | `sm:text-_` |
| **md** | `_px` | `md:text-_` |

### UI Elements

#### Navigation Links
| Breakpoint | Size | Class |
|------------|------|-------|
| **Default** | `_px` | `text-_` |
| **sm** | `_px` | `sm:text-_` |
| **md** | `_px` | `md:text-_` |
| **lg** | `_px` | `lg:text-_` |

#### Buttons
| Breakpoint | Size | Class |
|------------|------|-------|
| **Default** | `_px` | `text-_` |
| **sm** | `_px` | `sm:text-_` |
| **md** | `_px` | `md:text-_` |

#### Form Inputs / Labels
| Breakpoint | Size | Class |
|------------|------|-------|
| **Default** | `_px` | `text-_` |
| **sm** | `_px` | `sm:text-_` |
| **md** | `_px` | `md:text-_` |

### NFT-Specific Elements

#### NFT Card Names
| Breakpoint | Size | Class |
|------------|------|-------|
| **Default** | `_px` | `text-_` |
| **sm** | `_px` | `sm:text-_` |
| **md** | `_px` | `md:text-_` |
| **lg** | `_px` | `lg:text-_` |

**OR if using clamp:**
```
clamp([min]px, [preferred], [max]px)
```

#### NFT Card Stats (Rank, Rarity, Tier)
| Breakpoint | Size | Class |
|------------|------|-------|
| **Default** | `_px` | `text-_` |
| **sm** | `_px` | `sm:text-_` |
| **md** | `_px` | `md:text-_` |

#### NFT Card Price
| Breakpoint | Size | Class |
|------------|------|-------|
| **Default** | `_px` | `text-_` |
| **sm** | `_px` | `sm:text-_` |
| **md** | `_px` | `md:text-_` |

#### NFT Card Buttons (Buy/Sold)
| Breakpoint | Size | Class |
|------------|------|-------|
| **Default** | `_px` | `text-_` |
| **sm** | `_px` | `sm:text-_` |
| **md** | `_px` | `md:text-_` |

### Sidebar Elements

#### Sidebar Section Headers
| Breakpoint | Size | Class |
|------------|------|-------|
| **Default** | `_px` | `text-_` |
| **sm** | `_px` | `sm:text-_` |
| **md** | `_px` | `md:text-_` |

#### Sidebar Filter Labels
| Breakpoint | Size | Class |
|------------|------|-------|
| **Default** | `_px` | `text-_` |
| **sm** | `_px` | `sm:text-_` |
| **md** | `_px` | `md:text-_` |

#### Sidebar Search Input
| Breakpoint | Size | Class |
|------------|------|-------|
| **Default** | `_px` | `text-_` |
| **sm** | `_px` | `sm:text-_` |
| **md** | `_px` | `md:text-_` |

### Dropdowns & Selects

#### Dropdown Labels ("Sort by:", "Show:")
| Breakpoint | Size | Class |
|------------|------|-------|
| **Default** | `_px` | `text-_` |
| **sm** | `_px` | `sm:text-_` |
| **md** | `_px` | `md:text-_` |

#### Dropdown Options
| Breakpoint | Size | Class |
|------------|------|-------|
| **Default** | `_px` | `text-_` |
| **sm** | `_px` | `sm:text-_` |
| **md** | `_px` | `md:text-_` |

#### Dropdown Selected Value
| Breakpoint | Size | Class |
|------------|------|-------|
| **Default** | `_px` | `text-_` |
| **sm** | `_px` | `sm:text-_` |
| **md** | `_px` | `md:text-_` |

### Table View (Compact Mode)

#### Table Headers
| Breakpoint | Size | Class |
|------------|------|-------|
| **Default** | `_px` | `text-_` |
| **sm** | `_px` | `sm:text-_` |
| **md** | `_px` | `md:text-_` |

#### Table Cell Text
| Breakpoint | Size | Class |
|------------|------|-------|
| **Default** | `_px` | `text-_` |
| **sm** | `_px` | `sm:text-_` |
| **md** | `_px` | `md:text-_` |

---

## 📏 Spacing & Sizing

### Container Padding

| Breakpoint | Horizontal Padding | Vertical Padding | Class |
|------------|-------------------|------------------|-------|
| **Default** | `_px` | `_px` | `px-_ py-_` |
| **sm** | `_px` | `_px` | `sm:px-_ sm:py-_` |
| **md** | `_px` | `_px` | `md:px-_ md:py-_` |
| **lg** | `_px` | `_px` | `lg:px-_ lg:py-_` |
| **xl** | `_px` | `_px` | `xl:px-_ xl:py-_` |

### Gaps Between Elements

| Breakpoint | Gap Size | Class |
|------------|----------|-------|
| **Default** | `_px` | `gap-_` |
| **sm** | `_px` | `sm:gap-_` |
| **md** | `_px` | `md:gap-_` |
| **lg** | `_px` | `lg:gap-_` |

### Grid Gaps (NFT Grid)

| Breakpoint | Gap Size | Class |
|------------|----------|-------|
| **Default** | `_px` | `gap-_` |
| **sm** | `_px` | `sm:gap-_` |
| **md** | `_px` | `md:gap-_` |
| **lg** | `_px` | `lg:gap-_` |

---

## 🎨 Component-Specific Sizing

### NFT Cards

#### Card Width/Height
| Breakpoint | Width | Height | Aspect Ratio | Notes |
|------------|-------|--------|--------------|-------|
| **Default** | `_px` or `_%` | `_px` or `auto` | `_/_` | _[e.g., 100% width, auto height]_ |
| **sm** | `_px` or `_%` | `_px` or `auto` | `_/_` | |
| **md** | `_px` or `_%` | `_px` or `auto` | `_/_` | |
| **lg** | `_px` or `_%` | `_px` or `auto` | `_/_` | |

#### Card Padding
| Breakpoint | Padding | Class |
|------------|---------|-------|
| **Default** | `_px` | `p-_` |
| **sm** | `_px` | `sm:p-_` |
| **md** | `_px` | `md:p-_` |

#### Card Image Max Height
| Breakpoint | Max Height | Class |
|------------|-----------|-------|
| **Default** | `_px` | `max-h-[_px]` |
| **sm** | `_px` | `sm:max-h-[_px]` |
| **md** | `_px` | `md:max-h-[_px]` |

**OR if using clamp:**
```
clamp([min]px, [preferred], [max]px)
```

### Dropdowns

#### Dropdown Width
| Breakpoint | Width | Class |
|------------|-------|-------|
| **Default** | `_px` | `w-[_px]` |
| **sm** | `_px` | `sm:w-[_px]` |
| **md** | `_px` | `md:w-[_px]` |
| **lg** | `_px` | `lg:w-[_px]` |

#### Dropdown Height
| Breakpoint | Height | Class |
|------------|--------|-------|
| **Default** | `_px` | `h-[_px]` |
| **sm** | `_px` | `sm:h-[_px]` |
| **md** | `_px` | `md:h-[_px]` |

### Sidebar

#### Sidebar Width
| Breakpoint | Width | Class |
|------------|-------|-------|
| **Default** | `_px` or `_%` | `w-[_px]` or `w-_` |
| **sm** | `_px` or `_%` | `sm:w-[_px]` or `sm:w-_` |
| **md** | `_px` or `_%` | `md:w-[_px]` or `md:w-_` |
| **lg** | `_px` or `_%` | `lg:w-[_px]` or `lg:w-_` |
| **xl** | `_px` or `_%` | `xl:w-[_px]` or `xl:w-_` |

---

## 📐 Grid Layouts

### NFT Grid - Columns

| Breakpoint | Columns | Class | Notes |
|------------|---------|-------|-------|
| **Default** | `_` | `grid-cols-_` | _[e.g., 1 column on mobile]_ |
| **sm** | `_` | `sm:grid-cols-_` | _[e.g., 2 columns]_ |
| **md** | `_` | `md:grid-cols-_` | _[e.g., 3 columns]_ |
| **lg** | `_` | `lg:grid-cols-_` | _[e.g., 4 columns]_ |
| **xl** | `_` | `xl:grid-cols-_` | _[e.g., 5 columns]_ |
| **2xl** | `_` | `2xl:grid-cols-_` | _[e.g., 6 columns]_ |

---

## 🎯 Specific Issues to Address

### Current Problems

1. **Text too large/small at certain breakpoints**
   - Element: _[e.g., NFT card names]_
   - Breakpoint: _[e.g., md (768px)]_
   - Current size: `_px`
   - Desired size: `_px`

2. **Text getting cut off**
   - Element: _[e.g., Dropdown options]_
   - Breakpoint: _[e.g., sm (640px)]_
   - Current issue: _[Describe]_
   - Solution: _[Desired fix]_

3. **Layout breaking**
   - Element: _[e.g., NFT grid]_
   - Breakpoint: _[e.g., lg (1024px)]_
   - Current issue: _[Describe]_
   - Solution: _[Desired fix]_

---

## ✅ Implementation Checklist

Once you've filled out this file:

- [ ] Review all breakpoints and confirm they match your needs
- [ ] Choose ONE approach (breakpoints OR clamp) for consistency
- [ ] Fill in all text sizes for each element at each breakpoint
- [ ] Document spacing and sizing requirements
- [ ] List all current issues that need fixing
- [ ] Share this file for implementation

---

## 📝 Notes

_Add any additional notes, constraints, or special considerations here:_

_[Your notes here]_

---

**Last Updated:** _[Date]_  
**Status:** _[Draft / Ready for Implementation]_

