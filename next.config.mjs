/**
 * Next.js configuration with security headers.
 * Note: CSP is intentionally permissive for third-party scripts (Thirdweb, Termly, analytics)
 * to avoid breaking functionality. We can tighten this iteratively.
 */

const ONE_YEAR = 60 * 60 * 24 * 365;

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self' https://retinaldelights.io https://www.retinaldelights.io https://satoshesluggers.com https://www.satoshesluggers.com",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.thirdweb.com https://*.walletconnect.com https://*.walletconnect.org https://app.termly.io https://*.termly.io https://vitals.vercel-insights.com https://va.vercel-scripts.com https://*.coinbase.com https://retinaldelights.io https://www.retinaldelights.io https://satoshesluggers.com https://www.satoshesluggers.com",
      "style-src 'self' 'unsafe-inline' https://*.thirdweb.com https://*.walletconnect.com https://app.termly.io https://*.termly.io https://retinaldelights.io https://www.retinaldelights.io https://satoshesluggers.com https://www.satoshesluggers.com",
      "img-src 'self' https: data: blob: https://*.imagedelivery.net https://retinaldelights.io https://www.retinaldelights.io https://satoshesluggers.com https://www.satoshesluggers.com",
      "font-src 'self' https: data: https://retinaldelights.io https://www.retinaldelights.io https://satoshesluggers.com https://www.satoshesluggers.com",
      "connect-src 'self' https://*.thirdweb.com https://*.walletconnect.com https://*.walletconnect.org https://rpc.ankr.com https://ipfs.io https://gateway.pinata.cloud https://cloudflare-ipfs.com https://*.imagedelivery.net https://vitals.vercel-insights.com https://va.vercel-scripts.com https://vercel.live https://*.termly.io https://*.coinbase.com https://retinaldelights.io https://www.retinaldelights.io https://satoshesluggers.com https://www.satoshesluggers.com wss:",
      "media-src 'self' https: data: blob: https://retinaldelights.io https://www.retinaldelights.io https://satoshesluggers.com https://www.satoshesluggers.com",
      "frame-src 'self' https://*.thirdweb.com https://*.walletconnect.com https://app.termly.io https://*.termly.io https://retinaldelights.io https://www.retinaldelights.io https://satoshesluggers.com https://www.satoshesluggers.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
  { key: "Strict-Transport-Security", value: `max-age=${ONE_YEAR}; includeSubDomains; preload` },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "autoplay=()",
      "camera=()",
      "clipboard-read=(self)",
      "clipboard-write=(self)",
      "geolocation=()",
      "gyroscope=()",
      "magnetometer=()",
      "microphone=()",
      "payment=()",
      "usb=()",
    ].join(", "),
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ipfs.io',
        port: '',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
        port: '',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: 'cloudflare-ipfs.com',
        port: '',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: 'dweb.link',
        port: '',
        pathname: '/ipfs/**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year
    dangerouslyAllowSVG: true,
    qualities: [75, 85, 100],
  },
  experimental: {
    optimizePackageImports: ['framer-motion', 'lucide-react'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;


