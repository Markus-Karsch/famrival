import { expect, test, type Page } from '@playwright/test'

async function mockPlayersSocket(
  page: Page,
  players: { id: number; name: string; createdAt: string }[],
) {
  let resolveSent = () => {}
  const sent = new Promise<void>((resolve) => {
    resolveSent = resolve
  })
  await page.routeWebSocket(/\/api\/spielseasons\/current\/players\/live$/, (ws) => {
    ws.send(JSON.stringify({ type: 'players', players }))
    resolveSent()
  })
  return { sent }
}

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
  await expect(page.getByLabel('Spielername')).toHaveCount(0)
  await expect(page.getByText('Noch kein Spieler.')).toHaveCount(0)
})

test('shows the player name field only on the matching link', async ({ page }) => {
  const season = {
    ok: true,
    spielseason: { id: 1, createdAt: '2026-10-19T00:00:00.000Z', hash: 'abc' },
  }
  await page.route('**/api/spielseasons/current/players', async (route) => {
    expect(route.request().method()).toBe('GET')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, players: [] }),
    })
  })
  await page.route('**/api/spielseasons/current', async (route) => {
    expect(route.request().method()).toBe('GET')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(season),
    })
  })
  const { sent: socketSent } = await mockPlayersSocket(page, [])

  await page.goto('/spielseason/abc')
  await socketSent
  await expect(page.getByLabel('Spielername')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Name speichern' })).toBeVisible()
  await expect(page.getByText('Noch kein Spieler.')).toBeVisible()

  await page.goto('/spielseason/other')
  await expect(page.getByText('Dieser Link gehört nicht zur aktuellen Spielseason.')).toBeVisible()
  await expect(page.getByLabel('Spielername')).toHaveCount(0)
  await expect(page.getByText('Noch kein Spieler.')).toHaveCount(0)

  await page.goto('/')
  await expect(page.getByText('Eine Spielseason ist eröffnet.')).toBeVisible()
  await expect(page.getByLabel('Spielername')).toHaveCount(0)
  await expect(page.getByText('Noch kein Spieler.')).toHaveCount(0)
})

test('remembers the saved player on the matching link', async ({ page }) => {
  const savedPlayer = { id: 7, name: 'Mia', createdAt: '2026-10-19T00:00:00.000Z' }
  await page.addInitScript(() => {
    localStorage.setItem('famrival.player.abc', '7')
  })
  await page.route('**/api/spielseasons/current/players', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        players: [savedPlayer],
      }),
    })
  })
  await page.route('**/api/spielseasons/current', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        spielseason: { id: 1, createdAt: '2026-10-19T00:00:00.000Z', hash: 'abc' },
      }),
    })
  })
  const { sent: socketSent } = await mockPlayersSocket(page, [savedPlayer])

  await page.goto('/spielseason/abc')
  await socketSent
  await expect(page.getByText('Du spielst als Mia.')).toBeVisible()
  await expect(page.getByLabel('Spielername')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Name speichern' })).toHaveCount(0)
})
