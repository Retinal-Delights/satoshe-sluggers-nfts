# ⚡ Quick Verification Checklist

Use this for quick manual checks or when you want to verify specific items.

## Run Full Verification

```bash
pnpm verify
```

## Quick Manual Checks

### ✅ Build Status
```bash
pnpm build
```
**Expected:** Build succeeds with no TypeScript errors

### ✅ Console Statements (Source Code Only)
```bash
# Check for console statements (excludes scripts)
grep -r "console\." --include="*.ts" --include="*.tsx" app/ components/ hooks/ | grep -v "scripts/" | grep -v "docs/"
```
**Expected:** No matches (or only in comments/string literals)

### ✅ Hardcoded Colors (Components Only)
```bash
# Check for hardcoded brand colors in components
grep -r "#ff0099\|#FFFBEB" --include="*.tsx" --include="*.ts" app/ components/ | grep -v "globals.css" | grep -v "confetti.ts"
```
**Expected:** No matches (colors should use CSS variables or utility classes)

**Note:** Hardcoded colors are acceptable in:
- Chart data arrays (e.g., confetti colors)
- Design system definitions
- SVG files
- Documentation

### ✅ Inline FontSize Styles
```bash
# Check for inline fontSize styles
grep -r "style={{.*fontSize.*clamp" --include="*.tsx" app/ components/
```
**Expected:** No matches (should use `.text-fluid-*` classes)

### ✅ Component Sizes
```bash
# Check component line counts
find components -name "*.tsx" -exec wc -l {} \; | sort -rn | head -5
```
**Expected:** Components under 500 lines (ideally under 300)

### ✅ Documentation
```bash
# Check for required docs
ls docs/API.md docs/CONTRIBUTING.md docs/ROADMAP_TO_PERFECT_17.md
```
**Expected:** All three files exist

## What the Verification Script Checks

The `pnpm verify` command checks:

1. **Build Status** - Does the project build successfully?
2. **Console Statements** - Are there any in source code? (scripts excluded)
3. **Hardcoded Colors** - Are brand colors hardcoded? (acceptable locations excluded)
4. **Inline Styles** - Are there inline fontSize styles?
5. **JSDoc Coverage** - How many components have JSDoc?
6. **Component Sizes** - Are any components over 500 lines?
7. **Documentation Files** - Do required docs exist?

## Current Status (Last Run)

- ✅ **Build Status:** Passing
- ✅ **Inline Styles:** 0 found
- ✅ **Documentation Files:** All present
- ⚠️ **Console Statements:** Found (mostly in scripts/JSDoc examples - acceptable)
- ⚠️ **Hardcoded Colors:** Found (some in chart data - intentional)
- ⚠️ **JSDoc Coverage:** 11% (needs improvement)
- ⚠️ **Large Components:** 2 (nft-grid: 1,282 lines, nft-sidebar: 860 lines)

**Overall Score:** 71% (5/7 checks passing)

## Next Steps to Improve

1. Remove console statements from JSDoc examples
2. Add JSDoc to remaining 25 components
3. Split large components (nft-grid, nft-sidebar)
4. Review hardcoded colors (ensure they're only in acceptable locations)

---

**Updated:** November 2025
