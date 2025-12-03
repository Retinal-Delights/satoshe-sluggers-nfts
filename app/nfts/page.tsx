// app/nfts/page.tsx
"use client"
import NFTGrid from "@/components/nft-grid"
import CollectionStats from "@/components/collection-stats"
import Footer from "@/components/footer"
import Navigation from "@/components/navigation"
import NFTSidebar from "@/components/nft-sidebar"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose, DrawerTrigger } from "@/components/ui/drawer"
import { Filter, X } from "lucide-react"

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
  const [isInitialized, setIsInitialized] = useState(false)
  const [listingStatus, setListingStatus] = useState<{
    live: boolean;
    sold: boolean;
    secondary: boolean;
  }>({
    live: true, // Default to showing all listing statuses
    sold: true,
    secondary: false,
  })
  const [sortBy, setSortBy] = useState("default")
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Initialize state from URL parameters
  useEffect(() => {
    if (!isInitialized) {
      const urlSearchTerm = searchParams.get('search') || ""
      const urlSearchMode = (searchParams.get('mode') as "contains" | "exact") || "contains"
      const urlSortBy = searchParams.get('sortBy') || "default"
      const urlItemsPerPage = searchParams.get('itemsPerPage')
      const itemsPerPageNum = urlItemsPerPage ? parseInt(urlItemsPerPage, 10) : 25
      
      // Parse listing status from URL
      const urlListingStatus = {
        live: searchParams.get('live') !== 'false', // Default to true
        sold: searchParams.get('sold') !== 'false', // Default to true
        secondary: searchParams.get('secondary') === 'true', // Default to false
      }
      
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
      setSortBy(urlSortBy)
      setItemsPerPage(itemsPerPageNum)
      setListingStatus(urlListingStatus)
      setIsInitialized(true)
    }
  }, [searchParams, isInitialized])

  // Update URL when state changes
  useEffect(() => {
    if (isInitialized) {
      const params = new URLSearchParams()
      
      if (searchTerm) params.set('search', searchTerm)
      if (searchMode !== 'contains') params.set('mode', searchMode)
      if (sortBy !== 'default') params.set('sortBy', sortBy)
      if (itemsPerPage !== 25) params.set('itemsPerPage', itemsPerPage.toString())
      if (!listingStatus.live) params.set('live', 'false')
      if (!listingStatus.sold) params.set('sold', 'false')
      if (listingStatus.secondary) params.set('secondary', 'true')
      
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
  }, [searchTerm, searchMode, selectedFilters, sortBy, itemsPerPage, listingStatus, isInitialized, router])

  return (
    <div>
      <main id="main-content" className="min-h-screen bg-background text-off-white pt-24 sm:pt-28 w-full max-w-full">
        <div className="w-full px-6 sm:px-8 md:px-12 lg:px-16 xl:px-20 2xl:px-24">
        <Navigation activePage="nfts" />

      <section className="w-full py-6 sm:py-8 lg:py-10">
        {/* Consistent container for all content sections */}
        <div className="w-full max-w-[1650px] mx-auto px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
          <div className="mb-8 lg:mb-12">
            <h1 id="collection-heading" className="text-6xl md:text-7xl font-extrabold tracking-tight text-center pb-2">
              SATO<span className="text-brand-pink">SHE</span> SLUGGERS
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 md:gap-3 text-body-lg text-neutral-300 max-w-4xl mx-auto tracking-tight mt-2">
              <span>/ <span className="text-brand-pink">SHE</span> hits different</span>
              <span>/ <span className="text-brand-pink">SHE</span> funds women&apos;s baseball</span>
              <span>/ <span className="text-brand-pink">SHE</span> makes a difference</span>
            </div>
          </div>

          <div className="mb-8 lg:mb-12">
            <CollectionStats />
          </div>

          <div className="flex flex-col xl:flex-row gap-6 lg:gap-8" suppressHydrationWarning>
            {/* Desktop Sidebar - Hidden on mobile/tablet */}
            <div className="hidden xl:block xl:sticky xl:top-[112px] xl:self-start z-10 w-full xl:w-[21rem] 2xl:w-[28rem]">
              <NFTSidebar
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                searchMode={searchMode}
                setSearchMode={setSearchMode}
                selectedFilters={selectedFilters}
                setSelectedFilters={setSelectedFilters}
                traitCounts={traitCounts}
                listingStatus={listingStatus}
                setListingStatus={setListingStatus}
              />
            </div>

            {/* Mobile/Tablet Drawer */}
            <div className="xl:hidden mb-4">
              <Drawer direction="left" open={drawerOpen} onOpenChange={setDrawerOpen} shouldScaleBackground={false}>
                <DrawerTrigger asChild>
                  <button className="flex items-center gap-2 px-4 py-2 bg-[#ff0099] hover:bg-[#ff0099]/90 text-white rounded-[2px] transition-colors font-medium text-body-sm">
                    <Filter className="w-4 h-4" />
                    Filters
                  </button>
                </DrawerTrigger>
                <DrawerContent className="h-full w-[85vw] max-w-[400px] bg-neutral-900 border-r border-neutral-700 left-0 top-0 bottom-0">
                  <DrawerHeader className="flex flex-row items-center justify-between border-b border-neutral-700 pb-4">
                    <DrawerTitle className="text-h3 font-semibold text-off-white">Filters</DrawerTitle>
                    <DrawerClose asChild>
                      <button className="text-[#ff0099] hover:text-[#ff0099]/80 transition-colors p-1" aria-label="Close filters">
                        <X className="w-5 h-5" />
                      </button>
                    </DrawerClose>
                  </DrawerHeader>
                  <div className="overflow-y-auto flex-1 p-4">
                    <NFTSidebar
                      searchTerm={searchTerm}
                      setSearchTerm={setSearchTerm}
                      searchMode={searchMode}
                      setSearchMode={setSearchMode}
                      selectedFilters={selectedFilters}
                      setSelectedFilters={setSelectedFilters}
                      traitCounts={traitCounts}
                      listingStatus={listingStatus}
                      setListingStatus={setListingStatus}
                    />
                  </div>
                </DrawerContent>
              </Drawer>
            </div>

            <div className="w-full">
              {isInitialized ? (
                <NFTGrid
                  searchTerm={searchTerm}
                  searchMode={searchMode}
                  selectedFilters={selectedFilters}
                  listingStatus={listingStatus}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  itemsPerPage={itemsPerPage}
                  setItemsPerPage={setItemsPerPage}
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
        </div>
      </section>

      <Footer />
        </div>
    </main>
    </div>
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

