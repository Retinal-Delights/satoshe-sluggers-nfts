import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Browse NFTs | Satoshe Sluggers Collection",
  description: "Browse the complete Satoshe Sluggers NFT collection. Filter by rarity, traits, and listing status. Discover all 7,777 unique women's baseball NFT collectibles on Base blockchain.",
  openGraph: {
    title: "Browse NFTs | Satoshe Sluggers Collection",
    description: "Browse the complete Satoshe Sluggers NFT collection. Filter by rarity, traits, and listing status.",
    url: 'https://satoshesluggers.com/nfts',
  },
  alternates: {
    canonical: '/nfts',
  },
}

export default function NFTsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

