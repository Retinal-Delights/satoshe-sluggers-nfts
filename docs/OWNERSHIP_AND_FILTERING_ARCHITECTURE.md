# NFT Ownership & Filtering Architecture

## Current State

### ✅ Filtering/Sorting is 100% Static (No RPC Calls)

**All filtering, sorting, and search operations use static metadata:**
- Source: `/data/combined_metadata.json` (loaded once, cached)
- Traits (rarity, background, skin tone, shirt, hair, headwear, eyewear) are all from static metadata
- Search (name, token ID, NFT number) uses static metadata
- Sorting (rank, rarity, tier, price) uses static metadata
- Trait counts computed from static metadata

**No RPC calls are made for filtering/sorting.** ✅

### ❌ Ownership/Sold Status Uses Individual RPC Calls (The Problem)

**Only ownership checks use RPC calls:**
1. `useOnChainOwnership` hook - Checks all 7,777 NFTs individually to determine sold status
2. `NFTGrid` - Checks up to 25 NFTs per page on page changes
3. `MyNFTs` page - Checks all 7,777 NFTs to find user's owned NFTs
4. `NFTDetail` page - Checks single NFT ownership

**This is causing RPC limit issues** because:
- Each `ownerOf()` call = 1 RPC call
- Checking 7,777 NFTs = 7,777 individual RPC calls
- Even with rate limiting, this is inefficient

## Solution Options

### Option 1: Use Thirdweb Insight API (Recommended)

Thirdweb Insight provides batch NFT queries that can:
- Fetch ownership for multiple NFTs in a single API call
- Example: 1 API call for 200 NFTs instead of 200 individual RPC calls
- Includes ownership data, listing status, and metadata

**Implementation:**
```typescript
// lib/insight-service.ts
import { createThirdwebClient } from "thirdweb";

export async function getBatchOwnership(tokenIds: number[]) {
  // Use Insight API to batch check ownership
  // Returns ownership data for all tokenIds in one call
}
```

### Option 2: Backend Cache API (For Production)

Create a backend service that:
1. Periodically updates ownership/sold status (cron job every 5-10 minutes)
2. Stores results in database/cache
3. Frontend queries this cache instead of making RPC calls directly
4. Updates immediately when purchase events occur

**Benefits:**
- Frontend never makes bulk RPC calls
- Can handle OpenSea re-sales by monitoring transfer events
- Scales to any collection size

### Option 3: Hybrid Approach (Best of Both)

1. **Static metadata** for filtering/sorting (already done ✅)
2. **Insight API** for initial ownership load (batch call)
3. **Event-driven updates** for immediate purchase updates
4. **Backend cache** for long-term persistence

## Recommended Implementation

1. **Keep filtering static** (already done ✅)
2. **Use Insight API for batch ownership checks** instead of individual RPC calls
3. **Create API route** `/api/nft/ownership` that:
   - Uses Insight API for batch queries
   - Returns ownership data for requested token IDs
   - Caches results for 5 minutes

## Files to Modify

1. `lib/insight-service.ts` (new) - Insight API integration
2. `app/api/nft/ownership/route.ts` (new) - Backend API for ownership
3. `hooks/useOnChainOwnership.ts` - Use Insight API instead of individual RPC calls
4. `components/nft-grid.tsx` - Use Insight API for page ownership checks
5. `app/my-nfts/page.tsx` - Use Insight API for owned NFTs check

## Current RPC Usage Breakdown

| Component | Purpose | RPC Calls | Status |
|-----------|---------|-----------|--------|
| `nft-sidebar.tsx` | Filtering | 0 | ✅ Static |
| `nft-grid.tsx` (filtering) | Filtering/Sorting | 0 | ✅ Static |
| `nft-grid.tsx` (ownership) | Sold status check | 25/page | ❌ Needs Insight |
| `useOnChainOwnership` | Live/Sold counts | 7,777 | ❌ Needs Insight |
| `my-nfts/page.tsx` | Owned NFTs | 7,777 | ❌ Needs Insight |
| `nft/[id]/page.tsx` | Single ownership | 1 | ✅ OK (single call) |

