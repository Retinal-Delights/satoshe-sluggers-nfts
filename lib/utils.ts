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

/**
 * Suppress expected Insight API 401 errors from Thirdweb SDK
 * The SDK tries Insight API first (deprecated), gets 401, then falls back to RPC automatically
 * This wrapper temporarily suppresses all console methods for these expected errors
 * @param fn - Async function to execute with error suppression
 * @returns Result of the function
 */
export async function suppressInsightApiErrors<T>(fn: () => Promise<T>): Promise<T> {
  // Store original console methods
  const originalError = console.error;
  const originalLog = console.log;
  const originalWarn = console.warn;
  
  // Helper to check if message should be suppressed
  // Handles both string messages and Error objects
  const shouldSuppress = (...args: unknown[]): boolean => {
    const message = args
      .map(arg => {
        if (arg instanceof Error) {
          return `${arg.message} ${arg.stack || ''}`;
        }
        return String(arg);
      })
      .join(' ');
    
    return message.includes('Error fetching from insight') && 
           (message.includes('401 Unauthorized') || 
            message.includes('falling back to rpc') ||
            message.includes('The keys are invalid'));
  };
  
  // Temporarily replace console methods to filter out Insight API 401 errors
  console.error = ((...args: unknown[]) => {
    if (shouldSuppress(...args)) {
      return; // Suppress this specific error - it's expected behavior
    }
    originalError.apply(console, args);
  }) as typeof console.error;
  
  console.log = ((...args: unknown[]) => {
    if (shouldSuppress(...args)) {
      return; // Suppress this specific log - it's expected behavior
    }
    originalLog.apply(console, args);
  }) as typeof console.log;
  
  console.warn = ((...args: unknown[]) => {
    if (shouldSuppress(...args)) {
      return; // Suppress this specific warning - it's expected behavior
    }
    originalWarn.apply(console, args);
  }) as typeof console.warn;
  
  try {
    return await fn();
  } catch (error) {
    // If it's the expected Insight API error, suppress it and let SDK handle fallback
    if (shouldSuppress(error)) {
      // Re-throw but it will be caught by SDK's internal error handling
      // The SDK will automatically fall back to RPC
      throw error;
    }
    // Re-throw other errors
    throw error;
  } finally {
    // Restore original console methods
    console.error = originalError;
    console.log = originalLog;
    console.warn = originalWarn;
  }
}