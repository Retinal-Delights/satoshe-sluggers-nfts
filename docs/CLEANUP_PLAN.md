# 🧹 Project Cleanup Plan

## Files/Folders to DELETE

### 1. Tests Folder ❌ DELETE
**Reason:** Not used in production, user wants to remove
- `tests/` (entire folder)
- `playwright.config.ts`
- `vitest.config.ts`

### 2. Scripts Folder - Most Can Go ❌ DELETE MOST
**Keep:**
- `verify-build-quality.js` (used in package.json "verify" script - optional to keep)

**Delete:**
- `convert-csv-to-pricing-json.mjs` - One-time data processing
- `create-optimized-chunks.mjs` - One-time data processing  
- `full-inventory-details.xlsx` - Data file, shouldn't be in repo
- `full-inventory-merged.xlsx` - Data file, shouldn't be in repo
- `full-inventory.ts` - One-time data processing
- `get-all-listings-database.mjs` - One-time data processing
- `merge-inventory.ts` - One-time data processing
- `nft-listing-status-exact.ts` - One-time data processing
- `nft-listing-status.ts` - One-time data processing
- `split-metadata.mjs` - One-time data processing

### 3. Docs Folder - Consolidate ❌ DELETE DUPLICATES
**Keep (Essential):**
- `README.md` (if exists)
- `STYLE_GUIDE.md`
- `API.md`
- `DEPLOYMENT_GUIDE.md`
- `CONTRIBUTING.md`
- `ABI/` folder (contract ABIs)
- `END_TO_END_BUILD_ANALYSIS_DECEMBER_2025.md` (latest analysis)
- `CRITICAL_FIXES_CHECKLIST.md` (reference)

**Delete (Duplicates/Outdated):**
- `archive/` folder (entire folder - old analyses)
- `COMPREHENSIVE_BUILD_ANALYSIS_NOVEMBER_2025.md` (superseded by December)
- `COMPREHENSIVE_BUILD_AUDIT_NOVEMBER_2025.md` (duplicate)
- `COMPREHENSIVE_BUILD_AUDIT_NOVEMBER_2025_NOTION.txt` (duplicate)
- `FINAL_BUILD_ANALYSIS_NOVEMBER_2025.md` (superseded)
- `FINAL_BUILD_ANALYSIS_NOVEMBER_2025_NOTION.txt` (duplicate)
- `AUDIT_SUMMARY.md` (if duplicate)
- `DESIGN_SYSTEM_ANALYSIS.md` (if info is in STYLE_GUIDE)
- `PAGINATION_CODE_SNIPPETS.md` (implementation detail, not needed)
- `PAGINATION_IMPLEMENTATION_GUIDE.md` (implementation detail, not needed)
- `QUICK_VERIFICATION.md` (if duplicate)
- `VERIFICATION_GUIDE.md` (if duplicate)
- `PROD_TEST_CHECKLIST.md` (if not actively used)
- `README_AUDITS.md` (if duplicate)
- `Direct Listing Prices.txt` (data file)
- `full-inventory-merged.csv` (data file)
- `token_pricing_mappings.csv` (if JSON version exists)
- `token_pricing_mappings.json` (keep if used by app, delete if not)

### 4. Weird Accidental Files ❌ DELETE
- `h` (if exists - looks like accidental file)
- `tatus` (if exists - looks like accidental file)
- `tatus --short` (if exists - looks like accidental file)

### 5. Build Artifacts ❌ DELETE
- `tsconfig.tsbuildinfo` (should be gitignored)

## Dependencies to Remove (if deleting tests)

From `package.json` devDependencies:
- `@playwright/test`
- `@testing-library/jest-dom`
- `@testing-library/react`
- `@testing-library/user-event`
- `@vitejs/plugin-react`
- `@vitest/ui`
- `vitest`
- `jsdom`

From `package.json` scripts:
- `test`
- `test:ui`
- `test:coverage`
- `test:e2e`
- `test:e2e:ui`
- `test:all`

## What to KEEP

### Essential Scripts
- `verify-build-quality.js` (optional - useful for checking build quality)

### Essential Docs
- `STYLE_GUIDE.md`
- `API.md`
- `DEPLOYMENT_GUIDE.md`
- `CONTRIBUTING.md`
- `ABI/` folder
- Latest analysis docs

### Essential Data Files (if used by app)
- `public/data/` folder (metadata, pricing, etc. - used at runtime)

## Cleanup Commands

```bash
# Remove tests
rm -rf tests/
rm playwright.config.ts
rm vitest.config.ts

# Remove most scripts (keep verify-build-quality.js if desired)
rm scripts/convert-csv-to-pricing-json.mjs
rm scripts/create-optimized-chunks.mjs
rm scripts/full-inventory-details.xlsx
rm scripts/full-inventory-merged.xlsx
rm scripts/full-inventory.ts
rm scripts/get-all-listings-database.mjs
rm scripts/merge-inventory.ts
rm scripts/nft-listing-status-exact.ts
rm scripts/nft-listing-status.ts
rm scripts/split-metadata.mjs

# Remove duplicate/outdated docs
rm -rf docs/archive/
rm docs/COMPREHENSIVE_BUILD_ANALYSIS_NOVEMBER_2025.md
rm docs/COMPREHENSIVE_BUILD_AUDIT_NOVEMBER_2025.md
rm docs/COMPREHENSIVE_BUILD_AUDIT_NOVEMBER_2025_NOTION.txt
rm docs/FINAL_BUILD_ANALYSIS_NOVEMBER_2025.md
rm docs/FINAL_BUILD_ANALYSIS_NOVEMBER_2025_NOTION.txt
# ... (other duplicates)

# Remove accidental files
rm h 2>/dev/null
rm tatus 2>/dev/null
rm "tatus --short" 2>/dev/null

# Remove build artifacts
rm tsconfig.tsbuildinfo
```

## After Cleanup

1. Update `.gitignore` to include:
   - `tsconfig.tsbuildinfo`
   - `*.xlsx` (if data files shouldn't be committed)
   - `*.csv` (if data files shouldn't be committed)

2. Update `package.json` to remove test dependencies and scripts

3. Run `pnpm install` to clean up node_modules

