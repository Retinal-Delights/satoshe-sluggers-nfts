# Satoshe Sluggers NFT Marketplace

A production-ready NFT marketplace for the Satoshe Sluggers collection, built with modern web technologies and optimized for performance, security, and user experience.

## 🎯 Project Overview

Satoshe Sluggers is a unique NFT collection of 7,777 digital sluggers on Base blockchain, representing a commitment to real-world change and social impact. This marketplace provides a seamless experience for discovering, purchasing, and managing these NFTs.

## 🚀 Tech Stack

- **Framework**: Next.js 15 (App Router) with React 19
- **Language**: TypeScript for type safety
- **Blockchain**: Thirdweb v5 SDK for Web3 integration
- **Styling**: Tailwind CSS v4 with custom design system
- **UI Components**: ShadCN/ui component library
- **Package Manager**: PNPM for efficient dependency management
- **Network**: Base (Chain ID: 8453)
- **Analytics**: Vercel Analytics for performance monitoring

## ✨ Key Features

### 🛒 Marketplace Functionality
- **Direct Listings**: Simple buy/sell functionality with instant transactions
- **Real-time Pricing**: Dynamic pricing based on rarity tiers
- **Favorites System**: Wallet-specific NFT favorites with local storage
- **Advanced Filtering**: Filter by rarity, traits, price range, and more
- **Search**: Full-text search across NFT names and token IDs

### 🎨 User Experience
- **Responsive Design**: Mobile-first approach with seamless desktop experience
- **Dark Theme**: Beautiful dark mode with pink accent colors (#ff0099)
- **Loading States**: Comprehensive loading indicators and error handling
- **Transaction Feedback**: Real-time transaction status with confetti animations
- **Accessibility**: WCAG compliant with keyboard navigation support

### 🔐 Security & Performance
- **SIWE Authentication**: Secure Sign-In With Ethereum
- **RPC Optimization**: Intelligent caching and rate limiting (250 calls/second)
- **Local Metadata**: Fast filtering using optimized JSON data
- **Error Boundaries**: Graceful error handling throughout the app

### 📊 Provenance & Transparency
- **Cryptographic Proofs**: Complete SHA-256 and Keccak-256 hash verification
- **Merkle Tree**: Immutable proof of collection authenticity
- **Provenance Records**: Detailed token-by-token verification system
- **IPFS Integration**: Decentralized metadata and media storage

## 📦 Quick Start

### Prerequisites
- Node.js 18+ 
- PNPM package manager
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/kwoerd/satoshe-sluggers.git
cd satoshe-sluggers

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
```

### Environment Configuration

Create a `.env.local` file with the following variables:

```env
# Thirdweb Configuration
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_thirdweb_client_id
NEXT_PUBLIC_NFT_COLLECTION_ADDRESS=0x...
NEXT_PUBLIC_MARKETPLACE_ADDRESS=0x...

```

**Get your credentials:**
- **Thirdweb Client ID**: [Thirdweb Dashboard](https://thirdweb.com/dashboard)
- **Contract Addresses**: Deploy your contracts via Thirdweb

### Development

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linting
pnpm lint

# Type checking
pnpm type-check
```

## 🏗️ Project Architecture

```
satoshe-sluggers/
├── app/                          # Next.js App Router pages
│   ├── (pages)/                 # Route groups
│   │   ├── about/               # About page
│   │   ├── contact/             # Contact form
│   │   ├── my-nfts/             # User's NFT collection
│   │   ├── nft/[id]/            # Individual NFT detail page
│   │   ├── nfts/                # Browse all NFTs
│   │   ├── provenance/          # Cryptographic proof page
│   │   └── page.tsx             # Homepage
│   ├── api/                     # API routes
│   ├── globals.css              # Global styles
│   └── layout.tsx               # Root layout
├── components/                   # React components
│   ├── ui/                      # ShadCN/ui components
│   ├── nft-card.tsx             # Individual NFT card
│   ├── nft-grid.tsx             # NFT grid with pagination
│   ├── nft-sidebar.tsx          # Filtering sidebar
│   ├── nft-purchase-modal.tsx   # Purchase modal
│   ├── error-boundary.tsx       # Error boundary component
│   └── ...                      # Other components
├── lib/                         # Utility libraries
│   ├── thirdweb.ts              # Thirdweb client configuration
│   ├── contracts.ts             # Smart contract instances
│   ├── constants.ts             # Application constants
│   ├── simple-data-service.ts   # Data loading service
│   ├── design-tokens.ts         # Design system tokens
│   ├── performance.ts           # Performance monitoring
│   └── accessibility.ts         # Accessibility utilities
├── hooks/                       # Custom React hooks
│   └── useFavorites.ts          # Favorites management
├── public/                      # Static assets
│   ├── data/                    # Runtime data files
│   │   ├── complete_metadata.json    # NFT metadata
│   │   ├── optimized_pricing.json    # Pricing data
│   │   ├── token_pricing_mappings.json # Fallback pricing
│   │   ├── merkle_tree.txt           # Merkle tree data
│   │   └── sha256_hashes.txt         # Hash verification
│   ├── docs/                    # Documentation files
│   ├── nfts/                    # NFT images
│   └── icons/                   # UI icons
├── docs/                        # Project documentation
│   ├── AUTHENTICATION_SETUP.md
│   ├── BUILD_STATUS.md
│   ├── DESIGN_CHECKLIST.md
│   ├── PRE_DEPLOYMENT_CHECKLIST.md
│   ├── SECURITY_AUDIT.md
│   ├── SETUP.md
│   └── STYLE_GUIDE.md
└── scripts/                     # Build and utility scripts
    ├── combine-metadata.js      # Metadata combination
    └── optimize-pricing.js      # Pricing optimization
```

## 🎨 Design System

The project uses a comprehensive design system with:

- **Typography**: Inter (primary), JetBrains Mono (code/monospace)
- **Colors**: Dark theme with pink accents (#ff0099)
- **Spacing**: Consistent 8px grid system
- **Components**: ShadCN/ui with custom modifications
- **Icons**: Custom SVG icons and Lucide React

## 🔧 Configuration

### Smart Contracts

Update contract addresses in `lib/constants.ts`:

```typescript
export const CONTRACT_ADDRESS = "0x..."; // Your NFT collection
export const MARKETPLACE_ADDRESS = "0x..."; // Your marketplace
export const MERKLE_ROOT = "0x..."; // Collection merkle root
export const FINAL_PROOF_HASH = "0x..."; // Collection final proof hash
```

### Performance Optimization

The app includes several performance optimizations:

- **Image Optimization**: WebP format with lazy loading
- **Code Splitting**: Dynamic imports for heavy components
- **Caching**: Intelligent data caching and memoization
- **Bundle Analysis**: Optimized bundle sizes

### Security Features

- **Rate Limiting**: RPC call limits to prevent abuse
- **Input Validation**: Comprehensive form validation
- **Error Handling**: Graceful error boundaries
- **CSRF Protection**: Secure form submissions

## 📊 Collection Information

- **Total Supply**: 7,777 NFTs
- **Blockchain**: Base (Ethereum L2)
- **Token Standard**: ERC-721
- **Rarity Tiers**: Common, Uncommon, Rare, Epic, Legendary, Ultra-Legendary
- **Traits**: Background, Skin Tone, Shirt, Eyewear, Hair, Headwear

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

```bash
# Build the application
pnpm build

# Start production server
pnpm start
```

## 🧪 Testing

```bash
# Run type checking
pnpm type-check

# Run linting
pnpm lint

# Build verification
pnpm build
```

## 📈 Performance Metrics

The application is optimized for Core Web Vitals:

- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **Bundle Size**: Optimized for fast loading

## 🔍 Troubleshooting

### Common Issues

1. **Wallet Connection Issues**: Ensure you're on Base network
2. **Metadata Loading**: Check if `complete_metadata.json` exists
3. **Build Errors**: Run `pnpm install` to ensure dependencies are installed
4. **Type Errors**: Run `pnpm type-check` to identify TypeScript issues

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` in your environment.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software owned by Retinal Delights © 2025. All Rights Reserved.

## 🆘 Support

For technical support or questions:

- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Open an issue on GitHub
- **Contact**: [Contact Page](https://retinaldelights.io/contact)

## 🙏 Acknowledgments

- **Thirdweb**: Web3 infrastructure and SDK
- **Vercel**: Hosting and deployment platform
- **ShadCN**: UI component library
- **Base**: Ethereum L2 blockchain

---

**2025 © Retinal Delights, Inc.  All Rights Reserved.**

**Created with ♥ in Los Angeles, by kwoerd**