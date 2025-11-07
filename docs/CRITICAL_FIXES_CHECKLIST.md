# 🔧 Critical Fixes Checklist - Action Items for AI Assistant

**Purpose:** This document lists all critical code quality issues that need to be fixed.  
**Priority:** HIGH - Should be fixed before production deployment  
**Estimated Time:** 1-2 hours

---

## 📋 FIXES REQUIRED

### 1. Unused Error Variables in Catch Blocks

**Strategy:** Prefix unused error variables with `_` (underscore) to indicate they're intentionally unused, OR remove the variable name entirely if not needed.

#### File: `app/api/auth/session/route.ts`
- **Line 49:** Unused `error` variable in catch block
- **Fix:** Change `catch (error)` to `catch (_error)` or `catch`

#### File: `app/api/auth/siwe/route.ts`
- **Line 11:** Unused `SESSION_SECRET` variable (assigned but never used)
- **Line 74:** Unused `error` variable in catch block
- **Line 156:** Unused `error` variable in catch block
- **Line 163:** Unused `error` variable in catch block
- **Fix:** 
  - Remove `SESSION_SECRET` if truly unused, or use it
  - Change all `catch (error)` to `catch (_error)` or `catch`

#### File: `app/api/contact/route.ts`
- **Line 85:** Unused `error` variable in catch block
- **Fix:** Change `catch (error)` to `catch (_error)` or `catch`

#### File: `app/api/favorites/route.ts`
- **Line 71:** Unused `error` variable in catch block
- **Line 175:** Unused `error` variable in catch block
- **Fix:** Change both `catch (error)` to `catch (_error)` or `catch`

#### File: `app/api/favorites/[tokenId]/route.ts`
- **Line 70:** Unused `error` variable in catch block
- **Fix:** Change `catch (error)` to `catch (_error)` or `catch`

#### File: `app/nft/[id]/page.tsx`
- **Line 140:** Unused `error` variable in catch block
- **Line 191:** Unused `error` variable in catch block
- **Line 257:** Unused `error` variable in catch block
- **Line 261:** Unused `error` variable in catch block
- **Line 313:** Unused `error` variable in catch block
- **Line 368:** Unused `error` variable in catch block
- **Line 486:** Unused `error` variable in catch block
- **Line 512:** Unused `error` variable in catch block
- **Fix:** Change all 8 instances of `catch (error)` to `catch (_error)` or `catch`

#### File: `components/error-boundary.tsx`
- **Line 26:** Unused `error` parameter
- **Line 26:** Unused `errorInfo` parameter
- **Fix:** Change to `catch (_error, _errorInfo)` or remove parameter names if not used

#### File: `lib/insight-service.ts`
- **Line 19:** Unused `client` variable (assigned but never used)
- **Line 83:** Unused `error` variable in catch block
- **Fix:** 
  - Remove `client` if unused, or use it
  - Change `catch (error)` to `catch (_error)` or `catch`

#### File: `lib/simple-data-service.ts`
- **Line 121:** Unused `error` variable in catch block
- **Line 165:** Unused `error` variable in catch block
- **Line 206:** Unused `error` variable in catch block
- **Line 281:** Unused `error` variable in catch block
- **Line 329:** Unused `error` variable in catch block
- **Fix:** Change all 5 instances of `catch (error)` to `catch (_error)` or `catch`

---

### 2. Unused State Variables

#### File: `app/nfts/page.tsx`
- **Line 28:** Unused `showLive` state variable
- **Line 28:** Unused `setShowLive` state setter
- **Line 29:** Unused `showSold` state variable
- **Line 29:** Unused `setShowSold` state setter
- **Fix:** Remove these unused useState declarations entirely:
  ```typescript
  // REMOVE THESE LINES:
  const [showLive, setShowLive] = useState(false);
  const [showSold, setShowSold] = useState(false);
  ```

---

### 3. Unused Imports/Exports

#### File: `components/nft-grid-controls.tsx`
- **Line 12:** Unused `ViewMode` export/import
- **Fix:** Remove `ViewMode` from the import/export statement if it's not used in the file

---

### 4. Type Safety Issues - Replace `any` Types

#### File: `app/api/nft/aggregate-counts/route.ts`
- **Line 73:** `any` type used in `data.data.forEach((event: any) => {`
- **Fix:** Create a proper interface for the event type:
  ```typescript
  interface Event {
    // Define the actual structure based on the data
    // Example:
    // eventType: string;
    // tokenId: number;
    // ... other properties
  }
  // Then use: data.data.forEach((event: Event) => {
  ```

#### File: `lib/insight-service.ts`
- **Line 71:** `any` type used
- **Fix:** Replace with proper interface or type definition

---

## 📝 SUMMARY OF ACTIONS

### Total Issues to Fix:
- **Unused error variables:** 20 instances across 9 files
- **Unused state variables:** 4 instances in 1 file
- **Unused imports/exports:** 1 instance
- **Type safety (`any` types):** 2 instances

### Files to Modify:
1. `app/api/auth/session/route.ts` - 1 fix
2. `app/api/auth/siwe/route.ts` - 4 fixes
3. `app/api/contact/route.ts` - 1 fix
4. `app/api/favorites/route.ts` - 2 fixes
5. `app/api/favorites/[tokenId]/route.ts` - 1 fix
6. `app/api/nft/aggregate-counts/route.ts` - 1 fix (type safety)
7. `app/nft/[id]/page.tsx` - 8 fixes
8. `app/nfts/page.tsx` - 4 fixes (remove unused state)
9. `components/error-boundary.tsx` - 2 fixes
10. `components/nft-grid-controls.tsx` - 1 fix
11. `lib/insight-service.ts` - 3 fixes (1 unused var, 1 error, 1 any type)
12. `lib/simple-data-service.ts` - 5 fixes

**Total: 12 files, ~30 fixes**

---

## ✅ VERIFICATION

After making all fixes, verify by running:
```bash
pnpm build
```

The build should complete with **zero ESLint warnings** (or only acceptable warnings that are intentionally ignored).

---

## 🎯 PRIORITY ORDER

1. **First:** Fix unused state variables in `app/nfts/page.tsx` (easiest - just remove lines)
2. **Second:** Fix unused error variables (prefix with `_` or remove)
3. **Third:** Fix unused imports/exports
4. **Fourth:** Replace `any` types with proper interfaces (requires understanding data structure)

---

**Note:** All fixes should maintain existing functionality. The unused variables don't affect runtime behavior, but cleaning them up improves code quality and maintainability.

