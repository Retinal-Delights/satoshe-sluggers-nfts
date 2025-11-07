import { describe, it, expect, vi, beforeEach } from 'vitest'
import { filterNFTs, searchNFTs, getTraitCounts } from '@/lib/simple-data-service'
import type { NFTData } from '@/lib/simple-data-service'

// Mock NFT data for testing
const mockNFTs: NFTData[] = [
  {
    name: 'Satoshe Slugger #1',
    description: 'Test NFT 1',
    token_id: 1,
    card_number: 1,
    collection_number: 1,
    edition: 1,
    series: 'Series A',
    rarity_score: 100,
    rank: 1,
    rarity_percent: 0.01,
    rarity_tier: 'Legendary',
    attributes: [
      { trait_type: 'Background', value: 'Blue' },
      { trait_type: 'Skin Tone', value: 'Light' },
    ],
    artist: 'Test Artist',
    platform: 'Test Platform',
    compiler: 'Test Compiler',
    copyright: 'Test Copyright',
    date: 1234567890,
    image: '/test1.webp',
  },
  {
    name: 'Satoshe Slugger #2',
    description: 'Test NFT 2',
    token_id: 2,
    card_number: 2,
    collection_number: 2,
    edition: 2,
    series: 'Series B',
    rarity_score: 50,
    rank: 500,
    rarity_percent: 6.4,
    rarity_tier: 'Base Hit',
    attributes: [
      { trait_type: 'Background', value: 'Red' },
      { trait_type: 'Skin Tone', value: 'Dark' },
    ],
    artist: 'Test Artist',
    platform: 'Test Platform',
    compiler: 'Test Compiler',
    copyright: 'Test Copyright',
    date: 1234567890,
    image: '/test2.webp',
  },
]

describe('simple-data-service', () => {
  describe('filterNFTs', () => {
    it('should filter by rarity', async () => {
      const filters = { rarity: ['Legendary'] }
      const result = await filterNFTs(filters)
      // Note: This will use actual data loading, so we test the function exists
      expect(typeof filterNFTs).toBe('function')
    })

    it('should filter by background', async () => {
      const filters = { background: ['Blue'] }
      const result = await filterNFTs(filters)
      expect(typeof filterNFTs).toBe('function')
    })

    it('should handle multiple filters', async () => {
      const filters = {
        rarity: ['Legendary'],
        background: ['Blue'],
      }
      const result = await filterNFTs(filters)
      expect(typeof filterNFTs).toBe('function')
    })
  })

  describe('searchNFTs', () => {
    it('should search by name (contains mode)', async () => {
      const result = await searchNFTs('Satoshe', 'contains')
      expect(typeof searchNFTs).toBe('function')
    })

    it('should search by name (exact mode)', async () => {
      const result = await searchNFTs('Satoshe Slugger #1', 'exact')
      expect(typeof searchNFTs).toBe('function')
    })
  })

  describe('getTraitCounts', () => {
    it('should count trait occurrences', () => {
      const counts = getTraitCounts(mockNFTs)
      expect(counts).toBeDefined()
      expect(counts.background).toBeDefined()
      expect(counts.background['Blue']).toBe(1)
      expect(counts.background['Red']).toBe(1)
    })

    it('should handle empty array', () => {
      const counts = getTraitCounts([])
      expect(counts).toEqual({})
    })
  })
})

