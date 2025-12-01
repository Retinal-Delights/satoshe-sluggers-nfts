#!/bin/bash
# Clear all Next.js, Turbopack, and browser caches

echo "🧹 Clearing all caches..."

# 1. Clear Next.js build cache
echo "Clearing .next directory..."
rm -rf .next

# 2. Clear Next.js cache directory
echo "Clearing .next/cache..."
rm -rf .next/cache

# 3. Clear Turbopack cache
echo "Clearing Turbopack cache..."
rm -rf .next/turbopack
rm -rf node_modules/.cache/turbopack 2>/dev/null || true

# 4. Clear node_modules cache
echo "Clearing node_modules/.cache..."
rm -rf node_modules/.cache

# 5. Clear pnpm store cache
echo "Clearing pnpm store cache..."
pnpm store prune

echo "✅ All caches cleared!"
echo ""
echo "Next steps:"
echo "1. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)"
echo "2. Clear browser cache if needed"
echo "3. Restart dev server: pnpm dev"

