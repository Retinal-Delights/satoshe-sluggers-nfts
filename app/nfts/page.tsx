// app/nfts/page.tsx
"use client"
import NFTGrid from "@/components/nft-grid"
import CollectionStats from "@/components/collection-stats"
import Footer from "@/components/footer"
import Navigation from "@/components/navigation"
import NFTSidebar from "@/components/nft-sidebar"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

function NFTsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [searchMode, setSearchMode] = useState<"contains" | "exact">("contains")
  const [selectedFilters, setSelectedFilters] = useState<{
    rarity?: string[];
    background?: string[];
    skinTone?: string[];
    shirt?: string[];
    hair?: Record<string, string[]>;
    headwear?: Record<string, string[]>;
    eyewear?: string[];
  }>({})
  const [traitCounts, setTraitCounts] = useState<Record<string, Record<string, number>>>({})
  const [showLive, setShowLive] = useState(true)
  const [showSold, setShowSold] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize state from URL parameters
  useEffect(() => {
    if (!isInitialized) {
      const urlSearchTerm = searchParams.get('search') || ""
      const urlSearchMode = (searchParams.get('mode') as "contains" | "exact") || "contains"
      
      // Parse filters from URL
          const urlFilters: {
            rarity?: string[];
            background?: string[];
            skinTone?: string[];
            shirt?: string[];
            hair?: Record<string, string[]>;
            headwear?: Record<string, string[]>;
            eyewear?: string[];
          } = {}
      const simpleFilterKeys = ['rarity', 'background', 'skinTone', 'shirt', 'eyewear']
      const nestedFilterKeys = ['hair', 'headwear']
      
      // Handle simple array filters
      simpleFilterKeys.forEach(key => {
        const value = searchParams.get(key)
        if (value) {
          try {
            (urlFilters as Record<string, unknown>)[key] = JSON.parse(decodeURIComponent(value))
          } catch {
            // If parsing fails, treat as single value
            (urlFilters as Record<string, unknown>)[key] = [value]
          }
        }
      })
      
      // Handle nested object filters (hair, headwear)
      nestedFilterKeys.forEach(key => {
        const value = searchParams.get(key)
        if (value) {
          try {
            (urlFilters as Record<string, unknown>)[key] = JSON.parse(decodeURIComponent(value))
          } catch {
            // If parsing fails, skip this filter (invalid URL parameter)
          }
        }
      })
      
      setSearchTerm(urlSearchTerm)
      setSearchMode(urlSearchMode)
      setSelectedFilters(urlFilters)
      setIsInitialized(true)
    }
  }, [searchParams, isInitialized])

  // Update URL when state changes
  useEffect(() => {
    if (isInitialized) {
      const params = new URLSearchParams()
      
      if (searchTerm) params.set('search', searchTerm)
      if (searchMode !== 'contains') params.set('mode', searchMode)
      
      Object.entries(selectedFilters).forEach(([key, value]) => {
        if (value) {
          if (Array.isArray(value) && value.length > 0) {
            // Simple array filters - URLSearchParams.set() already encodes, so no need for encodeURIComponent
            params.set(key, JSON.stringify(value))
          } else if (typeof value === 'object' && value !== null) {
            // Nested object filters (hair, headwear)
            const hasValues = Object.values(value).some((arr: unknown) => Array.isArray(arr) && arr.length > 0)
            if (hasValues) {
              // URLSearchParams.set() already encodes, so no need for encodeURIComponent
              params.set(key, JSON.stringify(value))
            }
          }
        }
      })
      
      const newUrl = params.toString() ? `?${params.toString()}` : '/nfts'
      router.replace(newUrl, { scroll: false })
    }
  }, [searchTerm, searchMode, selectedFilters, isInitialized, router])

  return (
    <main id="main-content" className="min-h-screen bg-background text-off-white pt-24 sm:pt-28 overflow-x-hidden w-full max-w-full">
      <Navigation activePage="nfts" />

      <section className="w-full max-w-full mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 2xl:px-20 py-6 sm:py-8 lg:py-10">
        <div className="mb-8 lg:mb-12">
          <h1 id="collection-heading" className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-center mb-3 text-off-white tracking-tight">
            SATO<span className="text-brand-pink">SHE</span> SLUGGERS
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 md:gap-6 text-sm sm:text-base md:text-lg lg:text-xl text-neutral-300 max-w-4xl mx-auto tracking-tight">
            <span>/ <span className="text-brand-pink">SHE</span> hits different</span>
            <span>/ <span className="text-brand-pink">SHE</span> funds women&apos;s baseball</span>
            <span>/ <span className="text-brand-pink">SHE</span> makes a difference</span>
          </div>
        </div>

        <div className="mb-8 lg:mb-12">
          <CollectionStats />
        </div>

        <div className="flex flex-col xl:flex-row gap-6 lg:gap-8" suppressHydrationWarning>
          <div className="xl:sticky xl:top-[112px] xl:self-start z-10 w-full xl:w-[21rem] 2xl:w-[28rem]">
            <NFTSidebar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              searchMode={searchMode}
              setSearchMode={setSearchMode}
              selectedFilters={selectedFilters}
              setSelectedFilters={setSelectedFilters}
              traitCounts={traitCounts}
            />
          </div>
          <div className="flex-1 min-w-0 overflow-x-hidden">
            {isInitialized ? (
              <NFTGrid
                searchTerm={searchTerm}
                searchMode={searchMode}
                selectedFilters={selectedFilters}
                showLive={showLive}
                setShowLive={setShowLive}
                showSold={showSold}
                setShowSold={setShowSold}
                onFilteredCountChange={() => {}} // Empty callback since we don't use the count
                onTraitCountsChange={setTraitCounts} // Pass trait counts to sidebar
              />
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-neutral-400">Loading filters...</div>
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

export default function NFTsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-background text-foreground flex flex-col">
        <Navigation activePage="nfts" />
        <div className="flex-grow flex flex-col items-center justify-center pt-24 sm:pt-28">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-pink mx-auto mb-4"></div>
            <p className="text-neutral-400">Loading NFTs...</p>
          </div>
        </div>
        <Footer />
      </main>
    }>
      <NFTsPageContent />
    </Suspense>
  )
}

