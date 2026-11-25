// Shared Hanzo Dev-Style Grouped Settings Modal (`openHanzoSettingsModal`).
//
// Full parity with `Hanzo Dev` (`SettingsSidebarNav.tsx` + `AppearanceSettingsPanel.tsx`):
//   - Preferences: General, Appearance (Theme Library, Contrast, Glass Opacity, Chat Width,
//     Effort Display, Render Math, Panel Animations, Sidebar Layout, Typography, Dock Icon),
//     Chat, Diffs & PRs, Keybindings
//   - Agents: Providers (`enso` default), Account & Usage, Browser, Devices, Scheduled tasks
//   - Code: Editor & Workbench, Source control & Worktrees
//   - Connections: MCP & Connections, Local AI & Node, Blockchain Console
//   - More: About

import './settings-modal.css'
import { invoke } from '@tauri-apps/api/core'
import { emit, tauri } from './tauri.ts'
import {
  HANZO_DEFAULT_KEYBINDINGS,
  HANZO_DEFAULT_MODEL,
  detectDesktopPlatform,
  isMacDesktopPlatform,
  readStoredAppearance,
} from './theme.ts'
import { getDockIconMode, setDockIconMode, type DockIconMode } from './dock-icon.ts'
import { getWorkspace } from './ide-context.ts'
import { PROVIDER_DEFS, probeAndAutoSeedProviders } from './chat/settings.ts'
import { S } from './chat/state.ts'
import { loadPrefs, savePrefs } from './chat/prefs.ts'
import {
  DEFAULT_HANZO_DEV_LAYOUT,
  loadHanzoDevLayoutSettings,
  saveAndApplyHanzoDevLayoutSettings,
  type HanzoChatWidth,
  type HanzoEffortDisplay,
} from './settings-layout.ts'
import { renderAccountAndBillingSection } from './settings-billing.ts'
import { renderBlockchainConsoleSection, renderLocalNodeSection } from './settings-node.ts'

export type HanzoSettingsSectionId =
  | 'general'
  | 'appearance'
  | 'chat'
  | 'diffs'
  | 'keybindings'
  | 'models'
  | 'account'
  | 'browser'
  | 'devices'
  | 'editor'
  | 'worktrees'
  | 'mcp'
  | 'local-node'
  | 'blockchain'
  | 'about'

interface NavItem {
  id: HanzoSettingsSectionId
  group: string
  label: string
  icon: string
  keywords: string
}

const NAV_ITEMS: readonly NavItem[] = [
  { id: 'general', group: 'Preferences', label: 'General', icon: 'codicon-sliders', keywords: 'approval plan folder startup enso' },
  { id: 'appearance', group: 'Preferences', label: 'Appearance', icon: 'codicon-color-mode', keywords: 'theme zen clay light contrast opacity glass chat width effort math animations typography font dock icon' },
  { id: 'chat', group: 'Preferences', label: 'Chat', icon: 'codicon-comment-discussion', keywords: 'composer context effort thinking stream' },
  { id: 'diffs', group: 'Preferences', label: 'Diffs & pull requests', icon: 'codicon-diff', keywords: 'diff split inline wrap pull request git' },
  { id: 'keybindings', group: 'Preferences', label: 'Keybindings', icon: 'codicon-keyboard', keywords: 'shortcuts command palette sidebar terminal' },
  { id: 'models', group: 'Agents', label: 'Providers', icon: 'codicon-sparkle', keywords: 'enso zen6 ollama openai anthropic api key models' },
  { id: 'account', group: 'Agents', label: 'Usage & Account', icon: 'codicon-account', keywords: 'iam login sign in org usage credits billing pay hanzo.id' },
  { id: 'browser', group: 'Agents', label: 'Browser', icon: 'codicon-browser', keywords: 'preview localhost port playwright browser' },
  { id: 'devices', group: 'Agents', label: 'Devices', icon: 'codicon-device-mobile', keywords: 'phone ios android mobile qr paired' },
  { id: 'editor', group: 'Code', label: 'Editor & Projects', icon: 'codicon-code', keywords: 'vscode json settings font tab minimap formatter' },
  { id: 'worktrees', group: 'Code', label: 'Source control & Worktrees', icon: 'codicon-git-branch', keywords: 'git branch prefix worktree checkout commit' },
  { id: 'mcp', group: 'Connections', label: 'MCP & Connections', icon: 'codicon-plug', keywords: 'mcp hip-0300 zap server tools local bus' },
  { id: 'local-node', group: 'Connections', label: 'Environments & Local AI', icon: 'codicon-server-process', keywords: 'local models node hanzod router engine private offline inference' },
  { id: 'blockchain', group: 'Connections', label: 'Blockchain Console', icon: 'codicon-globe', keywords: 'chain rpc hip-1330 mainnet testnet devnet block height peers explorer' },
  { id: 'about', group: 'More', label: 'About', icon: 'codicon-info', keywords: 'version platform engine docs license' },
]

async function runVsCodeCommand(commandId: string): Promise<void> {
  try {
    const { StandaloneServices } = await import('@codingame/monaco-vscode-api/services')
    const { ICommandService } = await import(
      '@codingame/monaco-vscode-api/vscode/vs/platform/commands/common/commands'
    )
    await (StandaloneServices.get(ICommandService) as any)?.executeCommand?.(commandId)
  } catch (e) {
    console.warn('[hanzo-settings] command failed:', commandId, e)
  }
}

function makeRow(titleText: string, descText: string, control?: HTMLElement): HTMLDivElement {
  const row = document.createElement('div')
  row.className = 'hz-settings-row'
  const meta = document.createElement('div')
  meta.className = 'hz-settings-meta'
  const t = document.createElement('div')
  t.className = 'hz-settings-title'
  t.textContent = titleText
  const d = document.createElement('div')
  d.className = 'hz-settings-desc'
  d.textContent = descText
  meta.append(t, d)
  row.appendChild(meta)
  if (control) row.appendChild(control)
  return row
}

function makeSliderControl(
  value: number,
  min: number,
  max: number,
  step: number,
  unit: string,
  ariaLabel: string,
  onChange: (next: number) => void,
): HTMLDivElement {
  const wrap = document.createElement('div')
  wrap.className = 'hz-settings-slider-wrap'
  const out = document.createElement('output')
  out.className = 'hz-settings-slider-out'
  out.textContent = `${value}${unit}`
  const slider = document.createElement('input')
  slider.type = 'range'
  slider.className = 'hz-settings-slider'
  slider.min = String(min)
  slider.max = String(max)
  slider.step = String(step)
  slider.value = String(value)
  slider.setAttribute('aria-label', ariaLabel)
  slider.addEventListener('input', () => {
    const v = Number(slider.value)
    out.textContent = `${v}${unit}`
    onChange(v)
  })
  wrap.append(out, slider)
  return wrap
}

export function openHanzoSettingsModal(initialSection: HanzoSettingsSectionId = 'general'): void {
  const existing = document.getElementById('hz-settings-backdrop')
  if (existing) existing.remove()

  let activeSection: HanzoSettingsSectionId = initialSection
  let filterQuery = ''

  const backdrop = document.createElement('div')
  backdrop.id = 'hz-settings-backdrop'
  backdrop.className = 'hz-settings-backdrop'

  const shell = document.createElement('div')
  shell.className = 'hz-settings-shell'
  shell.setAttribute('role', 'dialog')
  shell.setAttribute('aria-modal', 'true')
  shell.setAttribute('aria-label', 'Hanzo IDE Settings')

  const close = () => {
    window.removeEventListener('keydown', onKey)
    backdrop.remove()
  }

  const sidebar = document.createElement('aside')
  sidebar.className = 'hz-settings-sidebar'

  const brand = document.createElement('div')
  brand.className = 'hz-settings-brand'
  brand.innerHTML = '<img src="/favicon.svg" alt="" /><span>Settings</span>'

  const searchInput = document.createElement('input')
  searchInput.type = 'search'
  searchInput.className = 'hz-settings-search'
  searchInput.placeholder = 'Search settings… (/)'

  const nav = document.createElement('nav')
  nav.className = 'hz-settings-nav'

  const vscodeJsonBtn = document.createElement('button')
  vscodeJsonBtn.type = 'button'
  vscodeJsonBtn.className = 'hz-settings-footer-link'
  vscodeJsonBtn.innerHTML =
    '<span>Open JSON / VS Code Settings</span><span class="codicon codicon-link-external" style="font-size:12px"></span>'
  vscodeJsonBtn.addEventListener('click', () => {
    close()
    void runVsCodeCommand('workbench.action.openSettings2')
  })

  sidebar.append(brand, searchInput, nav, vscodeJsonBtn)

  const main = document.createElement('div')
  main.className = 'hz-settings-main'

  const header = document.createElement('div')
  header.className = 'hz-settings-header'
  const heading = document.createElement('h2')
  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.className = 'hz-settings-close'
  closeBtn.title = 'Close (Esc)'
  closeBtn.setAttribute('aria-label', 'Close settings')
  closeBtn.innerHTML = '<span class="codicon codicon-close" style="font-size:14px"></span>'
  closeBtn.addEventListener('click', close)
  header.append(heading, closeBtn)

  const body = document.createElement('div')
  body.className = 'hz-settings-body'

  main.append(header, body)
  shell.append(sidebar, main)
  backdrop.appendChild(shell)

  const renderNav = () => {
    nav.innerHTML = ''
    const q = filterQuery.trim().toLowerCase()
    const visible = NAV_ITEMS.filter(
      (item) => !q || `${item.label} ${item.group} ${item.keywords}`.toLowerCase().includes(q),
    )
    let lastGroup = ''
    for (const item of visible) {
      if (item.group !== lastGroup) {
        lastGroup = item.group
        const g = document.createElement('div')
        g.className = 'hz-settings-nav-group'
        g.textContent = item.group
        nav.appendChild(g)
      }
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'hz-settings-nav-btn'
      btn.setAttribute('aria-selected', String(item.id === activeSection))
      btn.innerHTML = `<span class="codicon ${item.icon}" style="font-size:14px"></span><span>${item.label}</span>`
      btn.addEventListener('click', () => {
        activeSection = item.id
        renderNav()
        void renderBody()
      })
      nav.appendChild(btn)
    }
  }

  searchInput.addEventListener('input', () => {
    filterQuery = searchInput.value
    const q = filterQuery.trim().toLowerCase()
    const match = NAV_ITEMS.find((n) => `${n.label} ${n.group} ${n.keywords}`.toLowerCase().includes(q))
    if (q && match && match.id !== activeSection) {
      activeSection = match.id
    }
    renderNav()
    void renderBody()
  })

  async function renderBody(): Promise<void> {
    const currentNav = NAV_ITEMS.find((n) => n.id === activeSection) ?? NAV_ITEMS[0]
    heading.textContent = currentNav.label
    body.innerHTML = ''

    if (activeSection === 'account') {
      await renderAccountAndBillingSection(body, close, () => void renderBody())
      return
    }
    if (activeSection === 'local-node') {
      await renderLocalNodeSection(body)
      return
    }
    if (activeSection === 'blockchain') {
      await renderBlockchainConsoleSection(body)
      return
    }

    if (activeSection === 'general') {
      const prefs = loadPrefs()
      const card = document.createElement('div')
      card.className = 'hz-settings-card'

      const approvalSeg = document.createElement('div')
      approvalSeg.className = 'hz-settings-seg'
      for (const m of ['ask', 'auto'] as const) {
        const b = document.createElement('button')
        b.type = 'button'
        b.textContent = m === 'ask' ? 'Ask' : 'Auto'
        b.setAttribute('aria-pressed', String(S.approvalMode === m))
        b.addEventListener('click', () => {
          S.approvalMode = m
          savePrefs({ ...prefs, approvalMode: m })
          S.onModeUpdated?.()
          void renderBody()
        })
        approvalSeg.appendChild(b)
      }
      card.appendChild(
        makeRow(
          'Default tool approval',
          'Choose whether write and shell actions ask for confirmation or run automatically.',
          approvalSeg,
        ),
      )

      const planSeg = document.createElement('div')
      planSeg.className = 'hz-settings-seg'
      for (const p of [false, true]) {
        const b = document.createElement('button')
        b.type = 'button'
        b.textContent = p ? 'Plan first' : 'Direct'
        b.setAttribute('aria-pressed', String(S.planMode === p))
        b.addEventListener('click', () => {
          S.planMode = p
          savePrefs({ ...prefs, planMode: p })
          S.onModeUpdated?.()
          void renderBody()
        })
        planSeg.appendChild(b)
      }
      card.appendChild(
        makeRow('Execution style', 'Start directly or draft a structured step-by-step plan first.', planSeg),
      )

      const openWsBtn = document.createElement('button')
      openWsBtn.type = 'button'
      openWsBtn.className = 'hz-settings-btn'
      openWsBtn.textContent = 'Open Folder…'
      openWsBtn.addEventListener('click', () => {
        close()
        void runVsCodeCommand('hanzo.openFolder')
      })
      card.appendChild(makeRow('Project folder', getWorkspace() || 'No folder open', openWsBtn))

      body.appendChild(card)
      return
    }

    if (activeSection === 'appearance') {
      const layout = loadHanzoDevLayoutSettings()
      const curThemeId = document.documentElement.dataset.hanzoThemeId || readStoredAppearance()
      const traditionalAb = localStorage.getItem('hanzo.ide.traditionalActivityBar') === 'true'

      const themeTitle = document.createElement('div')
      themeTitle.className = 'hz-settings-group-title'
      themeTitle.textContent = 'Colors & themes'

      const themeCard = document.createElement('div')
      themeCard.className = 'hz-settings-card'

      const themeSeg = document.createElement('div')
      themeSeg.className = 'hz-settings-seg'
      for (const opt of [
        { id: 'zen', label: 'Zen', cmd: 'hanzo.useZenTheme' },
        { id: 'clay', label: 'Clay', cmd: 'hanzo.useClayTheme' },
        { id: 'light', label: 'Zen Light', cmd: 'hanzo.useLightTheme' },
      ] as const) {
        const b = document.createElement('button')
        b.type = 'button'
        b.textContent = opt.label
        b.setAttribute(
          'aria-pressed',
          String(curThemeId === opt.id || (curThemeId === 'dark' && opt.id === 'zen')),
        )
        b.addEventListener('click', async () => {
          await runVsCodeCommand(opt.cmd)
          void renderBody()
        })
        themeSeg.appendChild(b)
      }
      themeCard.appendChild(
        makeRow(
          'Theme library',
          'Zen (#000000 / #090909), Clay (#141418 / #111016), or Zen Light (#ffffff).',
          themeSeg,
        ),
      )

      const ifaceTitle = document.createElement('div')
      ifaceTitle.className = 'hz-settings-group-title'
      ifaceTitle.textContent = 'Interface & Layout (Hanzo Dev)'

      const ifaceCard = document.createElement('div')
      ifaceCard.className = 'hz-settings-card'

      ifaceCard.appendChild(
        makeRow(
          'Contrast',
          'Adjust the contrast of colors and borders across the interface.',
          makeSliderControl(layout.appearanceContrast, 75, 125, 5, '%', 'Contrast', (v) => {
            void saveAndApplyHanzoDevLayoutSettings({ appearanceContrast: v })
          }),
        ),
      )

      ifaceCard.appendChild(
        makeRow(
          'Surface opacity',
          'Higher values make menus, dialogs, and the composer more solid.',
          makeSliderControl(layout.glassOpacity, 70, 100, 5, '%', 'Surface opacity', (v) => {
            void saveAndApplyHanzoDevLayoutSettings({ glassOpacity: v })
          }),
        ),
      )

      const widthSeg = document.createElement('div')
      widthSeg.className = 'hz-settings-seg'
      for (const w of [
        { id: 'comfortable', label: 'Comfortable' },
        { id: 'wide', label: 'Wide' },
        { id: 'full', label: 'Full' },
      ] as const) {
        const b = document.createElement('button')
        b.type = 'button'
        b.textContent = w.label
        b.setAttribute('aria-pressed', String(layout.chatWidth === w.id))
        b.addEventListener('click', async () => {
          await saveAndApplyHanzoDevLayoutSettings({ chatWidth: w.id as HanzoChatWidth })
          void renderBody()
        })
        widthSeg.appendChild(b)
      }
      ifaceCard.appendChild(
        makeRow(
          'Chat & panel width',
          'Set how wide messages and the composer grow in the AI dock and detached chat.',
          widthSeg,
        ),
      )

      const barSeg = document.createElement('div')
      barSeg.className = 'hz-settings-seg'
      for (const mode of [
        { id: false, label: 'Minimal Zen' },
        { id: true, label: 'Activity Bar' },
      ] as const) {
        const b = document.createElement('button')
        b.type = 'button'
        b.textContent = mode.label
        b.setAttribute('aria-pressed', String(traditionalAb === mode.id))
        b.addEventListener('click', async () => {
          const { toggleTraditionalActivityBar } = await import('./zen-workspace.ts')
          if (traditionalAb !== mode.id) await toggleTraditionalActivityBar()
          void renderBody()
        })
        barSeg.appendChild(b)
      }
      ifaceCard.appendChild(
        makeRow(
          'Sidebar layout',
          'Distraction-free Zed-style switcher or traditional VS Code left Activity Bar.',
          barSeg,
        ),
      )

      ifaceCard.appendChild(
        makeRow(
          'Panel animation speed',
          'Set how fast sidebars and panels open and close.',
          makeSliderControl(layout.panelAnimationDurationMs, 0, 250, 25, 'ms', 'Panel animations', (v) => {
            void saveAndApplyHanzoDevLayoutSettings({ panelAnimationDurationMs: v })
          }),
        ),
      )

      const curDock: DockIconMode = tauri()
        ? await getDockIconMode().catch(() => 'branded')
        : 'branded'
      const dockSeg = document.createElement('div')
      dockSeg.className = 'hz-settings-seg'
      for (const dm of ['branded', 'minimal'] as const) {
        const b = document.createElement('button')
        b.type = 'button'
        b.textContent = dm === 'branded' ? 'Branded' : 'Minimal'
        b.setAttribute('aria-pressed', String(curDock === dm))
        b.addEventListener('click', async () => {
          if (tauri()) await setDockIconMode(dm).catch(() => {})
          void renderBody()
        })
        dockSeg.appendChild(b)
      }
      ifaceCard.appendChild(
        makeRow('Dock icon', 'Branded corner badge or minimal monochrome squircle.', dockSeg),
      )

      const typoTitle = document.createElement('div')
      typoTitle.className = 'hz-settings-group-title'
      typoTitle.textContent = 'Typography'

      const typoCard = document.createElement('div')
      typoCard.className = 'hz-settings-card'
      typoCard.appendChild(
        makeRow(
          'Editor font size (Zen Mono)',
          'Adjust Monaco editor and integrated terminal font size.',
          makeSliderControl(layout.editorFontSize, 12, 16, 1, 'px', 'Editor font size', (v) => {
            void saveAndApplyHanzoDevLayoutSettings({ editorFontSize: v })
          }),
        ),
      )
      typoCard.appendChild(
        makeRow(
          'Interface font size (Zen)',
          'Adjust sidebar, chat, and menu typography scale.',
          makeSliderControl(layout.uiFontSize, 12, 15, 1, 'px', 'UI font size', (v) => {
            void saveAndApplyHanzoDevLayoutSettings({ uiFontSize: v })
          }),
        ),
      )

      const resetBtn = document.createElement('button')
      resetBtn.type = 'button'
      resetBtn.className = 'hz-settings-btn'
      resetBtn.textContent = 'Reset Appearance Defaults'
      resetBtn.addEventListener('click', async () => {
        await saveAndApplyHanzoDevLayoutSettings(DEFAULT_HANZO_DEV_LAYOUT)
        void renderBody()
      })
      typoCard.appendChild(
        makeRow('Reset interface', 'Restore all Hanzo Dev layout and typography defaults.', resetBtn),
      )

      body.append(themeTitle, themeCard, ifaceTitle, ifaceCard, typoTitle, typoCard)
      return
    }

    if (activeSection === 'chat') {
      const layout = loadHanzoDevLayoutSettings()
      const card = document.createElement('div')
      card.className = 'hz-settings-card'

      const effortSeg = document.createElement('div')
      effortSeg.className = 'hz-settings-seg'
      for (const opt of [
        { id: 'label', label: 'Word' },
        { id: 'bars', label: 'Bars' },
      ] as const) {
        const b = document.createElement('button')
        b.type = 'button'
        b.textContent = opt.label
        b.setAttribute('aria-pressed', String(layout.effortDisplay === opt.id))
        b.addEventListener('click', async () => {
          await saveAndApplyHanzoDevLayoutSettings({ effortDisplay: opt.id as HanzoEffortDisplay })
          void renderBody()
        })
        effortSeg.appendChild(b)
      }
      card.appendChild(
        makeRow(
          'Effort display',
          'Show reasoning effort in the composer as its name (Fast / High) or as bars.',
          effortSeg,
        ),
      )

      const mathSeg = document.createElement('div')
      mathSeg.className = 'hz-settings-seg'
      for (const on of [true, false]) {
        const b = document.createElement('button')
        b.type = 'button'
        b.textContent = on ? 'Enabled' : 'Off'
        b.setAttribute('aria-pressed', String(layout.mathRenderingEnabled === on))
        b.addEventListener('click', async () => {
          await saveAndApplyHanzoDevLayoutSettings({ mathRenderingEnabled: on })
          void renderBody()
        })
        mathSeg.appendChild(b)
      }
      card.appendChild(
        makeRow('Render math', 'Typeset LaTeX math expressions in messages and Markdown previews.', mathSeg),
      )

      const ctxSeg = document.createElement('div')
      ctxSeg.className = 'hz-settings-seg'
      for (const on of [true, false]) {
        const b = document.createElement('button')
        b.type = 'button'
        b.textContent = on ? 'Visible' : 'Auto-hide'
        b.setAttribute('aria-pressed', String(layout.persistComposerContextStrip === on))
        b.addEventListener('click', async () => {
          await saveAndApplyHanzoDevLayoutSettings({ persistComposerContextStrip: on })
          void renderBody()
        })
        ctxSeg.appendChild(b)
      }
      card.appendChild(
        makeRow(
          'Composer context strip',
          'Keep active file, branch, and worktree pills visible above the composer.',
          ctxSeg,
        ),
      )

      body.appendChild(card)
      return
    }

    if (activeSection === 'diffs') {
      const card = document.createElement('div')
      card.className = 'hz-settings-card'

      const sideBtn = document.createElement('button')
      sideBtn.type = 'button'
      sideBtn.className = 'hz-settings-btn'
      sideBtn.textContent = 'Toggle Inline / Split Diff'
      sideBtn.addEventListener('click', () => {
        void runVsCodeCommand('toggle.diff.renderSideBySide')
      })
      card.appendChild(
        makeRow(
          'Diff presentation',
          'Switch between side-by-side split diffs and unified inline diffs.',
          sideBtn,
        ),
      )
      body.appendChild(card)
      return
    }

    if (activeSection === 'browser') {
      const layout = loadHanzoDevLayoutSettings()
      const card = document.createElement('div')
      card.className = 'hz-settings-card'

      const portSeg = document.createElement('div')
      portSeg.className = 'hz-settings-seg'
      for (const p of [3000, 5173, 8080, 4321]) {
        const b = document.createElement('button')
        b.type = 'button'
        b.textContent = `:${p}`
        b.setAttribute('aria-pressed', String(layout.browserDefaultPort === p))
        b.addEventListener('click', async () => {
          await saveAndApplyHanzoDevLayoutSettings({ browserDefaultPort: p })
          void renderBody()
        })
        portSeg.appendChild(b)
      }
      card.appendChild(
        makeRow(
          'Default preview port',
          'Initial localhost port probed when opening the Integrated Browser.',
          portSeg,
        ),
      )

      const openBrowserBtn = document.createElement('button')
      openBrowserBtn.type = 'button'
      openBrowserBtn.className = 'hz-settings-btn hz-settings-btn--primary'
      openBrowserBtn.textContent = 'Open Integrated Browser'
      openBrowserBtn.addEventListener('click', () => {
        close()
        void import('./zen-workspace.ts').then((m) => m.toggleZenPanel('browser'))
      })
      card.appendChild(
        makeRow('Workspace Browser Preview', 'Toggle the live localhost preview pane inside the editor.', openBrowserBtn),
      )

      body.appendChild(card)
      return
    }

    if (activeSection === 'devices') {
      const card = document.createElement('div')
      card.className = 'hz-settings-card'
      const phoneBtn = document.createElement('button')
      phoneBtn.type = 'button'
      phoneBtn.className = 'hz-settings-btn hz-settings-btn--primary'
      phoneBtn.textContent = 'Get Hanzo on your phone'
      phoneBtn.addEventListener('click', () => {
        void import('./phone-app-modal.ts').then((m) => m.openPhoneAppModal())
      })
      card.appendChild(
        makeRow(
          'Get Hanzo on your phone',
          'Download Hanzo on iOS or Android (hanzo.ai/download#mobile) and sync threads with your desktop.',
          phoneBtn,
        ),
      )
      body.appendChild(card)
      return
    }

    if (activeSection === 'worktrees') {
      const layout = loadHanzoDevLayoutSettings()
      const card = document.createElement('div')
      card.className = 'hz-settings-card'

      const prefixSeg = document.createElement('div')
      prefixSeg.className = 'hz-settings-seg'
      for (const pfx of ['feat/', 'fix/', 'dev/', 'hanzo/']) {
        const b = document.createElement('button')
        b.type = 'button'
        b.textContent = pfx
        b.setAttribute('aria-pressed', String(layout.branchPrefix === pfx))
        b.addEventListener('click', async () => {
          await saveAndApplyHanzoDevLayoutSettings({ branchPrefix: pfx })
          void renderBody()
        })
        prefixSeg.appendChild(b)
      }
      card.appendChild(
        makeRow('Agent branch naming prefix', 'Prefix used when agents create feature branches.', prefixSeg),
      )
      card.appendChild(
        makeRow(
          'Worktree directory',
          `Isolated parallel agent worktrees are stored under ${layout.worktreeDirectory}.`,
        ),
      )
      body.appendChild(card)
      return
    }

    if (activeSection === 'models') {
      const config: any = tauri() ? await invoke<any>('engine_get_config').catch(() => ({})) : {}
      const providers: any[] = config?.providers ?? []
      let selectedDef =
        PROVIDER_DEFS.find((d) => d.id === config?.default_provider) ?? PROVIDER_DEFS[0]

      const detectCard = document.createElement('div')
      detectCard.className = 'hz-settings-card'
      const detectBtn = document.createElement('button')
      detectBtn.type = 'button'
      detectBtn.className = 'hz-settings-btn'
      detectBtn.textContent = 'Auto-Detect Local Engines'
      detectBtn.addEventListener('click', async () => {
        detectBtn.textContent = 'Scanning…'
        await probeAndAutoSeedProviders(true)
        await emit('provider-updated').catch(() => {})
        void renderBody()
      })
      detectCard.appendChild(
        makeRow(
          'Model routing',
          `Active default: ${config?.default_model || HANZO_DEFAULT_MODEL} (${config?.default_provider || 'hanzo'})`,
          detectBtn,
        ),
      )
      body.appendChild(detectCard)

      const chipRow = document.createElement('div')
      chipRow.className = 'hz-settings-chips'

      const formCard = document.createElement('div')
      formCard.className = 'hz-settings-card'

      const renderProviderForm = () => {
        chipRow.querySelectorAll('button').forEach((b) => {
          b.setAttribute('aria-selected', String((b as HTMLElement).dataset.pid === selectedDef.id))
        })
        const saved = providers.find((p: any) => p.id === selectedDef.id)
        formCard.innerHTML = ''

        const wrap = document.createElement('div')
        wrap.style.cssText = 'padding:16px;display:flex;flex-direction:column;gap:12px'

        const titleEl = document.createElement('div')
        titleEl.className = 'hz-settings-title'
        titleEl.textContent = `${selectedDef.label} configuration`

        const keyInp = document.createElement('input')
        keyInp.type = 'password'
        keyInp.className = 'hz-settings-input'
        keyInp.placeholder = `API Key (${selectedDef.placeholder})`
        keyInp.value = saved?.api_key || ''

        const urlInp = document.createElement('input')
        urlInp.type = 'text'
        urlInp.className = 'hz-settings-input'
        urlInp.placeholder = 'Base URL (https://...)'
        urlInp.value = saved?.base_url || selectedDef.url

        const modelInp = document.createElement('input')
        modelInp.type = 'text'
        modelInp.className = 'hz-settings-input'
        modelInp.placeholder = `Default model ID (e.g. ${HANZO_DEFAULT_MODEL})`
        modelInp.value = saved?.default_model || selectedDef.models[0] || ''

        const presetRow = document.createElement('div')
        presetRow.className = 'hz-settings-chips'
        for (const m of selectedDef.models) {
          const c = document.createElement('button')
          c.type = 'button'
          c.className = 'hz-settings-chip'
          c.textContent = m
          c.setAttribute('aria-selected', String(modelInp.value === m))
          c.addEventListener('click', () => {
            modelInp.value = m
            presetRow.querySelectorAll('button').forEach((x) => x.setAttribute('aria-selected', 'false'))
            c.setAttribute('aria-selected', 'true')
          })
          presetRow.appendChild(c)
        }

        const saveRow = document.createElement('div')
        saveRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:4px'
        const statusMsg = document.createElement('span')
        statusMsg.className = 'hz-settings-desc'

        const saveBtn = document.createElement('button')
        saveBtn.type = 'button'
        saveBtn.className = 'hz-settings-btn hz-settings-btn--primary'
        saveBtn.textContent = 'Save & Set Default'
        saveBtn.addEventListener('click', async () => {
          const model = modelInp.value.trim() || selectedDef.models[0] || HANZO_DEFAULT_MODEL
          saveBtn.textContent = 'Saving…'
          try {
            const enabled = Array.from(new Set([...selectedDef.models, model]))
            await invoke('engine_upsert_provider', {
              provider: {
                id: selectedDef.id,
                name: selectedDef.label,
                kind: selectedDef.kind,
                api_key: keyInp.value.trim(),
                base_url: urlInp.value.trim(),
                default_model: model,
                enabled_models: enabled,
              },
            })
            const latest = await invoke<any>('engine_get_config')
            await invoke('engine_set_config', {
              config: { ...latest, default_provider: selectedDef.id, default_model: model },
            })
            S.selectedModel = model
            const prefs = loadPrefs()
            savePrefs({ ...prefs, selectedModel: model })
            S.needsProviderSetup = false
            await emit('provider-updated').catch(() => {})
            statusMsg.textContent = `Saved ${selectedDef.label} (${model})`
            saveBtn.textContent = 'Saved ✓'
            setTimeout(() => {
              saveBtn.textContent = 'Save & Set Default'
            }, 1400)
          } catch (e) {
            statusMsg.textContent = String(e)
            saveBtn.textContent = 'Save & Set Default'
          }
        })

        saveRow.append(statusMsg, saveBtn)
        wrap.append(titleEl)
        if (selectedDef.id !== 'claudecode') {
          wrap.append(keyInp, urlInp)
        }
        wrap.append(modelInp)
        if (selectedDef.models.length > 0) wrap.append(presetRow)
        wrap.append(saveRow)
        formCard.appendChild(wrap)
      }

      for (const def of PROVIDER_DEFS) {
        const chip = document.createElement('button')
        chip.type = 'button'
        chip.className = 'hz-settings-chip'
        chip.dataset.pid = def.id
        chip.textContent = def.label
        chip.addEventListener('click', () => {
          selectedDef = def
          renderProviderForm()
        })
        chipRow.appendChild(chip)
      }

      renderProviderForm()
      body.append(chipRow, formCard)
      return
    }

    if (activeSection === 'mcp') {
      const card = document.createElement('div')
      card.className = 'hz-settings-card'

      const drawerBtn = document.createElement('button')
      drawerBtn.type = 'button'
      drawerBtn.className = 'hz-settings-btn hz-settings-btn--primary'
      drawerBtn.textContent = 'Open MCP & Tools Drawer'
      drawerBtn.addEventListener('click', () => {
        close()
        void import('./zen-workspace.ts').then((m) => m.toggleZenPanel('integrations'))
      })
      card.appendChild(
        makeRow(
          'Hanzo MCP (HIP-0300)',
          'Auto-discovers ~/.local/bin/hanzo-mcp (fs, exec, code, git, fetch, think, memory, plan, kai, ui).',
          drawerBtn,
        ),
      )

      const runnerBtn = document.createElement('button')
      runnerBtn.type = 'button'
      runnerBtn.className = 'hz-settings-btn'
      runnerBtn.textContent = 'Run Tool…'
      runnerBtn.addEventListener('click', () => {
        close()
        void import('./mcp-drawer.ts').then((m) => m.openMcpToolRunnerModal())
      })
      card.appendChild(
        makeRow(
          'Interactive MCP Tool Runner',
          'Execute any connected HIP-0300 or custom MCP tool directly with live JSON-RPC inspection.',
          runnerBtn,
        ),
      )

      const addSrvBtn = document.createElement('button')
      addSrvBtn.type = 'button'
      addSrvBtn.className = 'hz-settings-btn'
      addSrvBtn.textContent = '+ Add Custom Server'
      addSrvBtn.addEventListener('click', () => {
        close()
        void import('./mcp-drawer.ts').then((m) => m.openAddCustomMcpModal())
      })
      card.appendChild(
        makeRow(
          'Custom MCP Servers',
          'Connect stdio commands or Streamable HTTP / SSE MCP servers with encrypted Vault env.',
          addSrvBtn,
        ),
      )

      card.appendChild(
        makeRow(
          'Local ZAP Bus',
          'Joined automatically so `hanzo` CLI and sibling desktop apps can coordinate with the active editor.',
        ),
      )
      body.appendChild(card)
      return
    }

    if (activeSection === 'editor') {
      const card = document.createElement('div')
      card.className = 'hz-settings-card'

      const uiBtn = document.createElement('button')
      uiBtn.type = 'button'
      uiBtn.className = 'hz-settings-btn'
      uiBtn.textContent = 'Open VS Code Settings UI'
      uiBtn.addEventListener('click', () => {
        close()
        void runVsCodeCommand('workbench.action.openSettings2')
      })
      card.appendChild(
        makeRow(
          'Workbench Settings UI',
          'Full Monaco / VS Code editor, formatter, terminal, and language settings.',
          uiBtn,
        ),
      )

      const jsonBtn = document.createElement('button')
      jsonBtn.type = 'button'
      jsonBtn.className = 'hz-settings-btn hz-settings-btn--primary'
      jsonBtn.textContent = 'Open settings.json'
      jsonBtn.addEventListener('click', () => {
        close()
        void runVsCodeCommand('workbench.action.openSettingsJson')
      })
      card.appendChild(
        makeRow(
          'Raw JSON Configuration',
          'Edit `settings.json` directly for advanced power-user workbench overrides.',
          jsonBtn,
        ),
      )

      body.appendChild(card)
      return
    }

    if (activeSection === 'keybindings') {
      const isMac = isMacDesktopPlatform()
      const card = document.createElement('div')
      card.className = 'hz-settings-card'
      for (const kb of HANZO_DEFAULT_KEYBINDINGS) {
        const badge = document.createElement('span')
        badge.className = 'hz-settings-kbd'
        badge.textContent = isMac ? kb.mac : kb.winLinux
        card.appendChild(makeRow(kb.label, kb.command, badge))
      }
      const allBtn = document.createElement('button')
      allBtn.type = 'button'
      allBtn.className = 'hz-settings-btn'
      allBtn.textContent = 'All Keyboard Shortcuts…'
      allBtn.addEventListener('click', () => {
        close()
        void runVsCodeCommand('workbench.action.openGlobalKeybindings')
      })
      card.appendChild(makeRow('Customize Keybindings', 'Open the full workbench keybinding editor.', allBtn))
      body.appendChild(card)
      return
    }

    const card = document.createElement('div')
    card.className = 'hz-settings-card'
    const docsBtn = document.createElement('button')
    docsBtn.type = 'button'
    docsBtn.className = 'hz-settings-btn'
    docsBtn.textContent = 'GitHub Repository'
    docsBtn.addEventListener('click', () => {
      if (tauri()) void invoke('open_external', { url: 'https://github.com/hanzoai/ide' }).catch(() => {})
      else window.open('https://github.com/hanzoai/ide', '_blank', 'noopener')
    })
    card.appendChild(
      makeRow(
        'Hanzo IDE v0.2.0',
        `Platform: ${detectDesktopPlatform()} · Monaco VS Code 28.4 · Tauri 2.12 · HIP-0300 MCP`,
        docsBtn,
      ),
    )
    body.appendChild(card)
  }

  backdrop.addEventListener('mousedown', (e) => {
    if (e.target === backdrop) close()
  })

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      close()
      return
    }
    if (
      e.key === '/' &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey &&
      document.activeElement?.tagName !== 'INPUT' &&
      document.activeElement?.tagName !== 'TEXTAREA'
    ) {
      e.preventDefault()
      searchInput.focus()
      searchInput.select()
    }
  }
  window.addEventListener('keydown', onKey)

  renderNav()
  void renderBody()
  document.body.appendChild(backdrop)
}
