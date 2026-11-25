/**
 * Hanzo Dev Unified Layout & Interface Settings (`settings-layout.ts`)
 *
 * Syncs `Hanzo Dev` (`AppearanceSettingsPanel.tsx`) layout & typography preferences
 * across `Hanzo IDE` via `localStorage` and CSS custom properties:
 *   - `chatWidth`: `'comfortable' | 'wide' | 'full'`
 *   - `appearanceContrast`: `75..125` (%)
 *   - `glassOpacity`: `70..100` (%)
 *   - `uiFontSize`: `12..15` (px)
 *   - `editorFontSize`: `12..16` (px)
 *   - `panelAnimationDurationMs`: `0..250` (ms)
 *   - `effortDisplay`: `'label' | 'bars'`
 *   - `mathRenderingEnabled`: `boolean`
 *   - `persistComposerContextStrip`: `boolean`
 */

export type HanzoChatWidth = 'comfortable' | 'wide' | 'full'
export type HanzoEffortDisplay = 'label' | 'bars'

export interface HanzoDevLayoutSettings {
  chatWidth: HanzoChatWidth
  appearanceContrast: number
  glassOpacity: number
  uiFontSize: number
  editorFontSize: number
  panelAnimationDurationMs: number
  effortDisplay: HanzoEffortDisplay
  mathRenderingEnabled: boolean
  persistComposerContextStrip: boolean
  branchPrefix: string
  worktreeDirectory: string
  browserDefaultPort: number
}

export const HANZO_DEV_LAYOUT_STORAGE_KEY = 'hanzo.dev.unifiedLayout.v1'

export const DEFAULT_HANZO_DEV_LAYOUT: HanzoDevLayoutSettings = {
  chatWidth: 'comfortable',
  appearanceContrast: 100,
  glassOpacity: 100,
  uiFontSize: 13,
  editorFontSize: 13,
  panelAnimationDurationMs: 120,
  effortDisplay: 'label',
  mathRenderingEnabled: true,
  persistComposerContextStrip: true,
  branchPrefix: 'feat/',
  worktreeDirectory: '.hanzo/worktrees',
  browserDefaultPort: 3000,
}

function clampInt(val: unknown, min: number, max: number, fallback: number): number {
  const n = typeof val === 'number' ? Math.round(val) : Number.parseInt(String(val ?? ''), 10)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

export function loadHanzoDevLayoutSettings(): HanzoDevLayoutSettings {
  try {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_HANZO_DEV_LAYOUT }
    const raw = localStorage.getItem(HANZO_DEV_LAYOUT_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_HANZO_DEV_LAYOUT }
    const p = JSON.parse(raw) as Record<string, unknown>
    return {
      chatWidth:
        p.chatWidth === 'wide' || p.chatWidth === 'full' || p.chatWidth === 'comfortable'
          ? p.chatWidth
          : DEFAULT_HANZO_DEV_LAYOUT.chatWidth,
      appearanceContrast: clampInt(p.appearanceContrast, 75, 125, 100),
      glassOpacity: clampInt(p.glassOpacity, 70, 100, 100),
      uiFontSize: clampInt(p.uiFontSize, 12, 15, 13),
      editorFontSize: clampInt(p.editorFontSize, 12, 16, 13),
      panelAnimationDurationMs: clampInt(p.panelAnimationDurationMs, 0, 250, 120),
      effortDisplay: p.effortDisplay === 'bars' ? 'bars' : 'label',
      mathRenderingEnabled:
        typeof p.mathRenderingEnabled === 'boolean' ? p.mathRenderingEnabled : true,
      persistComposerContextStrip:
        typeof p.persistComposerContextStrip === 'boolean'
          ? p.persistComposerContextStrip
          : true,
      branchPrefix:
        typeof p.branchPrefix === 'string' && p.branchPrefix.trim()
          ? p.branchPrefix.trim()
          : 'feat/',
      worktreeDirectory:
        typeof p.worktreeDirectory === 'string' && p.worktreeDirectory.trim()
          ? p.worktreeDirectory.trim()
          : '.hanzo/worktrees',
      browserDefaultPort: clampInt(p.browserDefaultPort, 1, 65535, 3000),
    }
  } catch {
    return { ...DEFAULT_HANZO_DEV_LAYOUT }
  }
}

export function applyHanzoDevLayoutSettings(settings: HanzoDevLayoutSettings): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.dataset.hanzoChatWidth = settings.chatWidth
  root.dataset.hanzoEffortDisplay = settings.effortDisplay
  root.style.setProperty('--hanzo-ui-font-size', `${settings.uiFontSize}px`)
  root.style.setProperty('--hanzo-panel-anim-ms', `${settings.panelAnimationDurationMs}ms`)
  root.style.setProperty('--hanzo-glass-opacity', `${settings.glassOpacity / 100}`)
  root.style.setProperty('--hanzo-contrast-scale', `${settings.appearanceContrast / 100}`)

  const shell = document.getElementById('hanzo-ide-shell')
  if (shell) {
    shell.style.filter =
      settings.appearanceContrast === 100 ? '' : `contrast(${settings.appearanceContrast}%)`
  }
}

export async function saveAndApplyHanzoDevLayoutSettings(
  patch: Partial<HanzoDevLayoutSettings>,
): Promise<HanzoDevLayoutSettings> {
  const next: HanzoDevLayoutSettings = {
    ...loadHanzoDevLayoutSettings(),
    ...patch,
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(HANZO_DEV_LAYOUT_STORAGE_KEY, JSON.stringify(next))
      if (patch.browserDefaultPort) {
        localStorage.setItem('hanzo.ide.browserUrl', `http://localhost:${next.browserDefaultPort}`)
      }
    }
  } catch {
    /* ignore */
  }
  applyHanzoDevLayoutSettings(next)

  if (patch.editorFontSize !== undefined) {
    try {
      const { updateUserConfiguration } = await import(
        '@codingame/monaco-vscode-configuration-service-override'
      )
      await updateUserConfiguration(
        JSON.stringify({
          'editor.fontSize': next.editorFontSize,
          'editor.lineHeight': Math.round(next.editorFontSize * 1.75),
        }),
      )
    } catch {
      /* workbench may not be booted yet */
    }
  }
  return next
}
