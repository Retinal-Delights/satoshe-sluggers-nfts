// lib/contracts.ts
import { getContract } from "thirdweb";
import { defineChain } from "thirdweb/chains";
import { client } from "./thirdweb";

// Define Base chain (chain ID 8453)
const base = defineChain(8453);

/**
 * Gets the NFT collection contract instance
 * Validates environment variables at runtime (not module load time)
 * @returns Thirdweb contract instance for the NFT collection
 * @throws Error if NEXT_PUBLIC_NFT_COLLECTION_ADDRESS is not set
 */
export const getNftCollection = () =>
  getContract({
    address: process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS!,
    chain: base,
    client,
  });

/**
 * Gets the marketplace contract instance
 * Validates environment variables at runtime (not module load time)
 * @returns Thirdweb contract instance for the marketplace
 * @throws Error if NEXT_PUBLIC_MARKETPLACE_ADDRESS is not set
 */
export const getMarketplace = () =>
  getContract({
    address: process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS!,
    chain: base,
    client,
  });

// Collection constants
export const MAX_NFTS = 3000;
export const TOTAL_COLLECTION_SIZE = 7777;
export const RPC_RATE_LIMIT = 200;
