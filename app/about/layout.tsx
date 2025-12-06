import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "About Us | Satoshe Sluggers",
  description: "Learn about Satoshe Sluggers - a unique women's baseball NFT collection of 7,777 digital sluggers on Base blockchain. Supporting women's sports, the Dow Sports Association, and structural systems for real-world change through Retinal Delights platform.",
  openGraph: {
    title: "About Us | Satoshe Sluggers",
    description: "Learn about Satoshe Sluggers - a unique women's baseball NFT collection supporting women's sports and structural systems for real-world change.",
    url: 'https://satoshesluggers.com/about',
  },
  alternates: {
    canonical: '/about',
  },
}

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

