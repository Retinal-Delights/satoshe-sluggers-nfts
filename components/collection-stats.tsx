// components/collection-stats.tsx
import { TOTAL_COLLECTION_SIZE } from "@/lib/contracts";

export default function CollectionStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
      <div className="bg-card px-4 py-3 lg:px-6 lg:py-4 rounded border border-neutral-700 shadow-sm text-center min-w-0">
        <h3 className="text-neutral-400 mb-1 whitespace-nowrap" style={{ fontSize: 'clamp(0.75rem, 0.5vw, 0.9rem)' }}>Total Supply</h3>
        <p className="font-bold whitespace-nowrap" style={{ fontSize: 'clamp(1rem, 0.8vw, 1.3rem)' }}>{TOTAL_COLLECTION_SIZE}</p>
      </div>
      <div className="bg-card px-4 py-3 lg:px-6 lg:py-4 rounded border border-neutral-700 shadow-sm text-center min-w-0">
        <h3 className="text-neutral-400 mb-1 whitespace-nowrap" style={{ fontSize: 'clamp(0.75rem, 0.5vw, 0.9rem)' }}>Edition</h3>
        <p className="font-bold text-offwhite whitespace-nowrap" style={{ fontSize: 'clamp(1rem, 0.8vw, 1.3rem)' }}>1</p>
      </div>
      <div className="bg-card px-4 py-3 lg:px-6 lg:py-4 rounded border border-neutral-700 shadow-sm text-center min-w-0">
        <h3 className="text-neutral-400 mb-1 whitespace-nowrap" style={{ fontSize: 'clamp(0.75rem, 0.5vw, 0.9rem)' }}>Rarity Tiers</h3>
        <p className="font-bold whitespace-nowrap" style={{ fontSize: 'clamp(1rem, 0.8vw, 1.3rem)' }}>11</p>
      </div>
    </div>
  )
}

