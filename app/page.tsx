// app/page.tsx
"use client"

import Header80 from "@/components/header-80"
import Footer from "@/components/footer"
import Navigation from "@/components/navigation"

export default function HomePage() {
  return (
    <main id="main-content" className="min-h-screen bg-background text-off-white">
      <Navigation activePage="home" />
      <Header80 />
      <Footer />
    </main>
  )
}