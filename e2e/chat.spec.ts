// The chat has one builder and two hosts. Outside the shell the cloud
// answers, so the completions endpoint is the only thing stubbed here.
import { test, expect, type Page } from '@playwright/test'

const reply = 'The build is green and the chat is wired through one boundary.'

async function cloud(page: Page): Promise<void> {
  await page.route('**/v1/chat/completions', (route) => route.fulfill({
    status: 200,
    headers: { 'content-type': 'text/event-stream' },
    body: `data: ${JSON.stringify({ id: 'x', choices: [{ delta: { content: reply } }] })}\n\ndata: [DONE]\n\n`,
  }))
}

test('the window host builds the chat and talks to the cloud', async ({ page }) => {
  await cloud(page)
  await page.goto('/chat.html')
  const chat = page.locator('.hanzo-chat-container')
  await expect(chat).toBeVisible()
  await expect(chat.locator('.hanzo-chat-empty-title')).toHaveText('Hanzo')
  await expect(chat.locator('.hanzo-chat-session-select')).toHaveValue('')
  await expect(chat.locator('[aria-label="Open chat in a separate window"]')).toHaveCount(0)
  await expect(chat.locator('[aria-label="Return the chat to the main window"]')).toHaveCount(0)
  await expect.poll(() => chat.evaluate((el) => getComputedStyle(el).getPropertyValue('--hanzo-chat-control').trim())).not.toBe('')

  const composer = chat.locator('textarea').first()
  await composer.fill('hello')
  await composer.press('Enter')
  await expect(chat.locator('.hanzo-chat-bubble').last()).toContainText(reply)
  await expect(chat.locator('.hanzo-chat-empty')).toHaveCount(0)
  await expect(chat.locator('#hanzo-streaming')).toHaveCount(0)
  const user = chat.locator('.hanzo-chat-user-bubble').first()
  await expect(user).toHaveText('hello')
  expect(await user.evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/^Zen\b/)
})

test('the workbench host opens the chat on first layout, with Detach', async ({ page }) => {
  await page.goto('/')
  const chat = page.locator('.monaco-workbench .hanzo-chat-container')
  await expect(chat).toBeVisible({ timeout: 30_000 })
  await expect(chat.locator('.hanzo-chat-empty-title')).toHaveText('Hanzo')
  await expect(chat.locator('[aria-label="Open chat in a separate window"]')).toHaveCount(1)
  await expect(chat.locator('textarea').first()).toBeVisible()
})
