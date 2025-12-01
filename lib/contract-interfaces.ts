// lib/contract-interfaces.ts
// Contract interface helpers for Satoshe Sluggers NFT Collection

import { readContract } from "thirdweb";
import { getNftCollection } from "./contracts";
import { rpcRateLimiter } from "./rpc-rate-limiter";

type Contract = ReturnType<typeof getNftCollection>;

/**
 * Get contract instance
 */
export function getContract(): Contract {
  return getNftCollection();
}

/**
 * Get token owner
 */
export async function ownerOf(contract: Contract, tokenId: bigint): Promise<string> {
  return await rpcRateLimiter.execute(async () => {
    return (await readContract({
      contract,
      method: "function ownerOf(uint256 tokenId) view returns (address)",
      params: [tokenId],
    })) as string;
  });
}

/**
 * Get token balance for an address
 */
export async function balanceOf(contract: Contract, owner: string): Promise<bigint> {
  return await rpcRateLimiter.execute(async () => {
    return (await readContract({
      contract,
      method: "function balanceOf(address owner) view returns (uint256)",
      params: [owner],
    })) as bigint;
  });
}

/**
 * Get total supply
 */
export async function totalSupply(contract: Contract): Promise<bigint> {
  return await rpcRateLimiter.execute(async () => {
    return (await readContract({
      contract,
      method: "function totalSupply() view returns (uint256)",
      params: [],
    })) as bigint;
  });
}

/**
 * Get token URI
 */
export async function tokenURI(contract: Contract, tokenId: bigint): Promise<string> {
  return await rpcRateLimiter.execute(async () => {
    return (await readContract({
      contract,
      method: "function tokenURI(uint256 tokenId) view returns (string)",
      params: [tokenId],
    })) as string;
  });
}

/**
 * Get contract name
 */
export async function name(contract: Contract): Promise<string> {
  return await rpcRateLimiter.execute(async () => {
    return (await readContract({
      contract,
      method: "function name() view returns (string)",
      params: [],
    })) as string;
  });
}

/**
 * Get contract symbol
 */
export async function symbol(contract: Contract): Promise<string> {
  return await rpcRateLimiter.execute(async () => {
    return (await readContract({
      contract,
      method: "function symbol() view returns (string)",
      params: [],
    })) as string;
  });
}

/**
 * Contract event signatures
 */
export const CONTRACT_EVENTS = {
  Transfer: "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  Approval: "event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)",
  ApprovalForAll: "event ApprovalForAll(address indexed owner, address indexed operator, bool approved)",
  TokensClaimed: "event TokensClaimed(address indexed claimer, address indexed receiver, uint256 indexed startTokenId, uint256 quantityClaimed)",
} as const;
