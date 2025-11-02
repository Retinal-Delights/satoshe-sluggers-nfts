// lib/favorites-api.ts
// Client-side utilities for calling the favorites API
// Uses wallet address directly (no authentication required)

import type { FavoriteNFT } from '@/hooks/useFavorites';

// Request deduplication cache - prevents multiple simultaneous calls for same address
const pendingRequests = new Map<string, Promise<FavoriteNFT[]>>();
const requestCache = new Map<string, { data: FavoriteNFT[]; timestamp: number }>();
const CACHE_TTL = 10000; // 10 seconds cache

/**
 * Invalidate cache for a wallet address (call after add/remove operations)
 */
export function invalidateCache(walletAddress: string) {
  const normalizedAddress = walletAddress.toLowerCase();
  requestCache.delete(normalizedAddress);
}

/**
 * Get all favorites for wallet address (with request deduplication and caching)
 */
export async function getFavorites(walletAddress: string): Promise<FavoriteNFT[]> {
  if (!walletAddress) {
    throw new Error('Wallet address is required');
  }

  const normalizedAddress = walletAddress.toLowerCase();

  // Check cache first
  const cached = requestCache.get(normalizedAddress);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // If there's already a pending request for this address, reuse it
  const pending = pendingRequests.get(normalizedAddress);
  if (pending) {
    return pending;
  }

  // Create new request
  const requestPromise = fetch(`/api/favorites?walletAddress=${encodeURIComponent(normalizedAddress)}`)
    .then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch favorites: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch favorites');
      }

      const favorites = data.favorites.map((fav: {
        tokenId: string;
        name: string;
        image: string;
        rarity: string;
        rank: string | number;
        rarityPercent: string | number;
        addedAt: string;
      }) => ({
        tokenId: fav.tokenId,
        name: fav.name,
        image: fav.image,
        rarity: fav.rarity,
        rank: fav.rank,
        rarityPercent: fav.rarityPercent,
        addedAt: new Date(fav.addedAt).getTime(),
      }));

      // Cache the result
      requestCache.set(normalizedAddress, {
        data: favorites,
        timestamp: Date.now(),
      });

      return favorites;
    })
    .finally(() => {
      // Remove from pending requests when done
      pendingRequests.delete(normalizedAddress);
    });

  // Store pending request
  pendingRequests.set(normalizedAddress, requestPromise);

  return requestPromise;
}

/**
 * Add a favorite (requires wallet address)
 */
export async function addFavorite(
  walletAddress: string,
  nft: Omit<FavoriteNFT, 'addedAt'>
): Promise<FavoriteNFT> {
  if (!walletAddress) {
    throw new Error('Wallet address is required');
  }

  const response = await fetch('/api/favorites', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      walletAddress,
      tokenId: nft.tokenId,
      name: nft.name,
      image: nft.image,
      rarity: nft.rarity,
      rank: nft.rank,
      rarityPercent: nft.rarityPercent,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to add favorite: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to add favorite');
  }

  const favorite: FavoriteNFT = {
    tokenId: data.favorite.tokenId,
    name: data.favorite.name,
    image: data.favorite.image,
    rarity: data.favorite.rarity,
    rank: data.favorite.rank,
    rarityPercent: data.favorite.rarityPercent,
    addedAt: new Date(data.favorite.addedAt).getTime(),
  };

  // Invalidate cache so next getFavorites call fetches fresh data
  invalidateCache(walletAddress);

  return favorite;
}

/**
 * Remove a favorite (requires wallet address)
 */
export async function removeFavorite(walletAddress: string, tokenId: string): Promise<void> {
  if (!walletAddress) {
    throw new Error('Wallet address is required');
  }

  const response = await fetch(`/api/favorites/${tokenId}?walletAddress=${encodeURIComponent(walletAddress)}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to remove favorite: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to remove favorite');
  }

  // Invalidate cache so next getFavorites call fetches fresh data
  invalidateCache(walletAddress);
}

