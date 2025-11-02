// hooks/useFavorites.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { useActiveAccount } from 'thirdweb/react';
import { getFavorites, addFavorite, removeFavorite } from '@/lib/favorites-api';

export interface FavoriteNFT {
  tokenId: string;
  name: string;
  image: string;
  rarity: string;
  rank: string | number;
  rarityPercent: string | number;
  addedAt: number;
}

export function useFavorites() {
  const account = useActiveAccount();
  const [favorites, setFavorites] = useState<FavoriteNFT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevAddressRef = useRef<string | null>(null);
  const isLoadingRef = useRef(false);
  // Stabilize address to prevent unnecessary effect re-runs
  const accountAddress = account?.address?.toLowerCase() || null;

  // Get storage key for current wallet (for localStorage fallback)
  const getStorageKey = (address: string) => {
    return `nft_favorites_${address.toLowerCase()}`;
  };

  // Load favorites from API when account changes
  useEffect(() => {
    const addressString = accountAddress;
    
    // Only update if address actually changed (string comparison, not object reference)
    if (addressString === prevAddressRef.current || isLoadingRef.current) {
      if (!addressString && prevAddressRef.current === null) {
        // Both null, already handled
        setIsLoading(false);
      }
      return;
    }
    
    // Mark as loading immediately to prevent re-runs
    isLoadingRef.current = true;
    prevAddressRef.current = addressString;
    setIsLoading(true);
    setError(null);
    
    if (!addressString) {
      setFavorites([]);
      setIsLoading(false);
      isLoadingRef.current = false;
      return;
    }

    // Check localStorage first (immediate, no API call needed if available and recent)
    try {
      const storageKey = getStorageKey(addressString);
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const parsedFavorites = JSON.parse(stored);
          if (Array.isArray(parsedFavorites) && parsedFavorites.length >= 0) {
            setFavorites(parsedFavorites);
            setIsLoading(false);
            // Still fetch from API in background to sync, but don't block UI
            getFavorites(addressString)
              .then((apiFavorites) => {
                if (prevAddressRef.current === addressString) {
                  setFavorites(apiFavorites);
                  localStorage.setItem(storageKey, JSON.stringify(apiFavorites));
                }
              })
              .catch(() => {
                // Silently fail - we already have localStorage data
              })
              .finally(() => {
                if (prevAddressRef.current === addressString) {
                  isLoadingRef.current = false;
                }
              });
            return;
          }
        } catch {
          // Invalid localStorage data, proceed to API
        }
      }
    } catch {
      // localStorage error, proceed to API
    }

    // Try to load from API (pass wallet address)
    getFavorites(addressString)
      .then((apiFavorites) => {
        // Double-check address hasn't changed during the API call
        if (prevAddressRef.current !== addressString) {
          return;
        }
        setFavorites(apiFavorites);
        // Sync to localStorage as backup
        try {
          const storageKey = getStorageKey(addressString);
          localStorage.setItem(storageKey, JSON.stringify(apiFavorites));
        } catch {
          // Ignore localStorage errors
        }
      })
      .catch((err) => {
        // Double-check address hasn't changed during the API call
        if (prevAddressRef.current !== addressString) {
          return;
        }
        // Suppress error logging for connection failures (reduces terminal clutter)
        const errorMessage = err.message || 'Failed to load favorites';
        const isConnectionError = 
          errorMessage.includes('Failed to fetch') || 
          errorMessage.includes('ERR_CONNECTION_REFUSED') ||
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('ECONNREFUSED');
        
        if (!isConnectionError) {
          // Only log unexpected errors
          console.error('[Favorites] Error loading favorites:', errorMessage);
        }
        
        setError(errorMessage);
        
        // Fallback to localStorage if API fails
        try {
          const storageKey = getStorageKey(addressString);
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            const parsedFavorites = JSON.parse(stored);
            setFavorites(parsedFavorites);
          } else {
            setFavorites([]);
          }
        } catch {
          setFavorites([]);
        }
      })
      .finally(() => {
        // Only update if address hasn't changed
        if (prevAddressRef.current === addressString) {
          setIsLoading(false);
          isLoadingRef.current = false;
        }
      });
  }, [accountAddress]);

  // Add NFT to favorites (API + optimistic update)
  const addToFavorites = useCallback(async (nft: Omit<FavoriteNFT, 'addedAt'>) => {
    if (!accountAddress) return false;

    // Optimistic update
    const optimisticFavorite: FavoriteNFT = {
      ...nft,
      addedAt: Date.now(),
    };
    setFavorites((prev) => [...prev, optimisticFavorite]);

    try {
      // Sync to API (pass wallet address)
      const apiFavorite = await addFavorite(accountAddress, nft);
      
      // Update with server data
      setFavorites((prev) => {
        const filtered = prev.filter((f) => f.tokenId !== nft.tokenId);
        return [...filtered, apiFavorite];
      });

      // Sync to localStorage as backup
      try {
        const storageKey = getStorageKey(accountAddress);
        setFavorites((currentFavs) => {
          const updated = [...currentFavs.filter((f) => f.tokenId !== nft.tokenId), apiFavorite];
          localStorage.setItem(storageKey, JSON.stringify(updated));
          return currentFavs; // Don't update state here, already updated above
        });
      } catch {
        // Ignore localStorage errors
      }

      return true;
    } catch (err) {
      // Rollback optimistic update on error
      setFavorites((prev) => prev.filter((f) => f.tokenId !== nft.tokenId));
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to add favorite';
      setError(errorMessage);
      // Suppress connection error logging (reduces terminal clutter)
      const isConnectionError = 
        errorMessage.includes('Failed to fetch') || 
        errorMessage.includes('ERR_CONNECTION_REFUSED') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('ECONNREFUSED');
      if (!isConnectionError) {
        console.error('[Favorites] Error adding favorite:', errorMessage);
      }
      
      // Still save to localStorage as fallback
      try {
        const storageKey = getStorageKey(accountAddress);
        setFavorites((currentFavs) => {
          const updated = [...currentFavs.filter((f) => f.tokenId !== nft.tokenId), optimisticFavorite];
          localStorage.setItem(storageKey, JSON.stringify(updated));
          return currentFavs; // Keep original state since API failed
        });
      } catch {
        // Ignore localStorage errors
      }

      return false;
    }
  }, [accountAddress]);

  // Remove NFT from favorites (API + optimistic update)
  const removeFromFavorites = useCallback(async (tokenId: string) => {
    if (!accountAddress) return;

    // Optimistic update - capture current favorites before update
    setFavorites((prev) => {
      const removedFavorites = prev.filter((f) => f.tokenId !== tokenId);
      
      // Save to localStorage immediately for fallback
      try {
        const storageKey = getStorageKey(accountAddress);
        localStorage.setItem(storageKey, JSON.stringify(removedFavorites));
      } catch {
        // Ignore localStorage errors
      }
      
      return removedFavorites;
    });

    try {
      // Sync to API (pass wallet address)
      await removeFavorite(accountAddress, tokenId);
    } catch (err) {
      // Rollback optimistic update on error
      setFavorites((prev) => {
        // Check if token was already removed - if not, restore previous state
        const wasRemoved = !prev.some((f) => f.tokenId === tokenId);
        if (wasRemoved) {
          // Restore from localStorage
          try {
            const storageKey = getStorageKey(accountAddress);
            const stored = localStorage.getItem(storageKey);
            if (stored) {
              return JSON.parse(stored);
            }
          } catch {
            // Fall through to return prev
          }
        }
        return prev;
      });
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove favorite';
      setError(errorMessage);
      // Suppress connection error logging (reduces terminal clutter)
      const isConnectionError = 
        errorMessage.includes('Failed to fetch') || 
        errorMessage.includes('ERR_CONNECTION_REFUSED') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('ECONNREFUSED');
      if (!isConnectionError) {
        console.error('[Favorites] Error removing favorite:', errorMessage);
      }
    }
  }, [accountAddress]);

  // Check if NFT is favorited
  const isFavorited = useCallback((tokenId: string) => {
    return favorites.some((fav) => fav.tokenId === tokenId);
  }, [favorites]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (nft: Omit<FavoriteNFT, 'addedAt'>) => {
    if (!accountAddress) return false;

    if (isFavorited(nft.tokenId)) {
      await removeFromFavorites(nft.tokenId);
      return false;
    } else {
      const success = await addToFavorites(nft);
      return success;
    }
  }, [accountAddress, isFavorited, addToFavorites, removeFromFavorites]);

  return {
    favorites,
    isLoading,
    error,
    addToFavorites,
    removeFromFavorites,
    isFavorited,
    toggleFavorite,
    isConnected: !!accountAddress,
  };
}

