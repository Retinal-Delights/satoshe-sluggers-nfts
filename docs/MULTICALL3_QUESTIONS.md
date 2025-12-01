# Multicall3 Implementation - Questions for Thirdweb AI

## Context

**Project:** NFT Marketplace on Base chain (chain ID 8453)  
**Thirdweb Version:** v5.110.3  
**TypeScript:** Yes  
**Package Manager:** pnpm  
**Goal:** Batch multiple `ownerOf(uint256)` calls into a single RPC call to reduce rate limiting issues

## Current Implementation

We're trying to use Multicall3 (address: `0xcA11bde05977b3631167028862bE2a173976CA11`) to batch check ownership for multiple NFTs. Currently checking up to 7,777 NFTs individually, which causes RPC rate limiting issues.

**Current Code:**
```typescript
// lib/multicall3.ts
import { getContract, readContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { Interface } from "ethers"; // Using ethers for encoding

const multicall3 = getContract({
  client,
  chain: base,
  address: "0xcA11bde05977b3631167028862bE2a173976CA11",
});

// Encoding calls with ethers
const erc721Interface = new Interface([
  "function ownerOf(uint256 tokenId) view returns (address)",
]);

const calls = tokenIds.map((tokenId) => {
  const callData = erc721Interface.encodeFunctionData("ownerOf", [BigInt(tokenId)]);
  return {
    target: nftContractAddress as `0x${string}`,
    callData: callData as `0x${string}`,
  };
});

// Trying to use readContract with tryAggregate
// @ts-expect-error - Type error here
const result = await readContract({
  contract: multicall3,
  method: "function tryAggregate(bool requireSuccess, tuple(address target, bytes callData)[] calls) view returns (tuple(bool success, bytes returnData)[] returnData)",
  params: [false, batch],
}) as Array<{ success: boolean; returnData: string }>;
```

## Issues & Questions

### 1. **TypeScript Type Errors**
**Problem:** `readContract` doesn't accept the complex tuple type for multicall3's `tryAggregate` method. TypeScript error: `Argument of type '{ contract: ..., method: string, params: [...] }' is not assignable to parameter of type 'never'`.

**Question:** What's the correct way to call `tryAggregate` on Multicall3 using Thirdweb v5's `readContract`? Should we use a different approach?

### 2. **Multicall3 Extension vs Direct readContract**
**Problem:** We tried using `tryAggregate` from `thirdweb/extensions/multicall3`, but it returns a `PreparedTransaction`, not the actual results. We need read-only results, not a transaction.

**Question:** 
- Should we use the multicall3 extension for read operations, or `readContract` directly?
- If using the extension, how do we get the results without sending a transaction?
- Is there a `read` version of `tryAggregate` in the extension?

### 3. **Function Encoding**
**Problem:** Currently using `ethers.Interface` to encode function calls. This works but feels like a workaround.

**Question:** 
- Does Thirdweb v5 have a built-in way to encode function calls (like `encodeFunctionData`)?
- Should we use `encode` from `thirdweb`? (We tried but it doesn't accept parameters the way we expected)
- What's the recommended approach for encoding function calls for multicall3?

### 4. **Return Data Decoding**
**Problem:** Manually decoding return data by slicing hex strings. This works but is error-prone.

**Question:** 
- Does Thirdweb v5 have a built-in way to decode return data from contract calls?
- Should we use `decode` from `thirdweb`? (We tried importing it but it doesn't exist in the exports)
- What's the recommended approach for decoding multicall3 return data?

### 5. **Batch Size Limits**
**Question:** 
- What's the recommended batch size for multicall3 calls? (We're using 100 per batch)
- Are there any limits we should be aware of?
- Should we use `tryAggregate` or `aggregate` for read-only operations?

### 6. **Error Handling**
**Question:** 
- With `requireSuccess: false`, how should we handle partial failures?
- Is the current approach of checking `result.success` and `result.returnData` correct?

## What We're Trying to Achieve

**Use Case:** Check ownership for 100-7,777 NFTs at once
- **Current approach:** 7,777 individual RPC calls (very slow, hits rate limits)
- **Desired approach:** 1-78 multicall3 RPC calls (100 NFTs per call)

**Example:**
```typescript
// Input: [0, 1, 2, ..., 99] (100 token IDs)
// Output: [
//   { tokenId: 0, owner: "0x1234..." },
//   { tokenId: 1, owner: "0x5678..." },
//   ...
// ]
```

## Specific Code Request

Please provide a complete, working example of:
1. How to properly call Multicall3's `tryAggregate` for read operations using Thirdweb v5
2. How to encode the `ownerOf(uint256)` function call using Thirdweb's built-in methods
3. How to decode the return data (address) using Thirdweb's built-in methods
4. Proper TypeScript types that work without `@ts-expect-error`

## Environment

- **Chain:** Base (chain ID 8453)
- **Contract:** Standard ERC-721 NFT contract
- **Multicall3 Address:** `0xcA11bde05977b3631167028862bE2a173976CA11`
- **Thirdweb Client:** Already configured with `createThirdwebClient({ clientId: ... })`

## Current Workaround

We're currently using:
- `@ts-expect-error` to bypass TypeScript errors
- `ethers.Interface` for encoding
- Manual hex string manipulation for decoding

This works at runtime but isn't ideal. We'd like to use Thirdweb's native methods if available.

---

**Please provide a complete, type-safe solution using Thirdweb v5's recommended approach.**

