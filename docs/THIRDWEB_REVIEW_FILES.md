# Files to Share with Thirdweb AI for Review

This document lists all critical files that handle dynamic content, RPC calls, filtering, purchase transactions, and NFT data management.

## 📋 Core NFT Data Loading

### Static Metadata Loading
- **`lib/simple-data-service.ts`** - Main data service for loading NFT metadata
  - `loadAllNFTs()` - Loads all NFT metadata from static JSON files
  - `getNFTByTokenId()` - Gets specific NFT by token ID
  - `searchNFTs()` - Search functionality
  - `filterNFTs()` - Filter by traits
  - `getTraitCounts()` - Calculate trait counts for sidebar

### Data Sources (Static JSON Files)
- `/public/data/combined_metadata.json` - All NFT metadata
- `/public/data/urls/ipfs_urls.json` - IPFS URLs mapping
- `/public/data/pricing/token_pricing_mappings.json` - Pricing and listing IDs

---

## 🔍 NFT Grid & Filtering

### Main Grid Component
- **`components/nft-grid.tsx`** - Main NFT grid component
  - NFT data loading and processing
  - Filtering logic (search, traits, rarity, sale status)
  - Sorting logic
  - Pagination
  - Ownership verification for visible NFTs
  - Purchase event handling

### Sidebar Filtering
- **`components/nft-sidebar.tsx`** - Filter sidebar component
  - Search functionality (exact/contains modes)
  - Trait filtering (rarity, background, skin tone, shirt, hair, headwear, eyewear)
  - Complex filtering for subcategories (hair, headwear)
  - Trait count display

### Main Page
- **`app/nfts/page.tsx`** - NFTs page that coordinates grid and sidebar

---

## 💰 Purchase Transactions

### Purchase Button Component
- **`app/nft/[id]/page.tsx`** - NFT detail page
  - `BuyDirectListingButton` - Thirdweb purchase component
  - `handleTransactionSuccess()` - Post-purchase handling
  - `handleTransactionError()` - Error handling
  - Purchase event broadcasting (`nftPurchased` custom event)
  - Ownership verification after purchase

---

## 🔗 RPC Calls & Rate Limiting

### Rate Limiter
- **`lib/rpc-rate-limiter.ts`** - RPC rate limiting utility
  - `execute()` - Single RPC call with rate limiting
  - `executeBatch()` - Batch RPC calls with rate limiting
  - Limits to 200 calls/second
  - Queue-based processing

### Thirdweb Client Setup
- **`lib/thirdweb.ts`** - Thirdweb client configuration
  - Client initialization
  - Uses `NEXT_PUBLIC_THIRDWEB_CLIENT_ID`

### Contracts
- **`lib/contracts.ts`** - Contract setup
  - NFT collection contract
  - Marketplace contract

### Constants
- **`lib/constants.ts`** - Contract addresses and constants
  - `CONTRACT_ADDRESS` - NFT collection address
  - `MARKETPLACE_ADDRESS` - Marketplace contract address

---

## 🔐 Ownership Verification

### API Routes
- **`app/api/nft/ownership/route.ts`** - Batch ownership API
  - POST endpoint for batch ownership checks
  - Uses Thirdweb Insight API (preferred)
  - Falls back to RPC calls with rate limiting
  - Batch size: 200 tokens max

- **`app/api/nft/aggregate-counts/route.ts`** - Aggregate live/sold counts
  - Returns total live and sold NFT counts
  - Uses Insight API when available

### Ownership Hook
- **`hooks/useOnChainOwnership.ts`** - Ownership hook for counts
  - Fetches aggregate live/sold counts
  - Listens for purchase events
  - Caches results in localStorage

### Grid Ownership Verification
- **`components/nft-grid.tsx`** (lines 845-930)
  - Verifies ownership of visible NFTs
  - Uses batch API endpoint (`/api/nft/ownership`)
  - Falls back to individual RPC calls
  - Re-verifies every 30 seconds or on page change

### Detail Page Ownership
- **`app/nft/[id]/page.tsx`** (lines 203-241)
  - Fetches owner on load
  - Re-checks every 60 seconds (reduced from 10s to prevent flashing)
  - Post-purchase verification after 5 seconds

### My NFTs Page
- **`app/my-nfts/page.tsx`** - User's owned NFTs
  - Uses Thirdweb Insight API for batch ownership checks
  - Falls back to RPC calls with rate limiting
  - Filters NFTs by collection contract address

---

## 📊 Pricing & Listing Data

### Pricing Mappings
- **`components/nft-grid.tsx`** (lines 238-279)
  - Loads pricing mappings from `/data/pricing/token_pricing_mappings.json`
  - Maps token IDs to listing IDs and prices
  - Used to determine if NFT is for sale and display price

### Detail Page Pricing
- **`app/nft/[id]/page.tsx`** (lines 159-201)
  - Loads pricing data for specific NFT
  - Determines listing ID for purchase button

---

## 🎯 Key Integration Points with Thirdweb

### 1. Purchase Flow
```typescript
// Location: app/nft/[id]/page.tsx
<BuyDirectListingButton
  contractAddress={process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS!}
  client={client}
  chain={base}
  listingId={BigInt(listingId)}
  quantity={1n}
  onTransactionSent={handleTransactionPending}
  onTransactionConfirmed={handleTransactionSuccess}
  onError={handleTransactionError}
/>
```

### 2. Ownership Checks
```typescript
// Location: app/api/nft/ownership/route.ts
const owner = await readContract({
  contract,
  method: "function ownerOf(uint256 tokenId) view returns (address)",
  params: [BigInt(tokenId)],
});
```

### 3. Rate Limiting
```typescript
// Location: lib/rpc-rate-limiter.ts
const owner = await rpcRateLimiter.execute(async () => {
  return await readContract({...});
});
```

---

## 🔄 Purchase Event System

### Event Broadcasting
- **`app/nft/[id]/page.tsx`** (line 368)
  - Dispatches `nftPurchased` custom event after successful purchase
  - Event includes: `{ tokenId, priceEth }`

### Event Listeners
- **`components/nft-grid.tsx`** (lines 282-357)
  - Listens for `nftPurchased` events
  - Updates NFT state immediately
  - Triggers on-chain verification

- **`hooks/useOnChainOwnership.ts`** (lines 111-123)
  - Listens for `nftPurchased` events
  - Updates live/sold counts immediately

- **`app/my-nfts/page.tsx`** (lines 207-230)
  - Listens for `nftPurchased` events
  - Adds newly purchased NFT to owned list

---

## 📝 Environment Variables Required

```env
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id
NEXT_PUBLIC_NFT_COLLECTION_ADDRESS=0x...
NEXT_PUBLIC_MARKETPLACE_ADDRESS=0x...
NEXT_PUBLIC_INSIGHT_CLIENT_ID=your_insight_client_id (optional)
```

---

## 🎨 Static vs Dynamic Data

### Static (No RPC Calls)
- ✅ NFT metadata (name, attributes, rarity, images)
- ✅ Filtering and sorting
- ✅ Search functionality
- ✅ Trait counts
- ✅ Pricing mappings (from JSON)

### Dynamic (Uses RPC/API)
- ⚠️ Ownership verification (`ownerOf()`)
- ⚠️ Sold status (determined by ownership ≠ marketplace)
- ⚠️ Live/sold counts (aggregate ownership check)
- ⚠️ Purchase transactions (Thirdweb SDK)

---

## 🚨 Critical Areas to Review

1. **Rate Limiting** - Ensure 200 calls/second limit is respected
2. **Ownership Verification Logic** - Correctly identifies sold vs live NFTs
3. **Purchase Flow** - Transaction handling and state updates
4. **Batch Operations** - Insight API usage vs RPC fallback
5. **Event System** - `nftPurchased` event propagation
6. **Filtering Logic** - Complex trait filtering (hair, headwear subcategories)
7. **State Management** - Purchase state updates across components

---

## 📦 Summary of Critical Files

### Must Review (Core Functionality)
1. `components/nft-grid.tsx` - Grid, filtering, ownership verification
2. `components/nft-sidebar.tsx` - Filtering logic
3. `app/nft/[id]/page.tsx` - Purchase transactions, ownership
4. `lib/simple-data-service.ts` - Data loading
5. `lib/rpc-rate-limiter.ts` - Rate limiting
6. `app/api/nft/ownership/route.ts` - Batch ownership API
7. `hooks/useOnChainOwnership.ts` - Ownership counts

### Supporting Files (Good to Review)
8. `lib/thirdweb.ts` - Client setup
9. `lib/contracts.ts` - Contract configuration
10. `lib/constants.ts` - Addresses
11. `app/nfts/page.tsx` - Page coordination
12. `app/my-nfts/page.tsx` - User's NFTs
13. `app/api/nft/aggregate-counts/route.ts` - Aggregate counts

### Data Files (Reference)
14. `/public/data/combined_metadata.json` - All metadata
15. `/public/data/pricing/token_pricing_mappings.json` - Pricing data

---

## 🔍 Review Checklist for Thirdweb AI

- [ ] Rate limiting properly implemented (200 calls/second)
- [ ] Ownership verification logic correct (marketplace address comparison)
- [ ] Purchase flow uses correct Thirdweb SDK methods
- [ ] Batch operations use Insight API when available
- [ ] RPC fallback properly rate-limited
- [ ] Purchase events propagate correctly
- [ ] Filtering logic handles all trait types correctly
- [ ] State updates after purchase are consistent
- [ ] No unnecessary RPC calls for static data
- [ ] Error handling for failed RPC calls
- [ ] Token ID mapping (0-based vs 1-based) is consistent

