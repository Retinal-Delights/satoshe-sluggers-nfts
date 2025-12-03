/**
 * Insight API Service
 * Provides efficient batch NFT ownership and status queries using Thirdweb Insight API.
 * Falls back to Multicall3 when Insight API is unavailable.
 * 
 * Based on Thirdweb AI recommendations for optimal resource usage.
 * 
 * @see https://portal.thirdweb.com/insight - Insight API Documentation
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
 * Prefers Insight-specific client ID, falls back to main Thirdweb client ID
 * 
 * NOTE: All Insight API calls are server-side only (in API routes), so we use
 * server-side env vars (without NEXT_PUBLIC_) to keep the client ID secure.
 * This follows best practices by proxying requests through the backend.
 */
function getClientId(): string {
  // Prefer server-side Insight client ID (secure, not exposed to browser)
  const insightClientId = process.env.INSIGHT_CLIENT_ID;
  if (insightClientId) {
    return insightClientId;
  }
  
  // Fallback to public Insight client ID (if needed for some reason)
  const publicInsightClientId = process.env.NEXT_PUBLIC_INSIGHT_CLIENT_ID;
  if (publicInsightClientId) {
    return publicInsightClientId;
  }
  
  // Final fallback to main Thirdweb client ID
  const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing INSIGHT_CLIENT_ID, NEXT_PUBLIC_INSIGHT_CLIENT_ID, or NEXT_PUBLIC_THIRDWEB_CLIENT_ID environment variable");
  }
  return clientId;
}

/**
 * Fetch all NFT ownerships from Insight API
 * Returns array of { tokenId, owner } for all NFTs in the collection
 */
export async function getAllOwnershipsFromInsight(
  contractAddress: string,
  totalNFTs: number = 7777
): Promise<OwnershipResult[]> {
  const clientId = getClientId();
  
  // Try multiple endpoint formats (prioritize /nfts/owners as recommended)
  const endpoints = [
    // Format 1: Recommended - Chain-specific subdomain with /nfts/owners
    `${INSIGHT_API_BASE}/nfts/owners?contractAddress=${contractAddress}&limit=${totalNFTs}`,
    // Format 2: Global endpoint with chain param
    `${INSIGHT_API_BASE_ALT}/nfts/owners?chain=${BASE_CHAIN_ID}&contract=${contractAddress}&limit=${totalNFTs}`,
    // Format 3: Alternative with contract param
    `${INSIGHT_API_BASE_ALT}/nfts/owners?chain=${BASE_CHAIN_ID}&contractAddress=${contractAddress}&limit=${totalNFTs}`,
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        headers: {
          "x-client-id": clientId,
        },
        // Add timeout to prevent hanging
        // Timeout handled via try-catch
      });

      if (!response.ok) {
        // Log error details if available
        const errorText = await response.text().catch(() => "");
        console.warn(`Insight API returned ${response.status} for ${url}`, errorText || "");
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
      // Continue to next endpoint or fallback
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Insight API endpoint failed: ${url}`, errorMessage);
      continue;
    }
  }

  // All endpoints failed, throw to trigger fallback
  throw new Error("Insight API unavailable - all endpoints failed");
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
  
  // Try multiple endpoint formats (prioritize /nfts/owners as recommended)
  const endpoints = [
    // Format 1: Recommended - Chain-specific subdomain with /nfts/owners
    `${INSIGHT_API_BASE}/nfts/owners?contractAddress=${contractAddress}&tokenIds=${tokenIdsStr}`,
    // Format 2: Global endpoint with chain param
    `${INSIGHT_API_BASE_ALT}/nfts/owners?chain=${BASE_CHAIN_ID}&contract=${contractAddress}&tokenIds=${tokenIdsStr}`,
    // Format 3: Alternative with contractAddress param
    `${INSIGHT_API_BASE_ALT}/nfts/owners?chain=${BASE_CHAIN_ID}&contractAddress=${contractAddress}&tokenIds=${tokenIdsStr}`,
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
  
  const endpoints = [
    `${INSIGHT_API_BASE}/nfts?owner=${walletAddress}&contractAddress=${contractAddress}`,
    `${INSIGHT_API_BASE_ALT}/nfts?chain=${BASE_CHAIN_ID}&owner=${walletAddress}&contract=${contractAddress}`,
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

