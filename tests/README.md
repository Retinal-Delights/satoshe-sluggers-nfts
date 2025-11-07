# Testing Guide

This project uses **Vitest** for unit/integration tests and **Playwright** for E2E tests.

## Running Tests

### Unit/Integration Tests (Vitest)
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage
```

### E2E Tests (Playwright)
```bash
# Run all E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e:ui

# Run tests in headed mode (see browser)
pnpm test:e2e --headed
```

### Run All Tests
```bash
pnpm test:all
```

## Test Structure

```
tests/
├── setup.ts              # Vitest setup and mocks
├── unit/                 # Unit tests
│   └── lib/             # Library function tests
├── e2e/                 # End-to-end tests
│   ├── navigation.spec.ts
│   └── nft-filtering.spec.ts
└── README.md            # This file
```

## Writing Tests

### Unit Test Example
```typescript
import { describe, it, expect } from 'vitest'
import { myFunction } from '@/lib/my-lib'

describe('myFunction', () => {
  it('should do something', () => {
    expect(myFunction()).toBe(expected)
  })
})
```

### E2E Test Example
```typescript
import { test, expect } from '@playwright/test'

test('should navigate to page', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('h1')).toBeVisible()
})
```

## Critical Paths to Test

1. ✅ NFT filtering (rarity, traits)
2. ✅ Search functionality
3. ✅ Pagination
4. ⏳ Favorites (add/remove)
5. ⏳ Purchase flow
6. ⏳ Navigation

## Coverage Goals

- **Current**: Basic setup
- **Target**: 60%+ coverage for critical paths
- **Focus**: User-facing functionality first

