// The chat has one builder and two hosts. Outside the shell the cloud
// answers, so the cloud is what gets stubbed here: the catalog and the stream.
import { test, expect, type Page } from '@playwright/test'

const reply = 'The build is green and the chat is wired through one boundary.'

/** The cloud, stubbed: a catalog with Zen in it, and one streamed reply. */
async function cloud(page: Page): Promise<{ seen: string[] }> {
  const seen: string[] = []
  await page.route('**/v1/models', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [{ id: 'zen' }, { id: 'zen-free' }] }) }))
  await page.route('**/v1/chat/completions', (route) => {
    seen.push(route.request().headers()['authorization'] ?? '')
    return route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: `data: ${JSON.stringify({ id: 'x', choices: [{ delta: { content: reply } }] })}\n\ndata: [DONE]\n\n`,
    })
  })
  return { seen }
}

/** A session, the way @hanzo/iam keeps one in the browser. */
async function signedIn(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('hanzo_iam_access_token', 'test-bearer')
    localStorage.setItem('hanzo_iam_expires_at', String(Date.now() + 3_600_000))
  })
}

test('the window host builds the chat; signed out it asks for a sign-in', async ({ page }) => {
  await cloud(page)
  await page.goto('/chat.html')
  const chat = page.locator('.hanzo-chat-container')
  await expect(chat).toBeVisible()
  await expect(chat.locator('.hanzo-chat-empty-title')).toHaveText('Hanzo')
  await expect(chat.locator('.hanzo-chat-session-select')).toHaveValue('')
  await expect(chat.locator('.hanzo-chat-model-select')).toHaveValue('zen')
  await expect(chat.locator('[aria-label="Open chat in a separate window"]')).toHaveCount(0)
  await expect(chat.locator('[aria-label="Return the chat to the main window"]')).toHaveCount(0)
  await expect(chat.locator('.hanzo-account-btn')).toHaveText('Sign In')
  await expect.poll(() => chat.evaluate((el) => getComputedStyle(el).getPropertyValue('--hanzo-chat-control').trim())).not.toBe('')

  const composer = chat.locator('textarea').first()
  await composer.fill('hello')
  await composer.press('Enter')
  await expect(chat.locator('.hanzo-chat-bubble').last()).toHaveText('Sign in to chat with Hanzo.')
})

test('signed in, the window host streams from the cloud with its bearer', async ({ page }) => {
  const { seen } = await cloud(page)
  await signedIn(page)
  await page.goto('/chat.html')
  const chat = page.locator('.hanzo-chat-container')
  await expect(chat.locator('.hanzo-account-btn')).not.toHaveText('Sign In')
  const composer = chat.locator('textarea').first()
  await composer.fill('hello')
  await composer.press('Enter')
  await expect(chat.locator('.hanzo-chat-bubble').last()).toContainText(reply)
  expect(seen).toEqual(['Bearer test-bearer'])
  await expect(chat.locator('.hanzo-chat-empty')).toHaveCount(0)
  await expect(chat.locator('#hanzo-streaming')).toHaveCount(0)
  const user = chat.locator('.hanzo-chat-user-bubble').first()
  await expect(user).toHaveText('hello')
  expect(await user.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/^Zen\b/)
})

test('the workbench host opens the chat on first layout, with Detach', async ({ page }) => {
  await cloud(page)
  await page.goto('/')
  const chat = page.locator('.monaco-workbench .hanzo-chat-container')
  await expect(chat).toBeVisible({ timeout: 30_000 })
  await expect(chat.locator('.hanzo-chat-empty-title')).toHaveText('Hanzo')
  await expect(chat.locator('[aria-label="Open chat in a separate window"]')).toHaveCount(1)
  await expect(chat.locator('textarea').first()).toBeVisible()
})
