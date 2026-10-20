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
  await expect(page.getByRole('heading', { name: 'Leistungsniveau' })).toHaveCount(0)
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
  await expect(page.getByRole('heading', { name: 'Leistungsniveau' })).toHaveCount(0)
  await expect(page.getByText('1+5 =', { exact: true })).toHaveCount(0)

  await page.goto('/')
  await expect(page.getByText('Eine Spielseason ist eröffnet.')).toBeVisible()
  await expect(page.getByLabel('Spielername')).toHaveCount(0)
  await expect(page.getByText('Noch kein Spieler.')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Leistungsniveau' })).toHaveCount(0)
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

test('shows the math level only to the remembered player', async ({ page }) => {
  const savedPlayer = { id: 7, name: 'Mia', createdAt: '2026-10-19T00:00:00.000Z' }
  await page.addInitScript(() => {
    localStorage.setItem('famrival.player.abc', '7')
  })
  await page.route('**/api/spielseasons/current/players/7/niveau', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, niveau: { plus: null, minus: null, mal: null } }),
    })
  })
  await page.route('**/api/spielseasons/current/players', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, players: [savedPlayer] }),
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
  await expect(page.getByRole('heading', { name: 'Leistungsniveau' })).toBeVisible()
  await expect(page.getByText('1+5 =', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Antwort')).toBeVisible()
  await expect(page.getByRole('textbox')).toHaveCount(0)
  const answerBox = await page.getByLabel('Antwort').boundingBox()
  const checkBox = await page.getByRole('button', { name: 'Antwort prüfen' }).boundingBox()
  expect(answerBox).not.toBeNull()
  expect(checkBox).not.toBeNull()
  expect(checkBox!.x).toBeGreaterThanOrEqual(answerBox!.x + answerBox!.width - 2)
  expect(checkBox!.y).toBeLessThan(answerBox!.y + answerBox!.height)
  expect(checkBox!.y + checkBox!.height).toBeGreaterThan(answerBox!.y)
  await expect(page.getByRole('listitem')).toHaveText('Mia')
  await page.keyboard.press('4')
  await expect(page.getByLabel('Antwort')).toHaveText('')
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await expect(page.getByText('Bitte eine ganze Zahl eingeben.')).toBeVisible()
  await expect(page.getByText('1+5 =', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '4', exact: true }).click()
  await expect(page.getByLabel('Antwort')).toHaveText('4')
  await expect(page.getByText('Bitte eine ganze Zahl eingeben.')).toHaveCount(0)
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await expect(page.getByText('Falsch.')).toBeVisible()
  const taskBox = await page.getByText('1+5 =', { exact: true }).boundingBox()
  const verdictBox = await page.getByText('Falsch.').boundingBox()
  expect(taskBox).not.toBeNull()
  expect(verdictBox).not.toBeNull()
  expect(verdictBox!.x).toBeGreaterThanOrEqual(taskBox!.x + taskBox!.width - 2)
  expect(verdictBox!.y).toBeLessThan(taskBox!.y + taskBox!.height)
  expect(verdictBox!.y + verdictBox!.height).toBeGreaterThan(taskBox!.y)
  await expect(page.getByLabel('Antwort')).toHaveText('')
  await page.getByRole('button', { name: '5', exact: true }).click()
  await expect(page.getByText('Falsch.')).toHaveCount(0)

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Leistungsniveau' })).toHaveCount(0)
  await expect(page.getByText('1+5 =', { exact: true })).toHaveCount(0)
})

test('shows a stored math level without a new task', async ({ page }) => {
  const savedPlayer = { id: 7, name: 'Mia', createdAt: '2026-10-19T00:00:00.000Z' }
  await page.addInitScript(() => {
    localStorage.setItem('famrival.player.abc', '7')
  })
  await page.route('**/api/spielseasons/current/players/7/niveau', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        niveau: { plus: '1+5', minus: '1-5', mal: '1*5' },
      }),
    })
  })
  await page.route('**/api/spielseasons/current/players', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, players: [savedPlayer] }),
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
  await expect(page.getByText('Dein Leistungsniveau ist ermittelt.')).toBeVisible()
  await expect(page.getByText('Dein Plus-Niveau ist 1+5.')).toBeVisible()
  await expect(page.getByText('Dein Minus-Niveau ist 1-5.')).toBeVisible()
  await expect(page.getByText('Dein Mal-Niveau ist 1*5.')).toBeVisible()
  await expect(page.getByText('1+5 =', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Löschen' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Weiter' })).toHaveCount(0)
  await expect(page.getByLabel('Antwort')).toHaveCount(0)
  await expect(page.getByRole('listitem')).toHaveText('Mia')
})

test('hides the task when a level is determined', async ({ page }) => {
  const savedPlayer = { id: 7, name: 'Mia', createdAt: '2026-10-19T00:00:00.000Z' }
  await page.clock.install()
  await page.addInitScript(() => {
    localStorage.setItem('famrival.player.abc', '7')
  })
  await page.route('**/api/spielseasons/current/players/7/niveau', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, niveau: { plus: null, minus: null, mal: null } }),
    })
  })
  await page.route('**/api/spielseasons/current/players', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, players: [savedPlayer] }),
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
  await expect(page.getByText('1+5 =', { exact: true })).toBeVisible()
  await page.clock.fastForward(9000)
  await page.getByRole('button', { name: '6', exact: true }).click()
  await page.getByRole('button', { name: 'Antwort prüfen' }).click()
  await expect(page.getByText('Dein Leistungsniveau ist ermittelt.')).toBeVisible()
  await expect(page.getByText('Dein Plus-Niveau ist 1+5.')).toBeVisible()
  await expect(page.getByText('1+5 =', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Löschen' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Weiter' })).toBeVisible()
})
