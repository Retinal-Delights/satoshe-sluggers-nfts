# Thirdweb AI Review Checklist

This document lists all files and details to share with thirdweb's AI to ensure proper implementation.

## 📋 Context to Provide First

Before sharing files, provide this context:

```
I'm building a Next.js 15 NFT marketplace using thirdweb v5 SDK. I need you to review my implementation to ensure I'm following best practices for:

1. Client initialization (client-side vs server-side)
2. Insight API usage
3. Marketplace contract interactions
4. Event queries
5. Batch operations (Multicall3)

My setup:
- Next.js 15 with App Router
- Thirdweb v5 SDK
- Base chain
- Non-custodial Marketplace V3
- ERC721 NFT collection (7777 tokens)
- Using both client-side components and server-side API routes
```

---

## 🔑 Core Configuration Files

### 1. `lib/thirdweb.ts`
**Purpose:** Client initialization for client-side, server-side, and Insight API  
**What it shows:**
- ✅ Separate clients for client-side (`client`) and server-side (`serverClient`)
- ✅ Client-side uses `clientId` (safe to expose)
- ✅ Server-side uses `secretKey` (better performance)
- ✅ Dedicated `insightClient` for Insight API operations
- ✅ Proper fallbacks if secretKey not set

**Key Questions to Ask:**
- Is the client initialization correct for Next.js App Router?
- Should we use `secretKey` for server-side API routes?
- Is the Insight API client setup correct?

---

## 🔍 Event Queries

### 2. `lib/hybrid-events.ts`
**Purpose:** Query Transfer events using Insight API  
**What it shows:**
- ✅ Uses `insightClient` for event queries
- ✅ Uses `getContractEvents()` from thirdweb SDK
- ✅ Handles `fromBlock: "earliest"` (Insight API requirement)
- ✅ Graceful error handling

**Key Questions to Ask:**
- Is `getContractEvents()` the best way to query events?
- Should we use Insight API for all event queries?
- Is the `fromBlock: "earliest"` handling correct?

---

## 🏪 Marketplace Interactions

### 3. `lib/marketplace-listings.ts`
**Purpose:** Fetch active listings from Marketplace V3 contract  
**What it shows:**
- ✅ Uses `serverClient` (server-side API routes)
- ✅ Uses `readContract()` directly (not SDK extension)
- ✅ Batches queries (500 at a time) to avoid "execution reverted"
- ✅ Gets `totalListings()` first to know valid range
- ✅ Filters for active listings from our collection

**Key Questions to Ask:**
- Should we use `getAllListings` SDK extension instead of raw `readContract()`?
- Is batching the right approach for `getAllValidListings()`?
- Why does `getAllValidListings(0, 10000)` cause "execution reverted"?
- Should we use Insight API for marketplace reads?

---

## 📦 Batch Operations

### 4. `lib/multicall3.ts`
**Purpose:** Batch ownership checks using Multicall3  
**What it shows:**
- ✅ Uses `serverClient` (server-side API routes)
- ✅ Manual Multicall3 implementation (not SDK extension)
- ✅ Batches 100 calls at a time
- ✅ Proper error handling per batch

**Key Questions to Ask:**
- Is manual Multicall3 the right approach, or should we use SDK extensions?
- Is batching 100 calls optimal?
- Should we use Insight API for these reads?

---

## 🌐 API Routes (Server-Side)

### 5. `app/api/ownership/route.ts`
**Purpose:** Batch ownership check API endpoint  
**What it shows:**
- ✅ Uses `batchCheckOwnership()` from multicall3
- ✅ Uses `getActiveListings()` from marketplace-listings
- ✅ Caching (5-minute cache)
- ✅ Server-side only (no client exposure)

**Key Questions to Ask:**
- Is the caching strategy appropriate?
- Should this use Insight API?

### 6. `app/api/nft/status/route.ts`
**Purpose:** Check if NFT is ACTIVE or SOLD  
**What it shows:**
- ✅ Uses `getActiveListings()` to determine status
- ✅ Caching (5-minute cache)
- ✅ Server-side only

**Key Questions to Ask:**
- Is checking active listings the correct way to determine ACTIVE/SOLD?
- Should we cache differently?

### 7. `app/api/nft/sale-order/route.ts`
**Purpose:** Get sale order (most recent sales first)  
**What it shows:**
- ✅ Uses `getTransferEventsFrom()` from hybrid-events
- ✅ Filters by marketplace address
- ✅ Server-side only

**Key Questions to Ask:**
- Is querying Transfer events the best way to get sale order?
- Should we use Insight API for this?

---

## 💻 Client-Side Components

### 8. `components/simple-connect-button.tsx`
**Purpose:** Wallet connection button  
**What it shows:**
- ✅ Uses `client` (client-side, safe to expose)
- ✅ Uses `ConnectButton` from `thirdweb/react`
- ✅ Proper wallet configuration

**Key Questions to Ask:**
- Is the client-side setup correct?
- Are the wallet configurations optimal?

### 9. `app/nft/[id]/page.tsx` (if using thirdweb)
**Purpose:** Individual NFT detail page  
**What it shows:**
- ✅ Uses `BuyDirectListingButton` from `thirdweb/react`
- ✅ Contract reads for listing status

**Key Questions to Ask:**
- Is `BuyDirectListingButton` the correct component?
- Should we use SDK extensions for listing status checks?

---

## 🔧 Additional Context Files

### 10. `package.json`
**Purpose:** Dependencies  
**What to check:**
- Thirdweb SDK version
- Other relevant dependencies

### 11. Environment Variables (describe, don't share values)
```
NEXT_PUBLIC_THIRDWEB_CLIENT_ID - Client-side SDK client ID
THIRDWEB_SECRET_KEY - Server-side secret key (optional)
INSIGHT_CLIENT_ID - Insight API dedicated client ID
NEXT_PUBLIC_NFT_COLLECTION_ADDRESS - NFT contract address
NEXT_PUBLIC_MARKETPLACE_ADDRESS - Marketplace contract address
```

---

## ❓ Specific Questions to Ask

1. **Client Initialization:**
   - Should we use `secretKey` for server-side API routes?
   - Is the fallback to `clientId` correct if `secretKey` not set?

2. **Insight API:**
   - Should we use Insight API for all contract reads, or just events?
   - Is the separate `insightClient` the right approach?

3. **Marketplace:**
   - Why does `getAllValidListings(0, 10000)` cause "execution reverted"?
   - Should we use `getAllListings` SDK extension instead?
   - Is batching the right solution?

4. **Multicall3:**
   - Should we use SDK extensions for Multicall3, or is manual implementation fine?
   - Is batching 100 calls optimal?

5. **Performance:**
   - Are we using the right clients in the right places?
   - Should we cache more aggressively?
   - Are there better SDK methods we should be using?

---

## 📝 Summary Template

When sharing with thirdweb AI, use this format:

```
I'm building a Next.js 15 NFT marketplace with thirdweb v5 SDK on Base chain.

Setup:
- Non-custodial Marketplace V3
- ERC721 collection (7777 tokens)
- Using Next.js App Router (server + client components)

Current Issues:
- getAllValidListings() causing "execution reverted" errors
- All NFTs showing as SOLD (likely because listings fetch fails)
- Want to ensure we're using best practices

Files to review:
1. lib/thirdweb.ts - Client initialization
2. lib/marketplace-listings.ts - Marketplace contract reads
3. lib/multicall3.ts - Batch operations
4. lib/hybrid-events.ts - Event queries
5. [API route examples]

Questions:
- [Your specific questions]
```

---

## ✅ Checklist Before Sharing

- [ ] All files are up to date
- [ ] No sensitive values (API keys, addresses) in shared code
- [ ] Context about your setup is clear
- [ ] Specific questions are listed
- [ ] Current issues/errors are described

---

---

## 🚀 Quick Start: Copy-Paste for Thirdweb AI

```
I'm building a Next.js 15 NFT marketplace using thirdweb v5 SDK on Base chain.

Setup:
- Non-custodial Marketplace V3
- ERC721 collection (7777 tokens)
- Next.js 15 App Router (server + client components)

Current Issues:
1. getAllValidListings() causing "execution reverted" errors
2. All NFTs showing as SOLD (likely because listings fetch fails)
3. Want to ensure proper client initialization (client-side vs server-side)

Please review these files:
- lib/thirdweb.ts (client initialization)
- lib/marketplace-listings.ts (marketplace contract reads)
- lib/multicall3.ts (batch operations)
- lib/hybrid-events.ts (event queries with Insight API)
- app/api/ownership/route.ts (example API route)
- components/simple-connect-button.tsx (client-side component)

Key Questions:
1. Should server-side API routes use secretKey instead of clientId?
2. Why does getAllValidListings(0, 10000) cause "execution reverted"?
3. Should we use getAllListings SDK extension instead of raw readContract()?
4. Is Insight API being used correctly for event queries?
5. Are we using the right clients in the right places?
```

**Last Updated:** 2025-01-XX

