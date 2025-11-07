// lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function to merge Tailwind CSS classes with clsx
 * Combines multiple class values and resolves conflicts using tailwind-merge
 * @param inputs - Variable number of class values (strings, objects, arrays, etc.)
 * @returns Merged class string with Tailwind conflicts resolved
 * @example
 * cn("px-2 py-1", "px-4") // Returns "py-1 px-4" (px-2 overridden by px-4)
 * cn({ "bg-red": true, "bg-blue": false }) // Returns "bg-red"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert IPFS URLs to HTTP URLs for Next.js Image component
 * Uses dweb.link gateway (IPFS distributed web) for better reliability and faster response times
 * @param url - The URL to convert (can be IPFS or HTTP)
 * @returns HTTP URL that can be used with Next.js Image component
 */
export function convertIpfsUrl(url: string | undefined | null): string {
  if (!url) return "/nfts/placeholder-nft.webp";
  
  // Already an HTTP/HTTPS URL - convert problematic gateways to dweb.link
  if (url.startsWith('https://ipfs.io/ipfs/')) {
    // Replace ipfs.io with dweb.link for better reliability
    return url.replace('https://ipfs.io/ipfs/', 'https://dweb.link/ipfs/');
  }
  
  // Convert cloudflare-ipfs.com to dweb.link (cloudflare-ipfs.com has DNS issues)
  if (url.startsWith('https://cloudflare-ipfs.com/ipfs/')) {
    return url.replace('https://cloudflare-ipfs.com/ipfs/', 'https://dweb.link/ipfs/');
  }
  
  // Already an HTTP/HTTPS URL, return as-is (if already dweb.link or other working gateway)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Convert IPFS protocol URL to HTTP gateway URL
  if (url.startsWith('ipfs://')) {
    // Use dweb.link gateway (distributed web) for better reliability
    // Replace ipfs:// with https://dweb.link/ipfs/
    // This preserves the CID and any path (e.g., /0.webp)
    return url.replace('ipfs://', 'https://dweb.link/ipfs/');
  }
  
  // Fallback to placeholder if we don't recognize the format
  return "/nfts/placeholder-nft.webp";
}