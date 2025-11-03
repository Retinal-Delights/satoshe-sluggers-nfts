// app/provenance/page.tsx
"use client"

import { useState, useEffect } from "react"
import { COLLECTION_NAME, CONTRACT_ADDRESS, FINAL_PROOF_HASH, MERKLE_ROOT } from "@/lib/constants"
import { Copy, Check, ExternalLink } from "lucide-react"
import Navigation from "@/components/navigation"
import Footer from "@/components/footer"
import { TooltipProvider } from "@/components/ui/tooltip"
import NFTPagination from "@/components/ui/pagination"

interface ProvenanceRecord {
  token_id: number
  nft_number: number
  sha256_hash: string
  keccak256_hash: string
  media_cid: string
  metadata_cid: string
  media_url: string
  metadata_url: string
}

// interface CompleteMetadataItem {
//   name: string
//   description: string
//   token_id: number
//   card_number: number
//   collection_number: number
//   edition: number
//   series: string
//   rarity_score: number
//   merged_data: {
//     nft: number
//     token_id: number
//     listing_id: number
//     metadata_cid: string
//     media_cid: string
//     metadata_url: string
//     media_url: string
//     price_eth: number
//   }
// }

export default function ProvenancePage() {
  const [copiedHash, setCopiedHash] = useState<string | null>(null)
  const [copiedProof, setCopiedProof] = useState(false)
  const [copiedMerkle, setCopiedMerkle] = useState(false)
  const [copiedMerkleTree, setCopiedMerkleTree] = useState(false)
  const [copiedConcatenatedHash, setCopiedConcatenatedHash] = useState(false)
  const [merkleTree, setMerkleTree] = useState("")
  const [concatenatedHash, setConcatenatedHash] = useState("")
  const [provenanceRecords, setProvenanceRecords] = useState<ProvenanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [sortField, setSortField] = useState<'token_id' | 'nft_number' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    const loadData = async () => {
      try {
        const [merkleRes, sha256Res, keccak256Res, concatenatedRes, mediaCidsRes, metadataCidsRes] = await Promise.all([
          fetch("/data/keccak-256/merkle/merkle_tree.txt"),
          fetch("/data/sha-256/sha256_hashes.txt"),
          fetch("/data/keccak-256/keccak256_hashes.txt"),
          fetch("/data/sha-256/sha256_concatenated.txt"),
          fetch("/data/ipfs-cids/ipfs_media_cids.txt"),
          fetch("/data/ipfs-cids/ipfs_metadata_cids.txt"),
        ])
        

        const merkleText = await merkleRes.text()
        const sha256Text = await sha256Res.text()
        const keccak256Text = await keccak256Res.text()
        const concatenatedText = await concatenatedRes.text()
        const mediaCidsText = await mediaCidsRes.text()
        const metadataCidsText = await metadataCidsRes.text()

        // Metadata data loaded successfully

        setMerkleTree(merkleText)
        setConcatenatedHash(concatenatedText.trim())

        // Parse hashes text files (one hash per line)
        const sha256Lines = sha256Text.split("\n")
        const keccak256Lines = keccak256Text.split("\n")
        const mediaCidsLines = mediaCidsText.split("\n")
        const metadataCidsLines = metadataCidsText.split("\n")
        
        
        const records: ProvenanceRecord[] = sha256Lines
          .filter((line) => line.trim())
          .map((sha256, index) => {
            const tokenNum = index
            
            // Get the corresponding keccak256 hash and IPFS CIDs
            const keccak256 = keccak256Lines[index]?.trim() || ""
            const mediaCidFull = mediaCidsLines[index]?.trim() || ""
            const metadataCidFull = metadataCidsLines[index]?.trim() || ""
            
            // Extract just the CID part (before the first slash)
            const mediaCid = mediaCidFull.split('/')[0] || ""
            const metadataCid = metadataCidFull.split('/')[0] || ""

            return {
              token_id: tokenNum,
              nft_number: tokenNum + 1,
              sha256_hash: sha256.trim(),
              keccak256_hash: keccak256,
              media_cid: mediaCid,
              metadata_cid: metadataCid,
              media_url: mediaCidFull ? `ipfs://${mediaCidFull}` : "",
              metadata_url: metadataCidFull ? `ipfs://${metadataCidFull}` : "",
            }
          })

        setProvenanceRecords(records)
        setLoading(false)
      } catch {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedHash(id)
    setTimeout(() => setCopiedHash(null), 2000)
  }

  const copyProofHash = () => {
    navigator.clipboard.writeText(FINAL_PROOF_HASH)
    setCopiedProof(true)
    setTimeout(() => setCopiedProof(false), 2000)
  }

  const copyMerkleRoot = () => {
    navigator.clipboard.writeText(MERKLE_ROOT)
    setCopiedMerkle(true)
    setTimeout(() => setCopiedMerkle(false), 2000)
  }

  const copyMerkleTree = () => {
    navigator.clipboard.writeText(merkleTree)
    setCopiedMerkleTree(true)
    setTimeout(() => setCopiedMerkleTree(false), 2000)
  }

  const copyConcatenatedHash = () => {
    navigator.clipboard.writeText(concatenatedHash)
    setCopiedConcatenatedHash(true)
    setTimeout(() => setCopiedConcatenatedHash(false), 2000)
  }

  const handleSort = (field: 'token_id' | 'nft_number') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortedRecords = () => {
    if (!sortField) return provenanceRecords

    return [...provenanceRecords].sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]
      
      if (sortDirection === 'asc') {
        return aValue - bValue
      } else {
        return bValue - aValue
      }
    })
  }


  // Pagination logic
  const sortedRecords = getSortedRecords()
  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedRecords = sortedRecords.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <TooltipProvider>
      <main id="main-content" className="min-h-screen bg-background text-off-white flex flex-col pt-24 sm:pt-28">
        <Navigation activePage="provenance" />

        <div className="container mx-auto px-6 sm:px-8 md:px-12 lg:px-16 xl:px-20 2xl:px-24 py-8 max-w-7xl flex-grow">
        <div className="mb-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 uppercase tracking-tight">
            <span className="text-off-white">SATO</span><span className="text-brand-pink">S</span><span className="text-brand-pink">H</span><span className="text-brand-pink">E</span> <span className="text-off-white">Sluggers</span>
          </h1>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-8 uppercase tracking-tight text-off-white">
            PROVENANCE RECORD
          </h2>
          <div className="text-muted-foreground leading-relaxed max-w-6xl space-y-3 mb-20">
            <p className="text-sm sm:text-base md:text-lg font-normal text-neutral-300">
              This record is your assurance and source of truth — verified by math, preserved by code.
            </p>
            <p className="text-sm sm:text-base md:text-lg font-normal text-neutral-300">
              Every NFT in the Satoshe Sluggers collection is permanently recorded, traceable, and verifiably authentic.
            </p>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold mb-6 uppercase tracking-tight">Verification Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-full overflow-hidden">
            <div className="bg-card border border-neutral-700 p-4 rounded">
              <div className="flex items-start gap-3">
                <div className="text-green-500 text-lg flex-shrink-0 mt-0.5">✓</div>
                <div>
                  <div className="font-semibold mb-1">SHA-256 chain</div>
                  <div className="text-xs sm:text-sm text-neutral-300 font-light">Security that ensures your files haven&apos;t changed</div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-neutral-700 p-4 rounded">
              <div className="flex items-start gap-3">
                <div className="text-green-500 text-lg flex-shrink-0 mt-0.5">✓</div>
                <div>
                  <div className="font-semibold mb-1">Final Proof Hash</div>
                  <div className="text-xs sm:text-sm text-neutral-300 font-light">One master checksum proving total authenticity</div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-neutral-700 p-4 rounded">
              <div className="flex items-start gap-3">
                <div className="text-green-500 text-lg flex-shrink-0 mt-0.5">✓</div>
                <div>
                  <div className="font-semibold mb-1">Keccak + Merkle Root</div>
                  <div className="text-xs sm:text-sm text-neutral-300 font-light">
                    Verifies on-chain consistency and collection completeness
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-neutral-700 p-4 rounded">
              <div className="flex items-start gap-3">
                <div className="text-green-500 text-lg flex-shrink-0 mt-0.5">✓</div>
                <div>
                  <div className="font-semibold mb-1">IPFS CIDs / URLs</div>
                  <div className="text-xs sm:text-sm text-neutral-300 font-light">
                    Show where the data lives permanently and unalterably
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-12">
          {/* 2 Column Layout - Responsive */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-full overflow-hidden">
            {/* Left Column - Important Information */}
            <div>
              {/* Header - shown on all sizes */}
              <h2 className="text-2xl font-bold uppercase tracking-tight mb-6">Important Information</h2>
              
              {/* Content Boxes */}
              <div className="space-y-4">
              <div className="bg-card border border-neutral-700 p-4 rounded">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">
                    {COLLECTION_NAME} Contract Address
                  </div>
                  <button
                    onClick={() => copyToClipboard(CONTRACT_ADDRESS, 'contract')}
                    className="p-2 text-muted-foreground hover:text-off-white hover:bg-accent transition-colors rounded"
                    title="Copy to clipboard"
                  >
                    {copiedHash === 'contract' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <div className="text-sm font-inconsolata break-all" style={{ fontWeight: '300' }}>{CONTRACT_ADDRESS}</div>
              </div>

              <div className="bg-card border border-neutral-700 p-4 rounded">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Final Proof Hash</div>
                  <button
                    onClick={copyProofHash}
                    className="p-2 text-muted-foreground hover:text-off-white hover:bg-accent transition-colors rounded"
                    title="Copy to clipboard"
                  >
                    {copiedProof ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <div className="text-sm font-inconsolata break-all" style={{ fontWeight: '300' }}>{FINAL_PROOF_HASH}</div>
              </div>

              <div className="bg-card border border-neutral-700 p-4 rounded">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Merkle Root</div>
                  <button
                    onClick={copyMerkleRoot}
                    className="p-2 text-muted-foreground hover:text-off-white hover:bg-accent transition-colors rounded"
                    title="Copy to clipboard"
                  >
                    {copiedMerkle ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <div className="text-sm font-inconsolata break-all" style={{ fontWeight: '300' }}>{MERKLE_ROOT}</div>
              </div>

            </div>
            </div>

            {/* Right Column - Merkle Tree */}
            <div>
              {/* Header - positioned directly above scroll box, similar to Concatenated SHA-256 Hash */}
              <h2 className="text-2xl font-bold uppercase tracking-tight mb-6">Merkle Tree</h2>
              
              <div className="bg-card border border-neutral-700 p-2 rounded max-w-full overflow-hidden">
                <div
                  className="font-inconsolata text-xs break-all leading-relaxed overflow-y-auto whitespace-pre-wrap scrollbar-custom max-w-full"
                  style={{ fontWeight: '300', height: "200px" }}
                >
                  {merkleTree || "Loading..."}
                </div>
              </div>
              
              {/* Collection Stats - Under Merkle Tree */}
              <div className="mt-6">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {/* Top row - Labels */}
                  <div className="flex flex-col items-center text-center">
                    <span className="text-muted-foreground uppercase tracking-wider font-medium">Collection Size</span>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <span className="text-muted-foreground uppercase tracking-wider font-medium">Blockchain</span>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <span className="text-muted-foreground uppercase tracking-wider font-medium">Chain ID</span>
                  </div>
                  
                  {/* Bottom row - Values */}
                  <div className="flex flex-col items-center text-center">
                    <span className="font-inconsolata text-brand-pink text-lg" style={{ fontWeight: '400' }}>7,777</span>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <span className="font-inconsolata text-brand-pink text-lg" style={{ fontWeight: '400' }}>BASE</span>
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <span className="font-inconsolata text-brand-pink text-lg" style={{ fontWeight: '400' }}>8453</span>
                  </div>
                </div>
              </div>
              
              {/* Copy button aligned with bottom of section */}
              <div className="flex justify-end mt-4">
                <button
                  onClick={copyMerkleTree}
                  className="p-2 text-muted-foreground hover:text-off-white hover:bg-accent transition-colors rounded"
                  title="Copy to clipboard"
                  disabled={!merkleTree}
                >
                  {copiedMerkleTree ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Concatenated SHA-256 Hash Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 uppercase tracking-tight">Concatenated SHA-256 Hash</h2>
          <div className="bg-neutral-900 border border-neutral-700 rounded p-4">
            <textarea
              readOnly
              value={concatenatedHash}
              className="w-full h-32 bg-transparent text-xs font-inconsolata text-off-white resize-none border-none outline-none pr-6"
              style={{ fontWeight: '300' }}
            />
          </div>
          {/* Copy button aligned with bottom of section */}
          <div className="flex justify-end mt-4">
            <button
              onClick={copyConcatenatedHash}
              className="p-2 text-muted-foreground hover:text-off-white hover:bg-accent transition-colors rounded"
              title="Copy to clipboard"
              disabled={!concatenatedHash}
            >
              {copiedConcatenatedHash ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 uppercase tracking-tight">Provenance Record</h2>

          {/* Desktop Table View */}
          <div className="hidden lg:block bg-card border border-neutral-700 overflow-hidden rounded">
            <div className="overflow-x-auto scrollbar-custom max-w-full" style={{ maxHeight: "600px", overflowY: "auto" }}>
              <table className="w-full">
                <thead className="sticky top-0 z-10 border-b border-neutral-700" style={{ backgroundColor: '#1a1a1a' }}>
                  <tr>
                    <th 
                      className="w-16 pl-4 pr-2 py-4 text-left text-xs font-semibold text-off-white uppercase tracking-wider cursor-pointer hover:bg-neutral-700/50 transition-colors"
                      onClick={() => handleSort('token_id')}
                    >
                      <div className="flex items-center gap-1">
                        Token ID
                        {sortField === 'token_id' && (
                          <span className="text-brand-pink">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="w-16 px-2 py-4 text-left text-xs font-semibold text-off-white uppercase tracking-wider cursor-pointer hover:bg-neutral-700/50 transition-colors"
                      onClick={() => handleSort('nft_number')}
                    >
                      <div className="flex items-center gap-1">
                        NFT #
                        {sortField === 'nft_number' && (
                          <span className="text-brand-pink">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="w-52 px-2 py-4 text-left text-xs font-semibold text-off-white uppercase tracking-wider">
                      SHA-256 Hash
                    </th>
                    <th className="w-52 px-2 py-4 text-left text-xs font-semibold text-off-white uppercase tracking-wider">
                      Keccak-256 Hash
                    </th>
                    <th className="w-52 px-2 py-4 text-left text-xs font-semibold text-off-white uppercase tracking-wider">
                      IPFS Metadata CID
                    </th>
                    <th className="w-52 pl-2 pr-4 py-4 text-left text-xs font-semibold text-off-white uppercase tracking-wider">
                      IPFS Media CID
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        Loading provenance records...
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((record) => (
                      <tr key={record.token_id} className="border-b border-neutral-700 hover:bg-accent/30 transition-colors">
                        <td className="w-16 pl-4 pr-2 py-4 text-xs font-inconsolata" style={{ fontWeight: '300' }}>{record.token_id}</td>
                        <td className="w-16 px-2 py-4 text-xs font-inconsolata" style={{ fontWeight: '300' }}>{record.nft_number}</td>
                        <td className="w-52 px-2 py-4">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-inconsolata break-all" style={{ fontWeight: '300' }}>{record.sha256_hash}</span>
                            <button
                              onClick={() => copyToClipboard(record.sha256_hash, `sha-${record.token_id}`)}
                              className="p-1 text-muted-foreground hover:text-off-white hover:bg-accent transition-colors flex-shrink-0 rounded cursor-pointer"
                              title="Copy to clipboard"
                            >
                              {copiedHash === `sha-${record.token_id}` ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="w-52 px-2 py-4">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-inconsolata break-all" style={{ fontWeight: '300' }}>{record.keccak256_hash}</span>
                            <button
                              onClick={() => copyToClipboard(record.keccak256_hash, `keccak-${record.token_id}`)}
                              className="p-1 text-muted-foreground hover:text-off-white hover:bg-accent transition-colors flex-shrink-0 rounded cursor-pointer"
                              title="Copy to clipboard"
                            >
                              {copiedHash === `keccak-${record.token_id}` ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="w-52 px-2 py-4">
                          <div className="flex items-center gap-1">
                            <a
                              href={record.metadata_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs hover:text-primary transition-colors font-inconsolata break-all"
                              style={{ fontWeight: '300' }}
                            >
                              {record.metadata_cid || "N/A"}
                            </a>
                            <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-brand-pink transition-colors flex-shrink-0" />
                          </div>
                        </td>
                        <td className="w-52 pl-2 pr-4 py-4">
                          <div className="flex items-center gap-1">
                            <a
                              href={record.media_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs hover:text-primary transition-colors font-inconsolata break-all"
                              style={{ fontWeight: '300' }}
                            >
                              {record.media_cid || "N/A"}
                            </a>
                            <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-brand-pink transition-colors flex-shrink-0" />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {loading ? (
              <div className="bg-card border border-neutral-700 rounded p-8 text-center text-muted-foreground">
                Loading provenance records...
              </div>
            ) : (
              paginatedRecords.map((record) => (
                <div key={record.token_id} className="bg-card border border-neutral-700 rounded p-4 space-y-3">
                  {/* Header with Token ID and NFT # */}
                  <div className="flex items-center justify-between border-b border-neutral-700 pb-2">
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-xs text-neutral-400 uppercase tracking-wider">Token ID</span>
                        <p className="text-sm font-inconsolata" style={{ fontWeight: '300' }}>{record.token_id}</p>
                      </div>
                      <div>
                        <span className="text-xs text-neutral-400 uppercase tracking-wider">NFT #</span>
                        <p className="text-sm font-inconsolata" style={{ fontWeight: '300' }}>{record.nft_number}</p>
                      </div>
                    </div>
                  </div>

                  {/* SHA-256 Hash */}
                  <div>
                    <span className="text-xs text-neutral-400 uppercase tracking-wider block mb-1">SHA-256 Hash</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-inconsolata break-all flex-1" style={{ fontWeight: '300' }}>{record.sha256_hash}</span>
                      <button
                        onClick={() => copyToClipboard(record.sha256_hash, `sha-${record.token_id}`)}
                        className="p-1 text-muted-foreground hover:text-off-white hover:bg-accent transition-colors flex-shrink-0 rounded cursor-pointer"
                        title="Copy to clipboard"
                      >
                        {copiedHash === `sha-${record.token_id}` ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Keccak-256 Hash */}
                  <div>
                    <span className="text-xs text-neutral-400 uppercase tracking-wider block mb-1">Keccak-256 Hash</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-inconsolata break-all flex-1" style={{ fontWeight: '300' }}>{record.keccak256_hash}</span>
                      <button
                        onClick={() => copyToClipboard(record.keccak256_hash, `keccak-${record.token_id}`)}
                        className="p-1 text-muted-foreground hover:text-off-white hover:bg-accent transition-colors flex-shrink-0 rounded cursor-pointer"
                        title="Copy to clipboard"
                      >
                        {copiedHash === `keccak-${record.token_id}` ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* IPFS Metadata CID */}
                  <div>
                    <span className="text-xs text-neutral-400 uppercase tracking-wider block mb-1">IPFS Metadata CID</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-inconsolata break-all flex-1" style={{ fontWeight: '300' }}>{record.metadata_cid}</span>
                      <button
                        onClick={() => copyToClipboard(record.metadata_cid, `meta-${record.token_id}`)}
                        className="p-1 text-muted-foreground hover:text-off-white hover:bg-accent transition-colors flex-shrink-0 rounded cursor-pointer"
                        title="Copy to clipboard"
                      >
                        {copiedHash === `meta-${record.token_id}` ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                      {record.metadata_url && (
                        <a
                          href={record.metadata_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-muted-foreground hover:text-off-white hover:bg-accent transition-colors flex-shrink-0 rounded cursor-pointer"
                          title="View on IPFS"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* IPFS Media CID */}
                  <div>
                    <span className="text-xs text-neutral-400 uppercase tracking-wider block mb-1">IPFS Media CID</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-inconsolata break-all flex-1" style={{ fontWeight: '300' }}>{record.media_cid}</span>
                      <button
                        onClick={() => copyToClipboard(record.media_cid, `media-${record.token_id}`)}
                        className="p-1 text-muted-foreground hover:text-off-white hover:bg-accent transition-colors flex-shrink-0 rounded cursor-pointer"
                        title="Copy to clipboard"
                      >
                        {copiedHash === `media-${record.token_id}` ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                      {record.media_url && (
                        <a
                          href={record.media_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-muted-foreground hover:text-off-white hover:bg-accent transition-colors flex-shrink-0 rounded cursor-pointer"
                          title="View on IPFS"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          <div className="mt-8">
            <NFTPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={sortedRecords.length}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
            />
          </div>
        </div>
      </div>

      <Footer />
    </main>
    </TooltipProvider>
  )
}

