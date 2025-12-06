import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Provenance & Verification | Satoshe Sluggers",
  description: "Verify the authenticity of Satoshe Sluggers NFTs. View cryptographic proofs, SHA256 hashes, Merkle tree data, and on-chain verification for all 7,777 NFTs in the collection.",
  openGraph: {
    title: "Provenance & Verification | Satoshe Sluggers",
    description: "Verify the authenticity of Satoshe Sluggers NFTs with cryptographic proofs, SHA256 hashes, and Merkle tree data.",
    url: 'https://satoshesluggers.com/provenance',
  },
  alternates: {
    canonical: '/provenance',
  },
}

export default function ProvenanceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

