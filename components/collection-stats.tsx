// components/collection-stats.tsx
import { TOTAL_COLLECTION_SIZE } from "@/lib/contracts";

export default function CollectionStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 lg:gap-6">
      <div className="bg-card px-4 py-2 md:py-2.5 lg:px-6 lg:py-4 rounded-[2px] border border-neutral-700 shadow-sm text-center min-w-0">
        <h3 className="text-neutral-400 mb-1 whitespace-nowrap text-body-xs sm:text-body-sm">Total Supply</h3>
        <p className="font-bold whitespace-nowrap text-h3 sm:text-h2 lg:text-h1">{TOTAL_COLLECTION_SIZE}</p>
      </div>
      <div className="bg-card px-4 py-2 md:py-2.5 lg:px-6 lg:py-4 rounded-[2px] border border-neutral-700 shadow-sm text-center min-w-0">
        <h3 className="text-neutral-400 mb-1 whitespace-nowrap text-body-xs sm:text-body-sm">Edition</h3>
        <p className="font-bold text-off-white whitespace-nowrap text-h3 sm:text-h2 lg:text-h1">1</p>
      </div>
      <div className="bg-card px-4 py-2 md:py-2.5 lg:px-6 lg:py-4 rounded-[2px] border border-neutral-700 shadow-sm text-center min-w-0">
        <h3 className="text-neutral-400 mb-1 whitespace-nowrap text-body-xs sm:text-body-sm">Rarity Tiers</h3>
        <p className="font-bold whitespace-nowrap text-h3 sm:text-h2 lg:text-h1">11</p>
      </div>
    </div>
  )
}

