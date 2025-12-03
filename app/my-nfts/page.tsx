"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Footer from "@/components/footer";
import Navigation from "@/components/navigation";
import Image from "next/image";
import Link from "next/link";
import { useActiveAccount } from "thirdweb/react";
import { useFavorites } from "@/hooks/useFavorites";
import { Heart, Package } from "lucide-react";
import { getContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { client } from "@/lib/thirdweb";
import { getOwnedNFTs } from "thirdweb/extensions/erc721";
import { loadAllNFTs } from "@/lib/simple-data-service";
import { convertIpfsUrl } from "@/lib/utils";

// NFT data structure for grid/cards
interface NFT {
  id: string;
  tokenId: string;
  name: string;
  image: string;
  rarity?: string;
  isLocallyUnfavorited?: boolean;
  [key: string]: unknown;
}

function MyNFTsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState("favorites");
  const [isLoading, setIsLoading] = useState(true);
  const [ownedNFTs, setOwnedNFTs] = useState<NFT[]>([]);
  const [locallyUnfavorited, setLocallyUnfavorited] = useState<Set<string>>(
    new Set(),
  );

  const account = useActiveAccount();
  const { favorites, removeFromFavorites } = useFavorites();

  // Respect external tab params ("owned" or "favorites")
  useEffect(() => {
    if (tabParam && (tabParam === "owned" || tabParam === "favorites")) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Persist reference for clean unmount handling
  const locallyUnfavoritedRef = useRef(locallyUnfavorited);
  useEffect(() => {
    locallyUnfavoritedRef.current = locallyUnfavorited;
  }, [locallyUnfavorited]);
  useEffect(() => {
    return () => {
      locallyUnfavoritedRef.current.forEach((tokenId) => {
        removeFromFavorites(tokenId);
      });
    };
  }, [removeFromFavorites]);

  // Helper function to load and process owned NFTs
  const loadOwnedNFTs = async (accountAddress: string, allMetadata: any[]): Promise<NFT[]> => {
    const contract = getContract({
      client,
      chain: base,
      address: process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS!,
    });
    const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS?.toLowerCase();
    const ownedNFTsList: NFT[] = [];
    
    try {
      // Get all NFTs owned by the user using Thirdweb SDK
      const ownedNFTs = await getOwnedNFTs({
        contract,
        owner: accountAddress,
      });

      // Filter to only NFTs from our collection and process them
      for (const nft of ownedNFTs) {
        const nftContract = (nft.tokenAddress || "").toLowerCase();
        if (CONTRACT_ADDRESS && nftContract === CONTRACT_ADDRESS) {
          // Extract tokenId from the NFT
          const tokenIdStr = nft.id?.toString() || "";
          const tokenId = parseInt(tokenIdStr);
          
          if (
            !isNaN(tokenId) &&
            tokenId >= 0 &&
            tokenId < allMetadata.length
          ) {
            const meta = allMetadata[tokenId];
            if (meta) {
              const mediaUrl = meta?.merged_data?.media_url || meta?.image;
              const imageUrl = convertIpfsUrl(mediaUrl);
              ownedNFTsList.push({
                id: (tokenId + 1).toString(),
                tokenId: tokenId.toString(),
                name: meta?.name || `Satoshe Slugger #${tokenId + 1}`,
                image: imageUrl || "/nfts/placeholder-nft.webp",
                rarity: meta?.rarity_tier || "Unknown",
              });
            }
          }
        }
      }
    } catch {
      // If getOwnedNFTs fails, return empty list
      // Error is handled gracefully
    }
    
    return ownedNFTsList;
  };

  // Main effect: load user's NFTs using Thirdweb SDK
  useEffect(() => {
    let cancelled = false;

    const loadUserData = async () => {
      if (!account?.address) {
        if (!cancelled) {
          setOwnedNFTs([]);
          setIsLoading(false);
        }
        return;
      }
      setIsLoading(true);

      try {
        const allMetadata = await loadAllNFTs();
        if (cancelled) return;

        const ownedNFTsList = await loadOwnedNFTs(account.address, allMetadata);
        if (cancelled) return;

        if (!cancelled) {
          setOwnedNFTs(ownedNFTsList);
        }
      } catch {
        if (!cancelled) setOwnedNFTs([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadUserData();
    return () => {
      cancelled = true;
    };
  }, [account?.address]);

  // Separate effect: Listen for purchase events and immediately refetch owned NFTs
  useEffect(() => {
    if (!account?.address) return;

    const handlePurchase = async (e: Event) => {
      const custom = e as CustomEvent<{ tokenId: number }>;
      const purchasedTokenId = custom.detail?.tokenId;
      
      if (typeof purchasedTokenId === "number" && !Number.isNaN(purchasedTokenId)) {
        // Wait a moment for the transaction to be indexed, then refetch
        // This ensures we get the latest data from the blockchain
        setTimeout(async () => {
          try {
            const allMetadata = await loadAllNFTs();
            const ownedNFTsList = await loadOwnedNFTs(account.address, allMetadata);
            setOwnedNFTs(ownedNFTsList);
          } catch {
            // Silently fail - the periodic refresh will catch it
          }
        }, 2000); // Wait 2 seconds for transaction to be indexed
      }
    };

    window.addEventListener("nftPurchased", handlePurchase as EventListener);
    return () => {
      window.removeEventListener("nftPurchased", handlePurchase as EventListener);
    };
  }, [account?.address]);

  // If wallet disconnects, push to root
  useEffect(() => {
    if (!account && router) {
      if (
        typeof window !== "undefined" &&
        window.location.pathname === "/my-nfts"
      ) {
        router.push("/");
      }
    }
  }, [account, router]);

  // Local unfavorite (visual only for session)
  const handleUnfavorite = (tokenId: string) => {
    setLocallyUnfavorited((prev) => new Set(prev).add(tokenId));
  };
  const handleRefavorite = (tokenId: string) => {
    setLocallyUnfavorited((prev) => {
      const newSet = new Set(prev);
      newSet.delete(tokenId);
      return newSet;
    });
  };

  // "favorites"/"owned" display tab: always use consistent card navigation
  const getActiveNFTs = () => {
    try {
      if (activeTab === "owned") {
        const safeOwnedNFTs = Array.isArray(ownedNFTs) ? ownedNFTs : [];

        return safeOwnedNFTs.map((nft: NFT) => ({
          // Use 1-based display number (nft.id) for URL, not 0-based tokenId
          id: nft.id || (parseInt(nft.tokenId || "0") + 1).toString(),
          tokenId: nft.tokenId || nft.id,
          name:
            nft.name ||
            `Satoshe Slugger #${parseInt(nft.tokenId || nft.id) + 1}`,
          image: nft.image || "/placeholder-nft.webp",
          price: "0",
          highestBid: "",
          rarity: nft.rarity || "Common",
          isListed: false,
        }));
      } else if (activeTab === "favorites") {
        const safeFavorites = Array.isArray(favorites) ? favorites : [];

        return safeFavorites.map((fav) => ({
          id: (parseInt(fav.tokenId) + 1).toString(),
          tokenId: fav.tokenId,
          name: fav.name,
          image: fav.image,
          price: "0",
          highestBid: "",
          rarity: fav.rarity || "Common",
          isListed: false,
          isLocallyUnfavorited: locallyUnfavorited.has(fav.tokenId),
        }));
      } else {
        return [];
      }
    } catch {
      return [];
    }
  };

  const activeNFTs = getActiveNFTs();

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background text-off-white flex flex-col">
        <Navigation />
        <div className="flex-grow flex justify-center items-center">
          {/* No spinner by design */}
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <div>
      <main
        id="main-content"
        className="min-h-screen bg-background text-off-white flex flex-col pt-24 sm:pt-28"
      >
        <Navigation activePage="my-nfts" />
      <div className="max-w-7xl mx-auto px-6 sm:px-8 md:px-12 lg:px-16 xl:px-20 2xl:px-24 py-8 flex-grow">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">My NFTs</h1>
            <p className="text-neutral-400 text-sm">
              Manage your Satoshe Sluggers collection
            </p>
          </div>
        </div>
        <div className="mb-6">
          <div className="flex border-b border-neutral-700">
            <button
              className={`py-2 px-4 flex items-center gap-2 transition-all group cursor-pointer ${
                activeTab === "favorites"
                  ? "border-b-2 border-brand-pink text-[#FFFBFB] font-medium hover:bg-brand-pink"
                  : "text-neutral-400 hover:text-neutral-300"
              }`}
              onClick={() => setActiveTab("favorites")}
            >
              <Heart
                className={`w-4 h-4 transition-colors ${
                  activeTab === "favorites"
                    ? "fill-brand-pink text-brand-pink group-hover:fill-[#FFFBFB] group-hover:text-[#FFFBFB]"
                    : "group-hover:text-neutral-300"
                }`}
              />
              Favorites ({favorites.length - locallyUnfavorited.size})
            </button>
            <button
              className={`py-2 px-4 flex items-center gap-2 transition-all group cursor-pointer ${
                activeTab === "owned"
                  ? "border-b-2 border-brand-pink text-[#FFFBFB] font-medium hover:bg-brand-pink"
                  : "text-neutral-400 hover:text-neutral-300"
              }`}
              onClick={() => setActiveTab("owned")}
            >
              <Package
                className={`w-4 h-4 transition-colors ${
                  activeTab === "owned"
                    ? "text-brand-pink group-hover:text-[#FFFBFB]"
                    : "group-hover:text-neutral-300"
                }`}
              />
              Owned ({Array.isArray(ownedNFTs) ? ownedNFTs.length : 0})
            </button>
          </div>
        </div>
        {!Array.isArray(activeNFTs) ? (
          <div className="text-center py-20">
            <p className="text-red-400 mb-4">
              Error loading NFTs. Please try refreshing the page.
            </p>
            <Button
              onClick={() => window.location.reload()}
              className="px-6 py-2 border border-brand-pink bg-transparent text-brand-pink font-normal rounded-[2px] hover:!bg-brand-pink hover:!text-off-white transition-all duration-200"
            >
              Refresh Page
            </Button>
          </div>
        ) : activeNFTs.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-neutral-400 mb-4">
              {activeTab === "favorites"
                ? "No favorite NFTs yet."
                : "No NFTs found in this category."}
            </p>
            {(activeTab === "owned" || activeTab === "favorites") && (
              <Button
                onClick={() => router.push("/nfts")}
                className="px-6 py-2 border border-brand-pink bg-transparent text-brand-pink font-normal rounded-sm hover:!bg-brand-pink hover:!text-white transition-all duration-200 !cursor-pointer"
              >
                Browse NFTs
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeNFTs.map((nft) => (
              <div key={nft.id} className="rounded-[2px] overflow-hidden">
                <div
                  className="relative w-full"
                  style={{ aspectRatio: "0.9/1" }}
                >
                  <Link
                    href={`/nft/${nft.id}`}
                    className="w-full h-full flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                  >
                    <Image
                      src={nft.image || "/placeholder-nft.webp"}
                      alt={nft.name}
                      width={250}
                      height={278}
                      className="max-w-full max-h-full object-contain"
                      loading="lazy"
                      unoptimized={Boolean(
                        nft.image &&
                          (nft.image.includes("/ipfs/") ||
                            nft.image.includes("cloudflare-ipfs") ||
                            nft.image.includes("ipfs.io")),
                      )}
                    />
                  </Link>
                </div>
                <div className="px-4 pt-6 pb-4">
                  <div className="flex w-full justify-between items-center mb-4">
                    <span className="text-[17px] font-medium">{nft.name}</span>
                    {activeTab === "favorites" && (
                      <button
                        onClick={() =>
                          (nft as NFT).isLocallyUnfavorited
                            ? handleRefavorite(nft.tokenId)
                            : handleUnfavorite(nft.tokenId)
                        }
                        className="w-6 h-6 flex items-center justify-center hover:bg-transparent transition-colors group cursor-pointer flex-shrink-0"
                        aria-label={
                          (nft as NFT).isLocallyUnfavorited
                            ? "Re-favorite this NFT"
                            : "Remove from favorites"
                        }
                      >
                        <Heart
                          className={`w-4 h-4 transition-colors ${
                            (nft as NFT).isLocallyUnfavorited
                              ? "text-[#FFFBE8] hover:text-[#FF0099]"
                              : "fill-[#FF0099] text-[#FF0099]"
                          }`}
                        />
                      </button>
                    )}
                  </div>
                  {(nft as NFT).isLocallyUnfavorited && (
                    <div className="mb-4">
                      <span className="text-xs text-neutral-500 bg-neutral-800 px-2 py-1 rounded">
                        Unfavorited
                      </span>
                    </div>
                  )}
                  {activeTab === "owned" && (
                    <div className="mt-6">
                      <button
                        onClick={() => router.push(`/nft/${nft.id}`)}
                        className="font-light flex items-center justify-center h-8 w-full rounded border border-brand-pink text-brand-pink bg-transparent hover:!bg-brand-pink hover:!text-off-white focus:outline-none focus:ring-0 focus:border-brand-pink transition-all duration-200 text-fluid-sm"
                        aria-label="View NFT details"
                      >
                        View Details
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </main>
    </div>
  );
}

export default function MyNFTsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen flex-col bg-gradient-to-b from-background to-neutral-950">
          <Navigation />
          <div className="flex-grow flex items-center justify-center">
            {/* No spinner */}
          </div>
          <Footer />
        </main>
      }
    >
      <MyNFTsContent />
    </Suspense>
  );
}
