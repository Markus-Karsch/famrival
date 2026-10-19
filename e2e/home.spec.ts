import { expect, test } from '@playwright/test'

test('shows the empty Spielseason state', async ({ page }) => {
  await page.route('**/api/spielseasons/current', async (route) => {
    expect(route.request().method()).toBe('GET')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, spielseason: null }),
    })
  })

  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Famrival' })).toBeVisible()
  await expect(page.getByText('Noch keine Spielseason.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Spielseason eröffnen' })).toBeVisible()
  await expect(page.getByText('Eine Spielseason ist eröffnet.')).toHaveCount(0)
})
