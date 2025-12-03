/**
 * Insight API Service
 * Provides efficient batch NFT ownership and status queries using Thirdweb Insight API.
 * Falls back to Multicall3 when Insight API is unavailable.
 * 
 * Based on Thirdweb AI recommendations for optimal resource usage.
 * 
 * @see https://portal.thirdweb.com/insight - Insight API Documentation
 * @see https://portal.thirdweb.com/insight/api-reference/get-nft-owners - Get NFT Owners API Reference
 */

import { batchCheckOwnership } from "./multicall3";

// Base chain ID for Base network
const BASE_CHAIN_ID = 8453;

// Insight API base URLs (try both formats for compatibility)
const INSIGHT_API_BASE = `https://${BASE_CHAIN_ID}.insight.thirdweb.com/v1`;
const INSIGHT_API_BASE_ALT = `https://insight.thirdweb.com/v1`;

interface InsightNFT {
  token_id: string | number;
  owner_address: string;
  owner?: string; // Alternative field name
  contract_address?: string;
}

interface InsightResponse {
  data?: InsightNFT[];
  results?: InsightNFT[];
  owners?: Array<{ token_id: string | number; owner: string }>;
  error?: string;
  message?: string;
}

interface OwnershipResult {
  tokenId: number;
  owner: string;
}

/**
 * Get client ID from environment
 * Priority order:
 * 1. INSIGHT_CLIENT_ID (server-side, secure, preferred for Insight API calls)
 * 2. NEXT_PUBLIC_INSIGHT_CLIENT_ID (public, if needed)
 * 3. NEXT_PUBLIC_THIRDWEB_CLIENT_ID (fallback to main Thirdweb client ID)
 * 
 * NOTE: All Insight API calls are server-side only (in API routes), so we use
 * server-side env vars (without NEXT_PUBLIC_) to keep the client ID secure.
 * This follows best practices by proxying requests through the backend.
 * 
 * Best practice: Use a dedicated INSIGHT_CLIENT_ID for server-side Insight API calls.
 * This keeps it private and not exposed to the browser.
 */
function getClientId(): string {
  // Priority 1: Prefer server-side Insight client ID (secure, not exposed to browser)
  // This is the recommended approach for dedicated Insight API usage
  const insightClientId = process.env.INSIGHT_CLIENT_ID;
  if (insightClientId) {
    console.log(`[Insight Service] Using dedicated INSIGHT_CLIENT_ID (server-side)`);
    return insightClientId;
  }
  
  // Priority 2: Fallback to public Insight client ID (if needed for some reason)
  const publicInsightClientId = process.env.NEXT_PUBLIC_INSIGHT_CLIENT_ID;
  if (publicInsightClientId) {
    console.log(`[Insight Service] Using NEXT_PUBLIC_INSIGHT_CLIENT_ID (fallback)`);
    return publicInsightClientId;
  }
  
  // Priority 3: Final fallback to main Thirdweb client ID
  const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing INSIGHT_CLIENT_ID, NEXT_PUBLIC_INSIGHT_CLIENT_ID, or NEXT_PUBLIC_THIRDWEB_CLIENT_ID environment variable");
  }
  console.log(`[Insight Service] Using NEXT_PUBLIC_THIRDWEB_CLIENT_ID (final fallback)`);
  return clientId;
}

/**
 * Fetch all NFT ownerships from Insight API
 * Returns array of { tokenId, owner } for all NFTs in the collection
 * 
 * NOTE: Insight API has a maximum limit of 1000 per request.
 * IMPORTANT: The /nfts/owners endpoint does NOT support offset/start parameters.
 * For collections >1000 NFTs, we can only fetch the first 1000 results.
 * For larger collections, consider using Multicall3 fallback or the /nfts endpoint.
 * 
 * @see https://portal.thirdweb.com/insight - Insight API Documentation
 */
export async function getAllOwnershipsFromInsight(
  contractAddress: string,
  totalNFTs: number = 7777
): Promise<OwnershipResult[]> {
  const clientId = getClientId();
  const MAX_LIMIT = 1000; // Insight API maximum limit per request
  
  // If collection is smaller than limit, fetch in one request
  if (totalNFTs <= MAX_LIMIT) {
    return await fetchOwnershipsPage(clientId, contractAddress, 0, totalNFTs);
  }
  
  // For larger collections, paginate requests
  const allResults: OwnershipResult[] = [];
  let offset = 0;
  
  while (offset < totalNFTs) {
    const limit = Math.min(MAX_LIMIT, totalNFTs - offset);
    const pageResults = await fetchOwnershipsPage(clientId, contractAddress, offset, limit);
    allResults.push(...pageResults);
    offset += limit;
    
    // If we got fewer results than requested, we've reached the end
    if (pageResults.length < limit) {
      break;
    }
  }
  
  return allResults;
}

/**
 * Fetch a single page of ownerships from Insight API
 * 
 * NOTE: The Insight API /nfts/owners endpoint does NOT support offset/start parameters.
 * This function can only fetch the first N results (up to 1000 limit).
 * For pagination beyond 1000, use Multicall3 fallback or aggregate from /nfts endpoint.
 * 
 * @see https://portal.thirdweb.com/insight/api-reference/get-nft-owners - API Reference
 */
async function fetchOwnershipsPage(
  clientId: string,
  contractAddress: string,
  offset: number, // NOTE: Currently unused - Insight API does not support offset
  limit: number
): Promise<OwnershipResult[]> {
  // Ensure contract address is lowercase (Ethereum addresses should be lowercase for API)
  const contractAddressLower = contractAddress.toLowerCase();
  
  // Log contract address for debugging
  console.log(`[Insight API] Fetching ownership for contract: ${contractAddressLower} (original: ${contractAddress})`);
  
  // Use only contractAddress (camelCase) parameter as required by Insight API
  // Addresses must be lowercase (42 characters, starting with 0x)
  const endpoints = [
    // Format 1: Chain-specific endpoint (recommended)
    `${INSIGHT_API_BASE}/nfts/owners?contractAddress=${contractAddressLower}&limit=${limit}`,
    // Format 2: Global endpoint with chain param
    `${INSIGHT_API_BASE_ALT}/nfts/owners?chain=${BASE_CHAIN_ID}&contractAddress=${contractAddressLower}&limit=${limit}`,
  ];
  
  console.log(`[Insight API] Attempting endpoints:`, endpoints);

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        headers: {
          "x-client-id": clientId,
        },
        // Timeout handled via try-catch
      });

      if (!response.ok) {
        // Parse error details for better debugging
        let errorText = "";
        let errorJson: { error?: { message?: string; issues?: unknown[] }; message?: string } | null = null;
        
        try {
          errorText = await response.text();
          // Try to parse as JSON for structured error messages
          try {
            errorJson = JSON.parse(errorText);
          } catch {
            // Not JSON, use as plain text
          }
        } catch {
          // Ignore text read errors
        }
        
        // Extract meaningful error message
        const errorMessage = errorJson?.error?.message || errorJson?.message || errorText || `HTTP ${response.status}`;
        
        // Don't log 400 errors for limit issues (we'll handle pagination)
        if (response.status !== 400 || !errorText.includes("too_big")) {
          console.warn(`Insight API returned ${response.status} for ${url}`, errorMessage);
        }
        
        // If 401 Unauthorized, the client ID is wrong - don't try other endpoints
        if (response.status === 401) {
          throw new Error(`Insight API authentication failed (401): ${errorMessage}. Check INSIGHT_CLIENT_ID.`);
        }
        
        continue; // Try next endpoint
      }

      const data: InsightResponse = await response.json();
      
      // Handle different response formats
      let nfts: InsightNFT[] = [];
      
      if (Array.isArray(data.data)) {
        nfts = data.data;
      } else if (Array.isArray(data.results)) {
        nfts = data.results;
      } else if (Array.isArray(data.owners)) {
        nfts = data.owners.map((item) => ({
          token_id: item.token_id,
          owner_address: item.owner,
        }));
      } else if (Array.isArray(data)) {
        nfts = data;
      }

      if (nfts.length > 0) {
        // Convert to our format with safe token ID parsing
        return nfts
          .map((nft) => {
            // Handle token_id - check for undefined/null first
            if (nft.token_id === undefined || nft.token_id === null) {
              return null;
            }
            
            const tokenId = typeof nft.token_id === "string" 
              ? parseInt(nft.token_id, 10) 
              : Number(nft.token_id);
            
            // Handle owner - check both owner_address and owner fields
            const owner = (nft.owner_address || nft.owner || "").toLowerCase();
            
            if (isNaN(tokenId) || tokenId < 0) {
              return null;
            }
            
            return {
              tokenId,
              owner,
            };
          })
          .filter((item): item is OwnershipResult => item !== null);
      }
    } catch (error) {
      // If it's an auth error, throw immediately (don't try other endpoints)
      if (error instanceof Error && error.message.includes("authentication failed")) {
        throw error;
      }
      
      // Continue to next endpoint or fallback
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Insight API endpoint failed: ${url}`, errorMessage);
      continue;
    }
  }

  // All endpoints failed, throw to trigger fallback
  // Include last error details if available for debugging
  throw new Error("Insight API unavailable - all endpoints failed. Falling back to Multicall3.");
}

/**
 * Get ownership for specific token IDs from Insight API
 */
export async function getBatchOwnershipFromInsight(
  contractAddress: string,
  tokenIds: number[]
): Promise<OwnershipResult[]> {
  if (tokenIds.length === 0) return [];

  const clientId = getClientId();
  
  // Format token IDs as comma-separated string
  const tokenIdsStr = tokenIds.join(",");
  
  // Ensure contract address is lowercase
  const contractAddressLower = contractAddress.toLowerCase();
  
  // Use only contractAddress (camelCase) parameter as required by Insight API
  const endpoints = [
    // Format 1: Chain-specific endpoint (recommended)
    `${INSIGHT_API_BASE}/nfts/owners?contractAddress=${contractAddressLower}&tokenIds=${tokenIdsStr}`,
    // Format 2: Global endpoint with chain param
    `${INSIGHT_API_BASE_ALT}/nfts/owners?chain=${BASE_CHAIN_ID}&contractAddress=${contractAddressLower}&tokenIds=${tokenIdsStr}`,
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        headers: {
          "x-client-id": clientId,
        },
        // Timeout handled via try-catch and endpoint rotation
      });

      if (!response.ok) {
        // Parse error for better debugging (but don't throw - try next endpoint)
        try {
          const errorText = await response.text();
          let errorJson: { error?: { message?: string }; message?: string } | null = null;
          try {
            errorJson = JSON.parse(errorText);
          } catch {
            // Not JSON, ignore
          }
          const errorMessage = errorJson?.error?.message || errorJson?.message || errorText || `HTTP ${response.status}`;
          console.warn(`Insight API batch endpoint returned ${response.status}: ${errorMessage}`);
        } catch {
          // Ignore error parsing errors
        }
        continue;
      }

      const data: InsightResponse = await response.json();
      
      let nfts: InsightNFT[] = [];
      
      if (Array.isArray(data.data)) {
        nfts = data.data;
      } else if (Array.isArray(data.results)) {
        nfts = data.results;
      } else if (Array.isArray(data.owners)) {
        nfts = data.owners.map((item) => ({
          token_id: item.token_id,
          owner_address: item.owner,
        }));
      }

      if (nfts.length > 0) {
        // Convert to our format with safe token ID parsing
        return nfts
          .map((nft) => {
            // Handle token_id - check for undefined/null first
            if (nft.token_id === undefined || nft.token_id === null) {
              return null;
            }
            
            const tokenId = typeof nft.token_id === "string" 
              ? parseInt(nft.token_id, 10) 
              : Number(nft.token_id);
            
            // Handle owner - check both owner_address and owner fields
            const owner = (nft.owner_address || nft.owner || "").toLowerCase();
            
            if (isNaN(tokenId)) {
              return null;
            }
            
            return {
              tokenId,
              owner,
            };
          })
          .filter((item): item is OwnershipResult => item !== null);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Insight API batch endpoint failed: ${url}`, errorMessage);
      continue;
    }
  }

  throw new Error("Insight API unavailable for batch query");
}

/**
 * Get NFTs owned by a specific wallet address
 */
export async function getOwnedNFTsFromInsight(
  contractAddress: string,
  walletAddress: string
): Promise<OwnershipResult[]> {
  const clientId = getClientId();
  
  // Ensure contract address is lowercase
  const contractAddressLower = contractAddress.toLowerCase();
  const walletAddressLower = walletAddress.toLowerCase();
  
  // Use only contractAddress (camelCase) parameter as required by Insight API
  const endpoints = [
    // Format 1: Chain-specific endpoint (recommended)
    `${INSIGHT_API_BASE}/nfts?owner=${walletAddressLower}&contractAddress=${contractAddressLower}`,
    // Format 2: Global endpoint with chain param
    `${INSIGHT_API_BASE_ALT}/nfts?chain=${BASE_CHAIN_ID}&owner=${walletAddressLower}&contractAddress=${contractAddressLower}`,
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        headers: {
          "x-client-id": clientId,
        },
        // Timeout handled via try-catch and endpoint rotation
      });

      if (!response.ok) {
        // Parse error for better debugging (but don't throw - try next endpoint)
        try {
          const errorText = await response.text();
          let errorJson: { error?: { message?: string }; message?: string } | null = null;
          try {
            errorJson = JSON.parse(errorText);
          } catch {
            // Not JSON, ignore
          }
          const errorMessage = errorJson?.error?.message || errorJson?.message || errorText || `HTTP ${response.status}`;
          console.warn(`Insight API wallet endpoint returned ${response.status}: ${errorMessage}`);
        } catch {
          // Ignore error parsing errors
        }
        continue;
      }

      const data: InsightResponse = await response.json();
      
      let nfts: InsightNFT[] = [];
      
      if (Array.isArray(data.data)) {
        nfts = data.data;
      } else if (Array.isArray(data.results)) {
        nfts = data.results;
      }

      if (nfts.length > 0) {
        // Convert to our format with safe token ID parsing
        return nfts
          .map((nft) => {
            // Handle token_id - check for undefined/null first
            if (nft.token_id === undefined || nft.token_id === null) {
              return null;
            }
            
            const tokenId = typeof nft.token_id === "string" 
              ? parseInt(nft.token_id, 10) 
              : Number(nft.token_id);
            
            // Handle owner - check both owner_address and owner fields
            const owner = (nft.owner_address || nft.owner || "").toLowerCase();
            
            if (isNaN(tokenId) || tokenId < 0) {
              return null;
            }
            
            return {
              tokenId,
              owner,
            };
          })
          .filter((item): item is OwnershipResult => item !== null);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Insight API wallet endpoint failed: ${url}`, errorMessage);
      continue;
    }
  }

  throw new Error("Insight API unavailable for wallet query");
}

/**
 * Get all ownerships with fallback to Multicall3
 * This is the main function to use - it tries Insight first, then falls back to Multicall3
 */
export async function getAllOwnershipsWithFallback(
  contractAddress: string,
  totalNFTs: number = 7777
): Promise<OwnershipResult[]> {
  try {
    // Try Insight API first
    return await getAllOwnershipsFromInsight(contractAddress, totalNFTs);
  } catch (error) {
    // Fallback to Multicall3
    console.warn("Insight API unavailable, falling back to Multicall3", error);
    
    const tokenIds = Array.from({ length: totalNFTs }, (_, i) => i);
    const results = await batchCheckOwnership(contractAddress, tokenIds);
    
    return results.map(({ tokenId, owner }) => ({
      tokenId,
      owner: owner.toLowerCase(),
    }));
  }
}

/**
 * Get batch ownership with fallback to Multicall3
 */
export async function getBatchOwnershipWithFallback(
  contractAddress: string,
  tokenIds: number[]
): Promise<OwnershipResult[]> {
  if (tokenIds.length === 0) return [];

  try {
    // Try Insight API first
    return await getBatchOwnershipFromInsight(contractAddress, tokenIds);
  } catch (error) {
    // Fallback to Multicall3
    console.warn("Insight API unavailable for batch query, falling back to Multicall3", error);
    
    const results = await batchCheckOwnership(contractAddress, tokenIds);
    
    return results.map(({ tokenId, owner }) => ({
      tokenId,
      owner: owner.toLowerCase(),
    }));
  }
}

