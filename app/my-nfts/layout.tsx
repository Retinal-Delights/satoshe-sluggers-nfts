import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "My NFTs | Satoshe Sluggers",
  description: "View your owned Satoshe Sluggers NFTs and favorites. Manage your collection of women's baseball NFT collectibles on Base blockchain.",
  openGraph: {
    title: "My NFTs | Satoshe Sluggers",
    description: "View your owned Satoshe Sluggers NFTs and favorites. Manage your collection of women's baseball NFT collectibles.",
    url: 'https://satoshesluggers.com/my-nfts',
  },
  alternates: {
    canonical: '/my-nfts',
  },
  robots: {
    index: false, // Don't index user-specific pages
    follow: false,
  },
}

export default function MyNFTsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

