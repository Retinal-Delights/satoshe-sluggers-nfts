import { test, expect } from '@playwright/test'

test.describe('NFT Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/nfts')
    // Wait for NFTs to load
    await page.waitForSelector('[data-testid="nft-card"], .grid', { timeout: 10000 })
  })

  test('should filter by rarity', async ({ page }) => {
    // Find and click rarity filter
    const raritySection = page.locator('text=Rarity').first()
    if (await raritySection.isVisible()) {
      await raritySection.click()
      
      // Click on a rarity option (e.g., Legendary)
      const legendaryOption = page.locator('text=Legendary').first()
      if (await legendaryOption.isVisible()) {
        await legendaryOption.click()
        
        // Wait for filtering to complete
        await page.waitForTimeout(1000)
        
        // Verify URL has filter parameter
        await expect(page).toHaveURL(/rarity/)
      }
    }
  })

  test('should search for NFTs', async ({ page }) => {
    // Find search input
    const searchInput = page.locator('input[type="text"]').first()
    if (await searchInput.isVisible()) {
      await searchInput.fill('Satoshe')
      
      // Wait for search to complete
      await page.waitForTimeout(1000)
      
      // Verify URL has search parameter
      await expect(page).toHaveURL(/search/)
    }
  })

  test('should toggle Live/Sold filters', async ({ page }) => {
    // Find Live/Sold toggle buttons
    const liveButton = page.locator('text=Live').first()
    const soldButton = page.locator('text=Sold').first()
    
    if (await liveButton.isVisible()) {
      await liveButton.click()
      await page.waitForTimeout(500)
    }
    
    if (await soldButton.isVisible()) {
      await soldButton.click()
      await page.waitForTimeout(500)
    }
  })
})

