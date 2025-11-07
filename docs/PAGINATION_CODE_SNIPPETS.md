# Pagination Code Snippets - Quick Reference

Copy-paste ready code blocks for implementing pagination.

---

## 1. State Variables

```tsx
const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage, setItemsPerPage] = useState(12);
```

---

## 2. Reset Page When Filters Change (CRITICAL)

```tsx
// Reset to page 1 when filters, search, or items per page change
useEffect(() => {
  setCurrentPage(1);
}, [itemsPerPage, searchTerm, selectedFilters]);
```

---

## 3. Filter, Sort, and Paginate Logic

```tsx
// Step 1: Filter
const filteredNFTs = nfts.filter(nft => {
  // Your filter logic here
  return matchesSearch && matchesView && matchesRarity;
});

// Step 2: Sort
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
    default:
      return 0;
  }
});

// Step 3: Paginate
const startIndex = (currentPage - 1) * itemsPerPage;
const endIndex = itemsPerPage === 100000 ? sortedNFTs.length : startIndex + itemsPerPage;
const paginatedNFTs = sortedNFTs.slice(startIndex, endIndex);

// Step 4: Calculate total pages
const totalFilteredPages = itemsPerPage === 100000
  ? 1
  : Math.ceil(sortedNFTs.length / itemsPerPage) || 1;
```

---

## 4. Auto-Correct Invalid Pages

```tsx
// Reset to page 1 if current page exceeds total pages
useEffect(() => {
  if (currentPage > totalFilteredPages) {
    setCurrentPage(1);
  }
}, [currentPage, totalFilteredPages]);
```

---

## 5. Items Per Page Selector

```tsx
<Select
  value={itemsPerPage.toString()}
  onValueChange={(val) => {
    const newValue = Number.parseInt(val);
    setItemsPerPage(newValue);
  }}
>
  <SelectTrigger className="w-[110px] h-9 text-sm rounded">
    <SelectValue placeholder="12 items" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="12">12 items</SelectItem>
    <SelectItem value="25">25 items</SelectItem>
    <SelectItem value="50">50 items</SelectItem>
    <SelectItem value="100">100 items</SelectItem>
    <SelectItem value="250">250 items</SelectItem>
  </SelectContent>
</Select>
```

---

## 6. Render Grid with Paginated Data

```tsx
{paginatedNFTs.length > 0 ? (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    {paginatedNFTs.map((nft) => (
      <NFTCard key={nft.id} {...nftProps} />
    ))}
  </div>
) : (
  <div className="text-center py-12">
    <div className="text-lg mb-2">No NFTs found</div>
    <div className="text-neutral-500 text-sm">
      {searchTerm
        ? `No NFTs match "${searchTerm}"`
        : "Try adjusting your filters"}
    </div>
  </div>
)}
```

---

## 7. Render Pagination Component

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

---

## 8. Complete Pagination Component

See `components/ui/pagination.tsx` for the full component code, or copy from `PAGINATION_IMPLEMENTATION_GUIDE.md` section 1.

---

## Quick Checklist

- [ ] State: `currentPage` and `itemsPerPage`
- [ ] Reset effect: `useEffect(() => setCurrentPage(1), [itemsPerPage, searchTerm, selectedFilters])`
- [ ] Filter → Sort → Paginate (in that order)
- [ ] Calculate `totalFilteredPages` from `sortedNFTs.length`
- [ ] Auto-correct invalid pages
- [ ] Use `key` prop on Pagination component
- [ ] Render `paginatedNFTs` in grid, not `filteredNFTs` or `sortedNFTs`

---

## The Golden Rule

**Always filter first, paginate last. Calculate total pages from filtered data.**

