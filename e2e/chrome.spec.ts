import { test, expect, type Page } from '@playwright/test'

// The workbench boots asynchronously and pulls a lot of modules in dev.
async function workbench(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.monaco-workbench .activitybar', { timeout: 120_000 })
  await page.waitForTimeout(3_000)
}

/** Luminance of an sRGB triple. */
const lum = ([r, g, b]: number[]) => 0.2126 * r + 0.7152 * g + 0.0722 * b

test.describe('workbench chrome', () => {
  test('draws no bright seams between panels', async ({ page }) => {
    await workbench(page)

    // A 1px rule lighter than the surfaces it separates is the "white border"
    // this theme is meant to be free of. What distinguishes a seam from an icon
    // or a glyph is that it runs the height of the window, so a column only
    // counts once it spikes on most of the rows sampled.
    const top = 160
    const rows = 24
    const height = 640
    const shot = await page.screenshot({ clip: { x: 0, y: top, width: 700, height } })
    const { PNG } = await import('pngjs')
    const png = PNG.sync.read(shot)

    const at = (x: number, y: number) => {
      const i = (y * png.width + x) * 4
      return [png.data[i], png.data[i + 1], png.data[i + 2]]
    }

    const hits = new Map<number, number>()
    for (let r = 0; r < rows; r++) {
      const y = Math.floor((r + 0.5) * (height / rows))
      for (let x = 3; x < png.width - 3; x++) {
        const here = lum(at(x, y))
        const left = Math.max(lum(at(x - 1, y)), lum(at(x - 2, y)), lum(at(x - 3, y)))
        const right = Math.max(lum(at(x + 1, y)), lum(at(x + 2, y)), lum(at(x + 3, y)))
        if (here > left + 12 && here > right + 12) hits.set(x, (hits.get(x) ?? 0) + 1)
      }
    }

    const seams = [...hits.entries()]
      .filter(([, n]) => n > rows * 0.6)
      .map(([x, n]) => ({ x, rgb: at(x, height >> 1), rows: n }))
    expect(seams, `full-height seams at ${JSON.stringify(seams)}`).toHaveLength(0)
  })

  test('paints the parts on the Hanzo neutral ramp', async ({ page }) => {
    await workbench(page)
    const bg = await page.evaluate(() => {
      const read = (sel: string) => {
        const el = document.querySelector(sel)
        return el ? getComputedStyle(el).backgroundColor : null
      }
      return { activitybar: read('.part.activitybar'), sidebar: read('.part.sidebar') }
    })
    // Neutral means R = G = B; any hue here reads as a second brand colour.
    for (const [part, colour] of Object.entries(bg)) {
      const m = colour?.match(/\d+/g)?.slice(0, 3).map(Number)
      expect(m, `${part} has a background`).toBeTruthy()
      expect(new Set(m!).size, `${part} ${colour} is neutral`).toBe(1)
    }
  })

  test('sets Zen as the workbench and editor typeface', async ({ page }) => {
    await workbench(page)
    const fonts = await page.evaluate(() => {
      const cs = getComputedStyle(document.querySelector('.monaco-workbench')!)
      return {
        ui: cs.fontFamily,
        mono: cs.getPropertyValue('--hanzo-font-mono'),
      }
    })
    expect(fonts.ui).toContain('Zen')
    expect(fonts.mono).toContain('Zen Mono')
  })

  test('shows no yellow anywhere in the chrome', async ({ page }) => {
    await workbench(page)
    const shot = await page.screenshot()
    const { PNG } = await import('pngjs')
    const png = PNG.sync.read(shot)
    let yellow = 0
    for (let i = 0; i < png.data.length; i += 4) {
      const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2]
      if (r > 120 && g > 100 && b < Math.min(r, g) - 60) yellow++
    }
    expect(yellow, 'yellow pixels in the workbench').toBe(0)
  })
})
