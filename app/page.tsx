// app/page.tsx
"use client"

import Header80 from "@/components/header-80"
import Footer from "@/components/footer"
import Navigation from "@/components/navigation"
import Head from "next/head"

export default function HomePage() {
  return (
    <>
      <Head>
        {/* Critical LCP image preload with highest priority - using optimized SVG */}
        <link
          rel="preload"
          as="image"
          href="/brands/satoshe-sluggers/satoshe-sluggers-off-white-op.svg"
          type="image/svg+xml"
          fetchPriority="high"
        />
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        {/* Preconnect to critical origins */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </Head>
      <main id="main-content" className="min-h-screen bg-background text-off-white">
        <Navigation activePage="home" />
        <Header80 />
        <Footer />
      </main>
    </>
  )
}