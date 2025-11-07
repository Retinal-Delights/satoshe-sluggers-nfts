// components/collection-stats.tsx
import { TOTAL_COLLECTION_SIZE } from "@/lib/contracts";

export default function CollectionStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
      <div className="bg-card px-4 py-3 lg:px-6 lg:py-4 rounded border border-neutral-700 shadow-sm text-center min-w-0">
        <h3 className="text-neutral-400 mb-1 whitespace-nowrap text-xs sm:text-sm">Total Supply</h3>
        <p className="font-bold whitespace-nowrap text-xl sm:text-2xl lg:text-3xl">{TOTAL_COLLECTION_SIZE}</p>
      </div>
      <div className="bg-card px-4 py-3 lg:px-6 lg:py-4 rounded border border-neutral-700 shadow-sm text-center min-w-0">
        <h3 className="text-neutral-400 mb-1 whitespace-nowrap text-xs sm:text-sm">Edition</h3>
        <p className="font-bold text-off-white whitespace-nowrap text-xl sm:text-2xl lg:text-3xl">1</p>
      </div>
      <div className="bg-card px-4 py-3 lg:px-6 lg:py-4 rounded border border-neutral-700 shadow-sm text-center min-w-0">
        <h3 className="text-neutral-400 mb-1 whitespace-nowrap text-xs sm:text-sm">Rarity Tiers</h3>
        <p className="font-bold whitespace-nowrap text-xl sm:text-2xl lg:text-3xl">11</p>
      </div>
    </div>
  )
}

