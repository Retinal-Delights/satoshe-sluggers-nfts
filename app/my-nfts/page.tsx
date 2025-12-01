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
import { getContract, readContract } from "thirdweb";
import { base } from "thirdweb/chains";
import { client } from "@/lib/thirdweb";
import { TOTAL_COLLECTION_SIZE } from "@/lib/contracts";
import { loadAllNFTs } from "@/lib/simple-data-service";
import { convertIpfsUrl } from "@/lib/utils";
import { rpcRateLimiter } from "@/lib/rpc-rate-limiter";

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

  // Main effect: load user's NFTs (Insight API, fallback to slow on-chain scan)
  useEffect(() => {
    let cancelled = false;
    let purchaseHandler: ((e: Event) => void) | null = null;

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
        const userAddress = account.address.toLowerCase();
        const contract = getContract({
          client,
          chain: base,
          address: process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS!,
        });
        const allMetadata = await loadAllNFTs();
        if (cancelled) return;

        // Insight owner API (fast path)
        const INSIGHT_CLIENT_ID =
          process.env.NEXT_PUBLIC_INSIGHT_CLIENT_ID ||
          process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;
        const CHAIN_ID = 8453;
        const resp = await fetch(
          `https://insight.thirdweb.com/v1/tokens/erc721/${userAddress}?chain=${CHAIN_ID}`,
          {
            headers: {
              "x-client-id": INSIGHT_CLIENT_ID || "",
              "Content-Type": "application/json",
            },
          },
        );
        const ownedNFTsList: NFT[] = [];
        if (cancelled) return;

        if (resp.ok) {
          const data = await resp.json();
          const CONTRACT_ADDRESS =
            process.env.NEXT_PUBLIC_NFT_COLLECTION_ADDRESS?.toLowerCase();
          if (data.data && Array.isArray(data.data)) {
            for (const nft of data.data) {
              const nftContract = (
                nft.contract_address ||
                nft.contractAddress ||
                ""
              ).toLowerCase();
              if (CONTRACT_ADDRESS && nftContract === CONTRACT_ADDRESS) {
                const tokenId = parseInt(nft.tokenId || nft.token_id || "0");
                if (
                  !isNaN(tokenId) &&
                  tokenId >= 0 &&
                  tokenId < allMetadata.length
                ) {
                  const meta = allMetadata[tokenId];
                  if (meta) {
                    const mediaUrl =
                      meta?.merged_data?.media_url || meta?.image;
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
          }
        } else {
          // Fallback: crawl each token (slow)
          const batchSize = 10;
          const tokenIdsToCheck = Array.from(
            { length: Math.min(TOTAL_COLLECTION_SIZE, allMetadata.length) },
            (_, idx) => idx,
          );
          for (
            let i = 0;
            i < tokenIdsToCheck.length && !cancelled;
            i += batchSize
          ) {
            const batch = tokenIdsToCheck.slice(i, i + batchSize);

            const calls = batch.map((tokenIdNum) => async () => {
              const tokenId = BigInt(tokenIdNum);
              const owner = await rpcRateLimiter.execute(async () => {
                return (await readContract({
                  contract,
                  method:
                    "function ownerOf(uint256 tokenId) view returns (address)",
                  params: [tokenId],
                })) as string;
              });
              return {
                tokenId: tokenIdNum,
                owner: (owner as string).toLowerCase(),
              };
            });

            const results = await rpcRateLimiter.executeBatch(calls, 5);
            if (cancelled) break;

            results.forEach((result) => {
              if (
                result &&
                typeof result === "object" &&
                "tokenId" in result &&
                "owner" in result
              ) {
                const { tokenId: tokenIdNum, owner } = result as {
                  tokenId: number;
                  owner: string;
                };
                if (owner === userAddress) {
                  const meta = allMetadata[tokenIdNum];
                  const mediaUrl = meta?.merged_data?.media_url || meta?.image;
                  const imageUrl = convertIpfsUrl(mediaUrl);
                  ownedNFTsList.push({
                    id: (tokenIdNum + 1).toString(),
                    tokenId: tokenIdNum.toString(),
                    name: meta?.name || `Satoshe Slugger #${tokenIdNum + 1}`,
                    image: imageUrl || "/nfts/placeholder-nft.webp",
                    rarity: meta?.rarity_tier || "Unknown",
                  });
                }
              }
            });

            if (
              i + batchSize <
                Math.min(TOTAL_COLLECTION_SIZE, allMetadata.length) &&
              !cancelled
            ) {
              await new Promise((resolve) => setTimeout(resolve, 50));
            }
          }
        }

        if (!cancelled) {
          setOwnedNFTs(ownedNFTsList);
          // Listen for direct purchase events so newly acquired NFTs appear immediately in list.
          purchaseHandler = (e: Event) => {
            const custom = e as CustomEvent<{ tokenId: number }>;
            const t = custom.detail?.tokenId;
            if (typeof t === "number" && !Number.isNaN(t) && !cancelled) {
              const idStr = (t + 1).toString();
              setOwnedNFTs((prev) => {
                if (prev.some((n) => n.id === idStr)) return prev;
                const meta = allMetadata[t];
                const mediaUrl = meta?.merged_data?.media_url || meta?.image;
                const imageUrl = convertIpfsUrl(mediaUrl);
                return [
                  {
                    id: idStr,
                    tokenId: t.toString(),
                    name: meta?.name || `Satoshe Slugger #${t + 1}`,
                    image: imageUrl || "/nfts/placeholder-nft.webp",
                    rarity: meta?.rarity_tier || "Unknown",
                  },
                  ...prev,
                ];
              });
            }
          };
          window.addEventListener(
            "nftPurchased",
            purchaseHandler as EventListener,
          );
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
      if (purchaseHandler)
        window.removeEventListener(
          "nftPurchased",
          purchaseHandler as EventListener,
        );
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
              className={`py-2 px-4 flex items-center gap-2 ${activeTab === "favorites" ? "border-b-2 border-brand-pink text-offwhite font-medium" : "text-neutral-400 hover:text-offwhite"}`}
              onClick={() => setActiveTab("favorites")}
            >
              <Heart
                className={`w-4 h-4 ${activeTab === "favorites" ? "fill-brand-pink text-brand-pink" : ""}`}
              />
              Favorites ({favorites.length - locallyUnfavorited.size})
            </button>
            <button
              className={`py-2 px-4 flex items-center gap-2 ${activeTab === "owned" ? "border-b-2 border-brand-pink text-offwhite font-medium" : "text-neutral-400 hover:text-offwhite"}`}
              onClick={() => setActiveTab("owned")}
            >
              <Package
                className={`w-4 h-4 ${activeTab === "owned" ? "text-brand-pink" : ""}`}
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
              className="px-6 py-2 border border-brand-pink bg-transparent text-brand-pink font-normal rounded-sm hover:!bg-brand-pink hover:!text-off-white transition-all duration-200"
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
              <div key={nft.id} className="rounded-md overflow-hidden">
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
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-base flex-1">{nft.name}</h3>
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
                    <div className="mb-3">
                      <span className="text-xs text-neutral-500 bg-neutral-800 px-2 py-1 rounded">
                        Unfavorited
                      </span>
                    </div>
                  )}
                  {activeTab === "owned" && (
                    <button
                      onClick={() => router.push(`/nft/${nft.id}`)}
                      className="font-light flex items-center justify-center h-8 w-full rounded border border-brand-pink text-brand-pink bg-transparent hover:!bg-brand-pink hover:!text-off-white focus:outline-none focus:ring-0 focus:border-brand-pink transition-all duration-200 text-fluid-sm"
                      aria-label="View NFT details"
                    >
                      View Details
                    </button>
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
