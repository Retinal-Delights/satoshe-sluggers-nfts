// lib/contracts.ts
import { getContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { client } from "./thirdweb";

// Validate environment variables ONLY at runtime, never at module top-level
export const getNftCollection = () =>
  getContract({
    address: process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS!,
    chain: base,
    client,
  });

export const getMarketplace = () =>
  getContract({
    address: process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS!,
    chain: base,
    client,
  });

// Collection constants
export const MAX_NFTS = 3000;
export const TOTAL_COLLECTION_SIZE = 7777;
export const RPC_RATE_LIMIT = 225;
