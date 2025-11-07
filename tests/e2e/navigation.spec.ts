import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('should navigate to NFTs page', async ({ page }) => {
    await page.goto('/')
    
    // Click NFTs link
    await page.click('text=NFTs')
    
    // Should be on NFTs page
    await expect(page).toHaveURL(/\/nfts/)
    await expect(page.locator('h1')).toContainText('SATOSHE SLUGGERS')
  })

  test('should navigate to About page', async ({ page }) => {
    await page.goto('/')
    
    // Click About link
    await page.click('text=About')
    
    // Should be on About page
    await expect(page).toHaveURL(/\/about/)
  })

  test('should navigate to Contact page', async ({ page }) => {
    await page.goto('/')
    
    // Click Contact link
    await page.click('text=Contact')
    
    // Should be on Contact page
    await expect(page).toHaveURL(/\/contact/)
  })
})

