import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Contact Us | Satoshe Sluggers",
  description: "Get in touch with the Satoshe Sluggers team. Contact us for questions about the NFT collection, partnerships, or support for women's baseball initiatives.",
  openGraph: {
    title: "Contact Us | Satoshe Sluggers",
    description: "Get in touch with the Satoshe Sluggers team for questions about the NFT collection, partnerships, or support.",
    url: 'https://satoshesluggers.com/contact',
  },
  alternates: {
    canonical: '/contact',
  },
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

