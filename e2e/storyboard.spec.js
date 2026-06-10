import { test, expect } from '@playwright/test'

test.describe('Storyboard walkthrough', () => {
  test('Home → New session → List cups → Lot form', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('storyboard-badge')).toBeVisible()

    await page.getByTestId('display-name').fill('Test Worker')
    await page.getByTestId('create-session').click()

    await expect(page.getByTestId('new-session-view')).toBeVisible()
    await page.getByTestId('submit-new-session').click()

    await expect(page.getByTestId('part-out-import-view')).toBeVisible()
    await page.getByTestId('confirm-import').click()

    await expect(page.getByTestId('list-cups-view')).toBeVisible()
    await page.getByTestId('cup-cup-a').click()

    await expect(page.getByTestId('lot-form-view')).toBeVisible()
    await expect(page.getByTestId('lot-form')).toBeVisible()
  })

  test('enter existing session from Home', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('display-name').fill('Taylor')
    await page.getByTestId('enter-existing').click()
    await page.getByTestId('session-demo-session-70404').click()
    await expect(page.getByTestId('list-cups-view')).toBeVisible()
  })
})
