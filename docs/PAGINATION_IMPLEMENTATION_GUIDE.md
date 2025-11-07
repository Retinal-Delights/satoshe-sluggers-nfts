# Pagination Implementation Guide

This document explains how pagination works in this project and provides exact code references for implementing it correctly.

## Overview

The pagination system consists of:
1. **Pagination Component** (`components/ui/pagination.tsx`) - The UI component
2. **NFT Grid Integration** (`components/nft-grid.tsx`) - How pagination is used with filtered/sorted data

## Key Behaviors

1. **Resets to page 1** when filters, search, or items per page change
2. **Calculates total pages** based on filtered results (not all data)
3. **Handles "View All"** option (itemsPerPage = 100000) by showing 1 page
4. **Auto-corrects** if current page exceeds total pages after filtering
5. **Sticky positioning** at bottom of grid with proper styling

---

## 1. Pagination Component (`components/ui/pagination.tsx`)

### Complete Component Code:

```tsx
"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react"

// Page jump input component
function PageJumpInput({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  const [inputValue, setInputValue] = useState(currentPage.toString())

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const pageNumber = Number.parseInt(inputValue)
      if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
        onPageChange(pageNumber)
      } else {
        setInputValue(currentPage.toString())
      }
    }
  }

  const handleBlur = () => {
    const pageNumber = Number.parseInt(inputValue)
    if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
      onPageChange(pageNumber)
    } else {
      setInputValue(currentPage.toString())
    }
  }

  return (
    <input
      type="text"
      value={inputValue}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className="w-12 h-8 px-1 text-center bg-neutral-900 border border-brand-pink text-sm text-brand-pink focus:ring-2 focus:ring-brand-pink focus:outline-none"
      style={{ borderRadius: "4px" }}
      aria-label="Go to page"
    />
  )
}

interface NFTPaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
}

export default function NFTPagination({
  currentPage = 1,
  totalPages = 5,
  totalItems = 50,
  itemsPerPage = 12,
  onPageChange,
}: NFTPaginationProps) {
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = []
    const maxPagesToShow = 5

    if (totalPages <= maxPagesToShow) {
      // Show all pages if there are few
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always include first page
      pages.push(1)

      // Calculate start and end of page range
      let startPage = Math.max(2, currentPage - 1)
      let endPage = Math.min(totalPages - 1, currentPage + 1)

      // Adjust if at the beginning
      if (currentPage <= 3) {
        endPage = 4
      }

      // Adjust if at the end
      if (currentPage >= totalPages - 2) {
        startPage = totalPages - 3
      }

      // Add ellipsis after first page if needed
      if (startPage > 2) {
        pages.push("ellipsis-start")
      }

      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i)
      }

      // Add ellipsis before last page if needed
      if (endPage < totalPages - 1) {
        pages.push("ellipsis-end")
      }

      // Always include last page
      pages.push(totalPages)
    }

    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div className="sticky bottom-0 w-full bg-neutral-900 py-3 px-4 rounded-t-lg border-t border-neutral-800 z-30">
      <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            aria-label="First page"
            className="bg-neutral-800 border-neutral-700 hover:bg-neutral-700 h-8 w-8 p-0"
            style={{ borderRadius: "4px" }}
          >
            <ChevronFirst className="h-4 w-4" style={{ color: "#fffbeb" }} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page"
            className="bg-neutral-800 border-neutral-700 hover:bg-neutral-700 h-8 w-8 p-0"
            style={{ borderRadius: "4px" }}
          >
            <ChevronLeft className="h-4 w-4" style={{ color: "#fffbeb" }} />
          </Button>

          <div className="hidden sm:flex items-center gap-1">
            {pageNumbers.map((page, index) => {
              if (page === "ellipsis-start" || page === "ellipsis-end") {
                return (
                  <span key={`ellipsis-${index}`} className="px-1 text-neutral-400 text-sm">
                    ...
                  </span>
                )
              }

              return (
                <Button
                  key={`page-${page}`}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  className={
                    currentPage === page
                      ? "bg-brand-pink hover:bg-brand-pink-hover text-xs h-8 w-8 p-0"
                      : "bg-neutral-800 border-neutral-700 hover:bg-neutral-700 text-xs h-8 w-8 p-0"
                  }
                  style={{ borderRadius: "4px", color: "#fffbeb" }}
                  onClick={() => onPageChange(page as number)}
                >
                  {page}
                </Button>
              )
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next page"
            className="bg-neutral-800 border-neutral-700 hover:bg-neutral-700 h-8 w-8 p-0"
            style={{ borderRadius: "4px" }}
          >
            <ChevronRight className="h-4 w-4" style={{ color: "#fffbeb" }} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            aria-label="Last page"
            className="bg-neutral-800 border-neutral-700 hover:bg-neutral-700 h-8 w-8 p-0"
            style={{ borderRadius: "4px" }}
          >
            <ChevronLast className="h-4 w-4" style={{ color: "#fffbeb" }} />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-sm text-neutral-400">Go to page:</div>
          <PageJumpInput currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
        </div>
      </div>

      {/* Page count display */}
      <div className="text-center mt-2">
        <span className="text-xs text-neutral-500">
          Page {currentPage} of {totalPages}
        </span>
      </div>
    </div>
  )
}
```

### Key Features:
- **Smart page number display**: Shows up to 5 page numbers with ellipsis for large page counts
- **First/Last/Prev/Next buttons**: Full navigation controls
- **Page jump input**: Direct page navigation
- **Responsive**: Hides page numbers on mobile, shows on desktop
- **Sticky positioning**: Stays at bottom of viewport

---

## 2. NFT Grid Integration

### State Management:

```tsx
const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage, setItemsPerPage] = useState(12);
```

### Critical: Reset Page When Filters Change

```tsx
// Reset to page 1 when filters, search, or items per page change
useEffect(() => {
  setCurrentPage(1);
}, [itemsPerPage, searchTerm, selectedFilters]);
```

**This is CRITICAL** - Without this, users can be on page 5 of 10, apply a filter that only has 2 pages, and end up on an invalid page.

### Pagination Logic (After Filtering & Sorting):

```tsx
// 1. Filter the NFTs first
const filteredNFTs = nfts.filter(nft => {
  // ... all your filter logic ...
  return matchesSearch && matchesView && matchesRarity && /* etc */;
});

// 2. Sort the filtered results
const sortedNFTs = [...filteredNFTs].sort((a, b) => {
  switch (sortBy) {
    case "rank-asc":
      return Number(a.rank) - Number(b.rank);
    case "rank-desc":
      return Number(b.rank) - Number(a.rank);
    case "price-asc":
      return Number(a.priceWei) - Number(b.priceWei);
    case "price-desc":
      return Number(b.priceWei) - Number(a.priceWei);
    case "ending-soonest":
      return Number(a.auctionEnd ?? 0) - Number(b.auctionEnd ?? 0);
    default:
      return 0;
  }
});

// 3. Apply pagination to the sorted and filtered results
const startIndex = (currentPage - 1) * itemsPerPage;
const endIndex = itemsPerPage === 100000 ? sortedNFTs.length : startIndex + itemsPerPage;
const paginatedNFTs = sortedNFTs.slice(startIndex, endIndex);

// 4. Calculate total pages based on filtered results
const totalFilteredPages = itemsPerPage === 100000
  ? 1 // When "View All" is selected, always show 1 page
  : Math.ceil(sortedNFTs.length / itemsPerPage) || 1;
```

### Critical: Auto-Correct Invalid Pages

```tsx
// Reset to page 1 if current page exceeds total pages
useEffect(() => {
  if (currentPage > totalFilteredPages) {
    setCurrentPage(1);
  }
}, [currentPage, totalFilteredPages]);
```

This handles edge cases where:
- User is on page 5, applies filter that only has 2 pages
- User changes itemsPerPage from 12 to 50, reducing total pages

### Items Per Page Selector:

```tsx
<Select
  value={itemsPerPage.toString()}
  onValueChange={(val) => {
    const newValue = Number.parseInt(val);
    setItemsPerPage(newValue);
    // Page will reset to 1 via the useEffect above
  }}
>
  <SelectTrigger className="w-[110px] h-9 text-sm rounded" style={{ color: "#fffbeb" }}>
    <SelectValue placeholder="12 items" />
  </SelectTrigger>
  <SelectContent className="text-sm rounded">
    <SelectItem value="12">12 items</SelectItem>
    <SelectItem value="25">25 items</SelectItem>
    <SelectItem value="50">50 items</SelectItem>
    <SelectItem value="100">100 items</SelectItem>
    <SelectItem value="250">250 items</SelectItem>
  </SelectContent>
</Select>
```

### Rendering the Grid:

```tsx
{paginatedNFTs.length > 0 ? (
  <div className="mt-8 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 justify-between">
    {paginatedNFTs.map((nft) => (
      <NFTCard key={nft.id} {...nftProps} />
    ))}
  </div>
) : (
  <div className="text-center py-12">
    <div className="text-lg mb-2" style={{ color: "#fffbeb" }}>No NFTs found</div>
    <div className="text-neutral-500 text-sm">
      {searchTerm
        ? `No NFTs match "${searchTerm}"`
        : "Try adjusting your filters or check back later"}
    </div>
  </div>
)}
```

### Rendering the Pagination Component:

```tsx
<Pagination
  key={`pagination-${activeView}-${filteredNFTs.length}`}
  currentPage={currentPage}
  totalPages={totalFilteredPages}
  totalItems={filteredNFTs.length}
  itemsPerPage={itemsPerPage}
  onPageChange={setCurrentPage}
/>
```

**Important**: The `key` prop forces React to remount the component when filters change, ensuring clean state.

---

## 3. Order of Operations (CRITICAL)

The pagination logic MUST follow this exact order:

1. **Filter** → `filteredNFTs`
2. **Sort** → `sortedNFTs` 
3. **Paginate** → `paginatedNFTs`
4. **Calculate total pages** from `sortedNFTs.length` (NOT from original data)

**WRONG:**
```tsx
// ❌ Don't paginate before filtering!
const paginated = allNFTs.slice(start, end);
const filtered = paginated.filter(...);
```

**RIGHT:**
```tsx
// ✅ Filter first, then paginate
const filtered = allNFTs.filter(...);
const paginated = filtered.slice(start, end);
```

---

## 4. Common Issues & Solutions

### Issue: Pagination shows wrong total pages
**Cause**: Calculating `totalPages` from wrong data source
**Fix**: Always use `filteredNFTs.length` or `sortedNFTs.length`, never the original array

### Issue: User on page 5, applies filter, sees empty page
**Cause**: Missing `useEffect` to reset page when filters change
**Fix**: Add the reset useEffect:
```tsx
useEffect(() => {
  setCurrentPage(1);
}, [itemsPerPage, searchTerm, selectedFilters]);
```

### Issue: Page numbers don't update when changing items per page
**Cause**: `totalPages` not recalculating
**Fix**: Ensure `totalFilteredPages` is recalculated when `itemsPerPage` changes (it should be, since it's a derived value)

### Issue: Can't navigate to last page
**Cause**: Off-by-one error in `Math.ceil()` calculation
**Fix**: Use `Math.ceil(sortedNFTs.length / itemsPerPage) || 1` (the `|| 1` handles empty arrays)

---

## 5. Complete Integration Example

Here's the complete flow in `components/nft-grid.tsx`:

```tsx
export default function NFTGrid({ searchTerm, searchMode, selectedFilters, ... }) {
  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [nfts, setNfts] = useState<NFTGridItem[]>([]);
  
  // ... other state ...
  
  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage, searchTerm, selectedFilters]);
  
  // Filter, sort, and paginate
  const filteredNFTs = nfts.filter(nft => {
    // ... filter logic ...
  });
  
  const sortedNFTs = [...filteredNFTs].sort((a, b) => {
    // ... sort logic ...
  });
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = itemsPerPage === 100000 ? sortedNFTs.length : startIndex + itemsPerPage;
  const paginatedNFTs = sortedNFTs.slice(startIndex, endIndex);
  
  const totalFilteredPages = itemsPerPage === 100000
    ? 1
    : Math.ceil(sortedNFTs.length / itemsPerPage) || 1;
  
  // Auto-correct invalid pages
  useEffect(() => {
    if (currentPage > totalFilteredPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalFilteredPages]);
  
  return (
    <div>
      {/* Items per page selector */}
      <Select
        value={itemsPerPage.toString()}
        onValueChange={(val) => setItemsPerPage(Number.parseInt(val))}
      >
        {/* ... options ... */}
      </Select>
      
      {/* Grid */}
      <div className="grid ...">
        {paginatedNFTs.map((nft) => (
          <NFTCard key={nft.id} {...nft} />
        ))}
      </div>
      
      {/* Pagination */}
      <Pagination
        key={`pagination-${activeView}-${filteredNFTs.length}`}
        currentPage={currentPage}
        totalPages={totalFilteredPages}
        totalItems={filteredNFTs.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
```

---

## 6. Visual Styling Notes

The pagination component uses:
- **Sticky positioning**: `sticky bottom-0` keeps it visible at bottom
- **Dark theme**: `bg-neutral-900`, `bg-neutral-800` for buttons
- **Brand pink**: `bg-brand-pink` for active page button
- **Responsive**: Page numbers hidden on mobile (`hidden sm:flex`)
- **Z-index**: `z-30` to stay above content

---

## 7. Testing Checklist

When implementing, verify:
- [ ] Page resets to 1 when filters change
- [ ] Page resets to 1 when search term changes
- [ ] Page resets to 1 when items per page changes
- [ ] Total pages calculated from filtered results
- [ ] Can navigate to first page
- [ ] Can navigate to last page
- [ ] Can use page jump input
- [ ] Prev/Next buttons disabled at boundaries
- [ ] Empty state shows when no results
- [ ] Pagination hidden or shows "Page 1 of 1" when all items fit on one page

---

## Summary

The key to working pagination is:
1. **Filter first, paginate last**
2. **Reset page when filters change**
3. **Calculate total pages from filtered data**
4. **Auto-correct invalid page numbers**
5. **Use a key prop to force remount on filter changes**

This ensures pagination always reflects the current filtered dataset correctly.

