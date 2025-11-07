import { describe, it, expect } from 'vitest'
import { cn, convertIpfsUrl } from '@/lib/utils'

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('px-2', 'py-1')).toBe('px-2 py-1')
    })

    it('should resolve Tailwind conflicts', () => {
      // px-4 should override px-2
      const result = cn('px-2 py-1', 'px-4')
      expect(result).toContain('px-4')
      expect(result).not.toContain('px-2')
    })

    it('should handle conditional classes', () => {
      expect(cn('base-class', false && 'hidden', 'visible')).toBe('base-class visible')
    })
  })

  describe('convertIpfsUrl', () => {
    it('should convert ipfs:// URLs to HTTP', () => {
      const ipfsUrl = 'ipfs://QmTest123/image.webp'
      const result = convertIpfsUrl(ipfsUrl)
      expect(result).toBe('https://dweb.link/ipfs/QmTest123/image.webp')
    })

    it('should replace ipfs.io with dweb.link', () => {
      const ipfsUrl = 'https://ipfs.io/ipfs/QmTest123/image.webp'
      const result = convertIpfsUrl(ipfsUrl)
      expect(result).toBe('https://dweb.link/ipfs/QmTest123/image.webp')
    })

    it('should replace cloudflare-ipfs.com with dweb.link', () => {
      const ipfsUrl = 'https://cloudflare-ipfs.com/ipfs/QmTest123/image.webp'
      const result = convertIpfsUrl(ipfsUrl)
      expect(result).toBe('https://dweb.link/ipfs/QmTest123/image.webp')
    })

    it('should return placeholder for invalid URLs', () => {
      expect(convertIpfsUrl(null)).toBe('/nfts/placeholder-nft.webp')
      expect(convertIpfsUrl(undefined)).toBe('/nfts/placeholder-nft.webp')
      expect(convertIpfsUrl('')).toBe('/nfts/placeholder-nft.webp')
    })

    it('should return HTTP URLs as-is', () => {
      const httpUrl = 'https://example.com/image.webp'
      expect(convertIpfsUrl(httpUrl)).toBe(httpUrl)
    })
  })
})

