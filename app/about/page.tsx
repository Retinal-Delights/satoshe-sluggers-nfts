// app/about/page.tsx
"use client"

import Image from "next/image"
import Footer from "@/components/footer"
import Navigation from "@/components/navigation"
import PageTransition from "@/components/page-transition"

export default function AboutPage() {
  return (
    <PageTransition>
      <main id="main-content" className="min-h-screen bg-background text-off-white flex flex-col pt-24 sm:pt-28">
        <Navigation activePage="about" />

        <div className="flex-grow container mx-auto px-6 sm:px-8 md:px-12 lg:px-16 xl:px-20 2xl:px-24 py-12 flex items-center justify-center">
          <div className="max-w-3xl w-full">
            <Image
              src="/about-page/satoshe-sluggers-about-us-offwhite-op.svg"
              alt="About Satoshe Sluggers"
              width={800}
              height={1000}
              className="w-full h-auto"
              priority
            />
          </div>
        </div>

        <Footer />
      </main>
    </PageTransition>
  )
}

