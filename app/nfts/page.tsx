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
      // SECURITY: Sanitize URL parameters to prevent injection
      const urlSearchTerm = (searchParams.get('search') || "").slice(0, 200) // Limit length
      const urlSearchModeRaw = searchParams.get('mode')
      const urlSearchMode = (urlSearchModeRaw === "exact" ? "exact" : "contains") // Whitelist only
      const urlSortByRaw = searchParams.get('sortBy')
      // SECURITY: Whitelist allowed sort values
      const allowedSorts = ["default", "price-asc", "price-desc", "rarity-asc", "rarity-desc", "rank-asc", "rank-desc", "sold-recent", "favorites"]
      const urlSortBy: string = allowedSorts.includes(urlSortByRaw || "") ? (urlSortByRaw || "default") : "default"
      
      const urlItemsPerPage = searchParams.get('itemsPerPage')
      // SECURITY: Validate itemsPerPage - only allow whitelisted values
      const allowedItemsPerPage = [10, 25, 50, 100]
      const itemsPerPageNum = urlItemsPerPage && allowedItemsPerPage.includes(parseInt(urlItemsPerPage, 10)) 
        ? parseInt(urlItemsPerPage, 10) 
        : 25
      
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
      
      // SECURITY: Sanitize filter values from URL
      // Handle simple array filters
      simpleFilterKeys.forEach(key => {
        const value = searchParams.get(key)
        if (value) {
          try {
            // SECURITY: Limit value length and validate it's an array
            const decoded = decodeURIComponent(value.slice(0, 1000)) // Limit length
            const parsed: unknown = JSON.parse(decoded)
            // SECURITY: Only accept arrays of strings
            if (Array.isArray(parsed) && parsed.every((item: unknown) => typeof item === 'string')) {
              // SECURITY: Sanitize each string in array (limit length, remove dangerous chars)
              const stringArray: string[] = parsed as string[]
              const sanitizedArray: string[] = []
              for (const item of stringArray) {
                const str = String(item)
                sanitizedArray.push(str.slice(0, 100).replace(/[<>{}[\]();'":\\\/]/g, ''))
              }
              (urlFilters as Record<string, unknown>)[key] = sanitizedArray
            }
          } catch {
            // SECURITY: If parsing fails, treat as single value but sanitize it
            const sanitized = String(value).slice(0, 100).replace(/[<>{}[\]();'":\\\/]/g, '')
            if (sanitized) {
              (urlFilters as Record<string, unknown>)[key] = [sanitized]
            }
          }
        }
      })
      
      // SECURITY: Sanitize nested object filters (hair, headwear)
      nestedFilterKeys.forEach(key => {
        const value = searchParams.get(key)
        if (value) {
          try {
            // SECURITY: Limit value length and validate structure
            const decoded = decodeURIComponent(value.slice(0, 2000)) // Limit length
            const parsed = JSON.parse(decoded)
            // SECURITY: Only accept objects with string array values
            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
              const sanitized: Record<string, string[]> = {}
              for (const [subKey, subValue] of Object.entries(parsed)) {
                if (typeof subKey === 'string' && Array.isArray(subValue) && subValue.every((item: unknown) => typeof item === 'string')) {
                  const sanitizedKey = subKey.slice(0, 50).replace(/[^a-zA-Z0-9_-]/g, '')
                  const sanitizedValues = subValue.map((item: string) => String(item).slice(0, 100).replace(/[<>{}[\]();'":\\\/]/g, ''))
                  if (sanitizedKey && sanitizedValues.length > 0) {
                    sanitized[sanitizedKey] = sanitizedValues
                  }
                }
              }
              if (Object.keys(sanitized).length > 0) {
                (urlFilters as Record<string, unknown>)[key] = sanitized
              }
            }
          } catch {
            // SECURITY: If parsing fails, skip this filter (fail-secure)
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
        <div className="w-full px-6 xxs:px-6 sm:px-8 md:px-12 lg:px-12 xl:px-12 2xl:px-16">
        <Navigation activePage="nfts" />

      <section className="w-full py-6 sm:py-8 lg:py-10">
        {/* Consistent container for all content sections */}
        <div className="w-full max-w-[1650px] 2xl:max-w-[2000px] 4xl:max-w-[2400px] mx-auto px-6 sm:px-6 md:px-8 lg:px-4 xl:px-4 2xl:px-4 3xl:px-4 4xl:px-4">
          <div className="mb-8 lg:mb-12">
            <h1 id="collection-heading" className="text-[clamp(32px,4vw+12px,79px)] font-extrabold tracking-tighter text-center pb-2 leading-[0.9] sm:leading-tight">
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
            <Drawer direction="left" open={drawerOpen} onOpenChange={setDrawerOpen} shouldScaleBackground={false}>
              <DrawerTrigger asChild>
                <button className="hidden" aria-hidden="true" />
              </DrawerTrigger>
              <DrawerContent className="h-full w-[85vw] max-w-[400px] bg-neutral-900 border-r border-neutral-700 left-0 top-0 bottom-0">
                <DrawerHeader className="flex flex-row items-center justify-between border-b border-neutral-700 pb-4">
                  <DrawerTitle className="text-h3 font-normal text-off-white">Filters</DrawerTitle>
                  <DrawerClose asChild>
                    <button className="text-[#ff0099] hover:text-[#ff0099]/80 transition-colors p-1 cursor-pointer" aria-label="Close filters">
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
                  filtersButton={
                    <div className="xl:hidden">
                      <button 
                        onClick={() => setDrawerOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#ff0099] hover:bg-[#ff0099]/90 text-white rounded-[2px] transition-colors font-medium text-body-sm cursor-pointer"
                      >
                        <Filter className="w-4 h-4" />
                        Filters
                      </button>
                    </div>
                  }
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

