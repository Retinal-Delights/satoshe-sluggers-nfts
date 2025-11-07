// app/layout.tsx
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { ThirdwebProvider } from "thirdweb/react"
import ScrollButtons from "@/components/scroll-buttons"
import TermlyScript from "@/components/termly-script"
import ErrorBoundary from "@/components/error-boundary"

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap"
})

export const metadata: Metadata = {
  title: "Satoshe Sluggers",
  description: "Satoshe Sluggers is a unique women's baseball NFT collection of 7,777 digital sluggers on Base blockchain. Supporting women's sports, the Dow Sports Association, and structural systems for real-world change through Retinal Delights platform.",
  keywords: [
    "NFT", "Satoshe Sluggers", "women's baseball", "women's sports", "baseball NFT", 
    "digital art", "Base blockchain", "cryptocurrency", "web3", "social impact",
    "Dow Sports Association", "Retinal Delights", "structural systems", "women athletes",
    "baseball collection", "NFT marketplace", "digital collectibles", "sports NFT",
    "home run", "grand slam", "base hit", "triple", "double", "ground ball",
    "line drive", "pinch hit", "walk-off", "over-the-fence", "stand-up double"
  ],
  authors: [{ name: "Satoshe Sluggers Team" }],
  creator: "Retinal Delights",
  publisher: "Retinal Delights",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://satoshesluggers.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Satoshe Sluggers",
    description: "A unique women's baseball NFT collection of 7,777 digital sluggers on Base blockchain. Supporting women's sports, the Dow Sports Association, and structural systems for real-world change through Retinal Delights platform.",
    url: 'https://satoshesluggers.com',
    siteName: 'Satoshe Sluggers by Retinal Delights',
    images: [
      {
        url: '/brands/satoshe-sluggers/satoshe-sluggers-home-white.svg',
        width: 1200,
        height: 630,
        alt: 'Satoshe Sluggers - Women\'s Baseball NFT Collection supporting women\'s sports and structural systems',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Satoshe Sluggers",
    description: "A unique women's baseball NFT collection of 7,777 digital sluggers on Base blockchain. Supporting women's sports, the Dow Sports Association, and structural systems for real-world change.",
    images: ['/brands/satoshe-sluggers/satoshe-sluggers-home-white.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  other: {
    'preload': '/brands/satoshe-sluggers/satoshe-sluggers-home-white.svg',
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable} overflow-x-hidden`} suppressHydrationWarning>
      <head>
        {/* Termly CMP: must be first to block unapproved resources */}
        <TermlyScript />
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "CreativeWork",
              "name": "Satoshe Sluggers NFT Collection",
              "description": "A unique women's baseball NFT collection of 7,777 digital sluggers on Base blockchain, supporting women's sports, the Dow Sports Association, and structural systems for real-world change.",
              "creator": {
                "@type": "Organization",
                "name": "Retinal Delights",
                "url": "https://retinaldelights.io"
              },
              "publisher": {
                "@type": "Organization", 
                "name": "Retinal Delights",
                "url": "https://retinaldelights.io"
              },
              "genre": ["NFT", "Digital Art", "Women's Sports", "Baseball", "Blockchain"],
              "keywords": [
                "women's baseball", "women's sports", "baseball NFT", "digital collectibles",
                "Dow Sports Association", "structural systems", "Retinal Delights",
                "home run", "grand slam", "base hit", "triple", "double", "ground ball"
              ],
              "about": [
                {
                  "@type": "Thing",
                  "name": "Women's Baseball",
                  "description": "Supporting women's participation in baseball and sports"
                },
                {
                  "@type": "Thing", 
                  "name": "Dow Sports Association",
                  "description": "Organization supporting women's sports development"
                },
                {
                  "@type": "Thing",
                  "name": "Structural Systems", 
                  "description": "Systems and infrastructure for real-world change"
                }
              ],
              "offers": {
                "@type": "Offer",
                "priceCurrency": "ETH",
                "availability": "https://schema.org/InStock",
                "description": "NFT collection with baseball-themed rarity tiers"
              }
            })
          }}
        />
      </head>
      <body className="font-sans" suppressHydrationWarning>
        {/* Skip Navigation Links */}
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-brand-pink text-white px-4 py-2 rounded-sm z-50"
        >
          Skip to main content
        </a>
        <a 
          href="#navigation" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-32 bg-brand-pink text-white px-4 py-2 rounded-sm z-50"
        >
          Skip to navigation
        </a>
        
        <ErrorBoundary>
          <ThirdwebProvider>
            {children}
            <ScrollButtons />
          </ThirdwebProvider>
          <Analytics />
          <SpeedInsights />
          
          {/* Live region for screen reader announcements */}
          <div
            id="live-region"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
            role="status"
          />
        </ErrorBoundary>
      </body>
    </html>
  )
}
