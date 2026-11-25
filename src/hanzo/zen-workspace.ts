/**
 * Hanzo IDE — Zen Layout Controller, Minimal Welcome Canvas, Left Sidebar
 * Mini Switcher, and Integrated Browser Preview (`v0.2.0`).
 *
 * Bridges the minimal editor-first Zen layout (`hanzo-ide.html` + `Hanzo Dev`)
 * directly onto VS Code's real `IWorkbenchLayoutService` & Monaco services.
 */

import './zen-workspace.css'
import { renderHanzoMarkSvg, zenIcon } from './brand.ts'
import { getWorkspace } from './ide-context.ts'
import { formatQuickTopbarLabel } from './mcp-catalog.ts'
import { HANZO_SHELL_GEOMETRY, isMacDesktopPlatform } from './theme.ts'
import {
  getWorkspacePath,
  openWorkspaceFolderPath,
  pickAndOpenFile,
  pickAndOpenFolder,
} from './workspace.ts'

function activeWorkspacePath(): string | null {
  return getWorkspacePath() ?? getWorkspace()
}

const LEFT_VIEW_COMMANDS: Record<ZenLeftView, string> = {
  Explorer: 'workbench.view.explorer',
  Search: 'workbench.view.search',
  'Source control': 'workbench.view.scm',
  'Run and debug': 'workbench.view.debug',
}

export type ZenPanelKey = 'left' | 'right' | 'bottom' | 'browser' | 'integrations'
export type ZenLeftView = 'Explorer' | 'Search' | 'Source control' | 'Run and debug'

interface PersistedZenState {
  left: boolean
  right: boolean
  bottom: boolean
  browser: boolean
  integrations: boolean
  leftView: ZenLeftView
  traditionalActivityBar: boolean
}

const RECENT_FOLDERS_KEY = 'hanzo.ide.recentFolders'
const TRADITIONAL_AB_KEY = 'hanzo.ide.traditionalActivityBar'

const DEFAULT_ZEN_STATE: PersistedZenState = {
  left: false,
  right: false,
  bottom: false,
  browser: false,
  integrations: false,
  leftView: 'Explorer',
  traditionalActivityBar: false,
}

let state: PersistedZenState = { ...DEFAULT_ZEN_STATE }
let focusMode = false
let layoutServiceRef: any = null
let commandServiceRef: any = null
let editorServiceRef: any = null
let paneCompositeServiceRef: any = null
let viewsServiceRef: any = null
let welcomeEl: HTMLElement | null = null
let browserEl: HTMLElement | null = null
let scratchHintEl: HTMLElement | null = null
let leftTitleEl: HTMLElement | null = null
let leftChromeEl: HTMLElement | null = null
let toastTimer: ReturnType<typeof setTimeout> | null = null

export interface ZenActiveTargetInfo {
  label: string
  kind: 'workspace' | 'quick-file' | 'scratch' | 'empty'
}

const rightDockModeListeners = new Set<(mode: 'agent' | 'integrations') => void>()
const activeTargetListeners = new Set<(info: ZenActiveTargetInfo) => void>()
let currentActiveTarget: ZenActiveTargetInfo = { label: '', kind: 'empty' }

export function onZenActiveTargetChange(cb: (info: ZenActiveTargetInfo) => void): () => void {
  activeTargetListeners.add(cb)
  cb(currentActiveTarget)
  return () => activeTargetListeners.delete(cb)
}

export function onRightDockModeChange(cb: (mode: 'agent' | 'integrations') => void): () => void {
  rightDockModeListeners.add(cb)
  cb(state.integrations ? 'integrations' : 'agent')
  return () => rightDockModeListeners.delete(cb)
}

export function getRightDockMode(): 'agent' | 'integrations' {
  return state.integrations ? 'integrations' : 'agent'
}

function storageKeyForWorkspace(): string {
  const ws = activeWorkspacePath() || '__empty__'
  return `hanzo.ide.zenLayout.v2:${ws}`
}

function readRecentFolders(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_FOLDERS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed)
      ? parsed.filter((p): p is string => typeof p === 'string' && p.length > 0)
      : []
  } catch {
    return []
  }
}

export function recordZenRecentFolder(path: string | null): void {
  if (!path) return
  try {
    const next = [path, ...readRecentFolders().filter((p) => p !== path)].slice(0, 8)
    localStorage.setItem(RECENT_FOLDERS_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}

export function getZenRecentFolders(): string[] {
  return readRecentFolders()
}

export function formatWorkspaceLabel(wsPath: string | null): string {
  if (!wsPath) return 'Open folder…'
  const parts = wsPath.replace(/[\\/]+$/, '').split(/[\\/]/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[parts.length - 2]} / ${parts[parts.length - 1]}`
  }
  return parts[parts.length - 1] || wsPath
}

function loadState(): PersistedZenState {
  const params = new URLSearchParams(window.location.search)
  const preset = params.get('zenLayout')
  const traditionalAb = localStorage.getItem(TRADITIONAL_AB_KEY) === 'true'
  if (preset === 'default') {
    return { ...DEFAULT_ZEN_STATE, traditionalActivityBar: traditionalAb }
  }
  if (preset === 'expanded') {
    return {
      left: true,
      right: true,
      bottom: true,
      browser: false,
      integrations: false,
      leftView: 'Explorer',
      traditionalActivityBar: traditionalAb,
    }
  }
  if (preset === 'mcp') {
    return {
      left: false,
      right: false,
      bottom: false,
      browser: false,
      integrations: true,
      leftView: 'Explorer',
      traditionalActivityBar: traditionalAb,
    }
  }
  try {
    const raw = localStorage.getItem(storageKeyForWorkspace())
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        ...DEFAULT_ZEN_STATE,
        ...parsed,
        traditionalActivityBar: traditionalAb,
      }
    }
  } catch {
    /* ignore */
  }
  const hasOpenFolder = Boolean(activeWorkspacePath())
  return {
    ...DEFAULT_ZEN_STATE,
    left: hasOpenFolder,
    leftView: 'Explorer',
    traditionalActivityBar: traditionalAb,
  }
}

function persistState(): void {
  try {
    localStorage.setItem(storageKeyForWorkspace(), JSON.stringify(state))
    localStorage.setItem(TRADITIONAL_AB_KEY, state.traditionalActivityBar ? 'true' : 'false')
  } catch {
    /* ignore */
  }
}

export function showZenToast(msg: string): void {
  let el = document.getElementById('hanzo-zen-toast') as HTMLDivElement | null
  if (!el) {
    el = document.createElement('div')
    el.id = 'hanzo-zen-toast'
    el.className = 'hanzo-zen-toast'
    el.setAttribute('role', 'status')
    document.body.appendChild(el)
  }
  el.textContent = msg
  el.hidden = false
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    if (el) el.hidden = true
  }, 2600)
}

async function ensureServices(): Promise<void> {
  if (layoutServiceRef && commandServiceRef) return
  try {
    const { StandaloneServices, getService, IEditorService } = await import(
      '@codingame/monaco-vscode-api/services'
    )
    const { IWorkbenchLayoutService } = await import(
      '@codingame/monaco-vscode-api/vscode/vs/workbench/services/layout/browser/layoutService.service'
    )
    const { ICommandService } = await import(
      '@codingame/monaco-vscode-api/vscode/vs/platform/commands/common/commands'
    )
    layoutServiceRef = StandaloneServices.get(IWorkbenchLayoutService)
    commandServiceRef = StandaloneServices.get(ICommandService)
    editorServiceRef = await getService(IEditorService).catch(() => null)
    try {
      const { IPaneCompositePartService } = await import(
        '@codingame/monaco-vscode-api/vscode/vs/workbench/services/panecomposite/browser/panecomposite.service'
      )
      paneCompositeServiceRef = StandaloneServices.get(IPaneCompositePartService)
    } catch {
      /* optional */
    }
    try {
      const { IViewsService } = await import(
        '@codingame/monaco-vscode-api/vscode/vs/workbench/services/views/common/viewsService.service'
      )
      viewsServiceRef = StandaloneServices.get(IViewsService)
    } catch {
      /* optional */
    }
  } catch (e) {
    console.warn('[hanzo-zen] service resolution skipped:', e)
  }
}

export async function execZenCommand(commandId: string, ...args: unknown[]): Promise<void> {
  await ensureServices()
  try {
    await commandServiceRef?.executeCommand?.(commandId, ...args)
  } catch (e) {
    console.warn('[hanzo-zen] command failed:', commandId, e)
  }
}

function inspectOpenEditors(): {
  openCount: number
  activeFilePath: string | null
  isUntitledScratch: boolean
  untitledLabel: string | null
} {
  const editors = Array.isArray(editorServiceRef?.editors) ? editorServiceRef.editors : []
  const domTabs = document.querySelectorAll(
    '.monaco-workbench .part.editor .tabs-container > .tab',
  )
  const openCount = Math.max(editors.length, domTabs.length)
  const activeInput = editorServiceRef?.activeEditor ?? editors[0] ?? null
  const resource = activeInput?.resource ?? null
  const scheme = resource?.scheme || ''
  const isUntitledScratch =
    openCount > 0 && (scheme === 'untitled' || /^Untitled-\d+/i.test(activeInput?.getName?.() ?? ''))
  const activeFilePath =
    scheme === 'file' ? (resource?.fsPath || resource?.path || null) : null
  const untitledLabel = isUntitledScratch ? 'New file · Scratch' : null
  return { openCount, activeFilePath, isUntitledScratch, untitledLabel }
}

function syncToolbarPressedAttributes(): void {
  const map: Record<ZenPanelKey, boolean> = {
    left: state.left,
    right: state.right && !state.integrations,
    bottom: state.bottom,
    browser: state.browser,
    integrations: state.integrations,
  }
  for (const key of Object.keys(map) as ZenPanelKey[]) {
    document.querySelectorAll<HTMLElement>(`[data-zen-panel="${key}"]`).forEach((btn) => {
      btn.setAttribute('aria-pressed', String(map[key]))
    })
  }
}

function syncWelcomeAndStatusVisibility(): void {
  const { openCount, activeFilePath, isUntitledScratch, untitledLabel } = inspectOpenEditors()
  const anyEditor = openCount > 0
  const ws = activeWorkspacePath()
  const hasWorkspace = Boolean(ws)

  // Single-file / scratch distraction-free mode: hide tab strip clutter only when <2 tabs & no folder,
  // or when editing an untitled scratch file!
  document.documentElement.dataset.zenSingleTab = String(openCount === 1 && !hasWorkspace)
  document.documentElement.dataset.zenScratch = String(openCount === 1 && isUntitledScratch)

  const nextTarget = formatQuickTopbarLabel({
    workspacePath: ws,
    activeFilePath,
    isUntitledScratch,
    untitledLabel,
  })
  if (
    nextTarget.label !== currentActiveTarget.label ||
    nextTarget.kind !== currentActiveTarget.kind
  ) {
    currentActiveTarget = nextTarget
    activeTargetListeners.forEach((cb) => cb(currentActiveTarget))
  }

  if (welcomeEl) {
    welcomeEl.hidden = anyEditor || state.browser
  }
  if (browserEl) {
    browserEl.hidden = !state.browser
  }
  document.documentElement.dataset.zenBrowser = String(state.browser)
  if (scratchHintEl) {
    scratchHintEl.hidden = !(anyEditor && !state.browser && openCount === 1)
  }

  // Contextual 23px statusbar: hidden on clean empty welcome screen, shown when editing or workspace open!
  const isEmptyWelcome = !anyEditor && !hasWorkspace
  document.documentElement.dataset.zenEmpty = String(isEmptyWelcome)
  const showStatus = !isEmptyWelcome && !focusMode
  if (layoutServiceRef) {
    try {
      const currentlyVisible = layoutServiceRef.isVisible?.('workbench.parts.statusbar', window)
      if (currentlyVisible !== showStatus) {
        if (typeof layoutServiceRef.setStatusBarHidden === 'function') {
          layoutServiceRef.setStatusBarHidden(!showStatus)
        } else {
          layoutServiceRef.setPartHidden?.(!showStatus, 'workbench.parts.statusbar')
        }
        layoutServiceRef.layout?.()
      }
    } catch {
      /* ignore */
    }
  }
}

function ensureComfortablePaneSizes(): void {
  if (!layoutServiceRef?.resizePart || window.innerWidth < 960) return
  try {
    if (state.left) {
      const sideEl = document.querySelector<HTMLElement>('.monaco-workbench .part.sidebar')
      if (sideEl && sideEl.offsetWidth > 0 && Math.abs(sideEl.offsetWidth - HANZO_SHELL_GEOMETRY.sidebarDefaultWidthPx) > 48) {
        layoutServiceRef.resizePart(
          'workbench.parts.sidebar',
          HANZO_SHELL_GEOMETRY.sidebarDefaultWidthPx - sideEl.offsetWidth,
          0,
        )
      }
    }
    if (state.right || state.integrations) {
      const auxEl = document.querySelector<HTMLElement>('.monaco-workbench .part.auxiliarybar')
      if (auxEl && auxEl.offsetWidth > 0 && auxEl.offsetWidth < 320) {
        layoutServiceRef.resizePart(
          'workbench.parts.auxiliarybar',
          HANZO_SHELL_GEOMETRY.rightSidebarDefaultWidthPx - auxEl.offsetWidth,
          0,
        )
      }
    }
  } catch {
    /* ignore */
  }
}

async function applyPartsVisibility(): Promise<void> {
  await ensureServices()
  document.documentElement.dataset.zenTraditionalActivitybar = state.traditionalActivityBar
    ? 'true'
    : 'false'

  if (layoutServiceRef?.setPartHidden) {
    try {
      layoutServiceRef.setPartHidden(!state.traditionalActivityBar, 'workbench.parts.activitybar')
      layoutServiceRef.setPartHidden(!state.left, 'workbench.parts.sidebar')
      layoutServiceRef.setPartHidden(!state.bottom, 'workbench.parts.panel')
      layoutServiceRef.setPartHidden(
        !(state.right || state.integrations),
        'workbench.parts.auxiliarybar',
      )
    } catch (e) {
      console.warn('[hanzo-zen] setPartHidden warning:', e)
    }
  }

  if (state.left) {
    const viewletId = LEFT_VIEW_COMMANDS[state.leftView] || 'workbench.view.explorer'
    try {
      await paneCompositeServiceRef?.openPaneComposite?.(viewletId, 0, false)
    } catch {
      await execZenCommand(viewletId)
    }
    mountLeftSidebarMiniSwitcher()
  }

  if (state.right || state.integrations) {
    try {
      await viewsServiceRef?.openView?.('hanzo.chat', false)
    } catch {
      try {
        await paneCompositeServiceRef?.openPaneComposite?.('hanzo.chat', 2, false)
      } catch {
        /* ignore */
      }
    }
  }
  layoutServiceRef?.layout?.()

  rightDockModeListeners.forEach((cb) => cb(state.integrations ? 'integrations' : 'agent'))
  syncToolbarPressedAttributes()
  syncWelcomeAndStatusVisibility()
  setTimeout(() => {
    ensureComfortablePaneSizes()
    syncWelcomeAndStatusVisibility()
    layoutServiceRef?.layout?.()
  }, 80)
  setTimeout(() => {
    ensureComfortablePaneSizes()
    syncWelcomeAndStatusVisibility()
    layoutServiceRef?.layout?.()
  }, 450)
}

export async function ensureExplorerOpenForWorkspace(): Promise<void> {
  state.left = true
  state.leftView = 'Explorer'
  persistState()
  if (leftTitleEl) leftTitleEl.textContent = 'Explorer'
  leftChromeEl?.querySelectorAll<HTMLElement>('[data-zen-left]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.zenLeft === 'Explorer'))
  })
  await applyPartsVisibility()
  await execZenCommand('workbench.view.explorer')
  layoutServiceRef?.layout?.()
}

export async function toggleZenPanel(panel: ZenPanelKey): Promise<void> {
  await ensureServices()
  if (panel === 'left') {
    state.left = !state.left
  } else if (panel === 'bottom') {
    state.bottom = !state.bottom
    if (state.bottom && layoutServiceRef) {
      await applyPartsVisibility()
      persistState()
      void execZenCommand('workbench.action.terminal.focus')
      return
    }
  } else if (panel === 'browser') {
    state.browser = !state.browser
    if (state.browser) {
      queueMicrotask(() => {
        browserEl?.dispatchEvent(new CustomEvent('hanzo:browser-opened'))
      })
    }
  } else if (panel === 'right') {
    if (state.integrations) {
      state.integrations = false
      state.right = true
    } else {
      state.right = !state.right
    }
  } else if (panel === 'integrations') {
    if (state.integrations) {
      state.integrations = false
      state.right = false
    } else {
      state.integrations = true
      state.right = false
    }
  }
  persistState()
  await applyPartsVisibility()
}

export async function closeRightDock(): Promise<void> {
  state.right = false
  state.integrations = false
  persistState()
  await applyPartsVisibility()
}

export async function switchLeftSidebarView(view: ZenLeftView): Promise<void> {
  state.leftView = view
  state.left = true
  persistState()
  if (leftTitleEl) leftTitleEl.textContent = view
  leftChromeEl?.querySelectorAll<HTMLElement>('[data-zen-left]').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.zenLeft === view))
  })
  await applyPartsVisibility()
  await execZenCommand(LEFT_VIEW_COMMANDS[view])
  layoutServiceRef?.layout?.()
}

export async function toggleTraditionalActivityBar(): Promise<void> {
  state.traditionalActivityBar = !state.traditionalActivityBar
  persistState()
  const { updateUserConfiguration } = await import(
    '@codingame/monaco-vscode-configuration-service-override'
  )
  await updateUserConfiguration(
    JSON.stringify({
      'workbench.activityBar.location': state.traditionalActivityBar ? 'default' : 'hidden',
    }),
  ).catch(() => {})
  await applyPartsVisibility()
  showZenToast(
    state.traditionalActivityBar
      ? 'Traditional Activity Bar enabled'
      : 'Minimal Zen layout active',
  )
}

export function toggleZenFocusMode(force?: boolean): void {
  focusMode = typeof force === 'boolean' ? force : !focusMode
  document.documentElement.dataset.zenFocus = focusMode ? 'true' : 'false'
  syncWelcomeAndStatusVisibility()
  layoutServiceRef?.layout?.()
  if (focusMode) showZenToast('Focus mode · Esc to exit')
}

export async function resetZenDefaultLayout(): Promise<void> {
  focusMode = false
  document.documentElement.dataset.zenFocus = 'false'
  state = { ...DEFAULT_ZEN_STATE, traditionalActivityBar: false }
  persistState()
  await execZenCommand('workbench.action.closeAllEditors').catch(() => {})
  await applyPartsVisibility()
  showZenToast('Reset to minimal Zen layout')
}

function mountWelcomeAndBrowserInEditor(): void {
  const editorPart = document.querySelector<HTMLElement>('.monaco-workbench .part.editor')
  if (!editorPart) return
  editorPart.style.position = 'relative'

  if (!welcomeEl) {
    const isMac = isMacDesktopPlatform()
    welcomeEl = document.createElement('section')
    welcomeEl.id = 'hanzo-zen-welcome'
    welcomeEl.className = 'hanzo-zen-welcome'

    const inner = document.createElement('div')
    inner.className = 'hanzo-zen-welcome-inner'

    const logoWrap = document.createElement('div')
    logoWrap.className = 'hanzo-zen-welcome-logo'
    logoWrap.innerHTML = renderHanzoMarkSvg(40)
    inner.appendChild(logoWrap)

    const actions = document.createElement('div')
    actions.className = 'hanzo-zen-actions'

    const recentSection = document.createElement('div')
    recentSection.className = 'hanzo-zen-recent'
    recentSection.hidden = true

    const populateRecents = () => {
      recentSection.replaceChildren()
      const title = document.createElement('div')
      title.className = 'hanzo-zen-recent-title'
      title.textContent = 'Recent workspaces'
      recentSection.appendChild(title)
      const list = readRecentFolders()
      if (list.length === 0) {
        const empty = document.createElement('div')
        empty.className = 'hanzo-zen-recent-title'
        empty.textContent = 'No recent folders yet — click Open folder above.'
        recentSection.appendChild(empty)
        return
      }
      for (const folderPath of list.slice(0, 5)) {
        const b = document.createElement('button')
        b.type = 'button'
        b.className = 'hanzo-zen-recent-btn'
        b.innerHTML = `${zenIcon('folder', 14)}<span>${formatWorkspaceLabel(folderPath)}</span>`
        b.addEventListener('click', () => {
          recordZenRecentFolder(folderPath)
          openWorkspaceFolderPath(folderPath)
        })
        recentSection.appendChild(b)
      }
    }

    const rows: Array<{
      icon: 'folder' | 'file' | 'new' | 'clock'
      label: string
      keys: string[]
      onClick: () => void
    }> = [
      {
        icon: 'new',
        label: 'New file',
        keys: isMac ? ['⌘N'] : ['Ctrl N'],
        onClick: () => void execZenCommand('workbench.action.files.newUntitledFile'),
      },
      {
        icon: 'file',
        label: 'Open file',
        keys: isMac ? ['⌘O'] : ['Ctrl O'],
        onClick: () => void pickAndOpenFile(),
      },
      {
        icon: 'folder',
        label: 'Open folder',
        keys: isMac ? ['⌘O'] : ['Ctrl K', 'Ctrl O'],
        onClick: () => void pickAndOpenFolder(),
      },
      {
        icon: 'clock',
        label: 'Open recent',
        keys: isMac ? ['⌘R'] : ['Ctrl R'],
        onClick: () => {
          populateRecents()
          recentSection.hidden = !recentSection.hidden
        },
      },
    ]

    for (const row of rows) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'hanzo-zen-action'
      const keysHtml = row.keys.map((k) => `<kbd class="hanzo-zen-kbd">${k}</kbd>`).join('')
      btn.innerHTML = `<span class="hanzo-zen-act-label">${zenIcon(row.icon, 15)}<span>${row.label}</span></span><span class="hanzo-zen-keys">${keysHtml}</span>`
      btn.addEventListener('click', row.onClick)
      actions.appendChild(btn)
    }

    inner.append(actions, recentSection)
    welcomeEl.appendChild(inner)
    editorPart.appendChild(welcomeEl)
  }

  if (!browserEl) {
    browserEl = document.createElement('section')
    browserEl.id = 'hanzo-zen-browser'
    browserEl.className = 'hanzo-zen-browser'
    browserEl.hidden = true

    const addr = document.createElement('div')
    addr.className = 'hanzo-zen-browser-address'

    const backBtn = document.createElement('button')
    backBtn.type = 'button'
    backBtn.className = 'hanzo-zen-ib'
    backBtn.title = 'Back'
    backBtn.innerHTML = zenIcon('back', 15)

    const fwdBtn = document.createElement('button')
    fwdBtn.type = 'button'
    fwdBtn.className = 'hanzo-zen-ib'
    fwdBtn.title = 'Forward'
    fwdBtn.innerHTML = zenIcon('forward', 15)

    const reloadBtn = document.createElement('button')
    reloadBtn.type = 'button'
    reloadBtn.className = 'hanzo-zen-ib'
    reloadBtn.title = 'Reload preview'
    reloadBtn.innerHTML = zenIcon('refresh', 15)

    const urlInput = document.createElement('input')
    urlInput.type = 'text'
    urlInput.className = 'hanzo-zen-browser-url'
    urlInput.setAttribute('aria-label', 'Preview address')
    urlInput.value = localStorage.getItem('hanzo.ide.browserUrl') || 'http://localhost:3000'

    const extBtn = document.createElement('button')
    extBtn.type = 'button'
    extBtn.className = 'hanzo-zen-ib'
    extBtn.title = 'Open in system browser'
    extBtn.setAttribute('aria-label', 'Open in system browser')
    extBtn.innerHTML = zenIcon('popout', 14)
    extBtn.addEventListener('click', async () => {
      const targetUrl = urlInput.value.trim() || 'http://localhost:3000'
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        await invoke('open_external', { url: targetUrl })
      } catch {
        window.open(targetUrl, '_blank', 'noopener')
      }
    })

    const closeBtn = document.createElement('button')
    closeBtn.type = 'button'
    closeBtn.className = 'hanzo-zen-ib'
    closeBtn.title = 'Close browser'
    closeBtn.setAttribute('aria-label', 'Close browser')
    closeBtn.innerHTML = zenIcon('close', 15)
    closeBtn.addEventListener('click', () => void toggleZenPanel('browser'))

    addr.append(backBtn, fwdBtn, reloadBtn, urlInput, extBtn, closeBtn)

    const stage = document.createElement('div')
    stage.className = 'hanzo-zen-browser-stage'

    const empty = document.createElement('div')
    empty.className = 'hanzo-zen-browser-empty'
    const emptyInner = document.createElement('div')
    emptyInner.className = 'hanzo-zen-browser-empty-inner'
    const previewLabel = document.createElement('p')
    previewLabel.textContent = 'Local application preview · Enter a dev server URL or pick a port below'
    emptyInner.innerHTML = `${renderHanzoMarkSvg(32)}<h1>Build what’s next.</h1>`
    emptyInner.appendChild(previewLabel)

    const portBar = document.createElement('div')
    portBar.className = 'hanzo-zen-browser-ports'
    for (const port of [3000, 5173, 8080, 4321]) {
      const chip = document.createElement('button')
      chip.type = 'button'
      chip.className = 'hanzo-zen-browser-port'
      chip.textContent = `localhost:${port}`
      chip.addEventListener('click', () => navigateTo(`http://localhost:${port}`))
      portBar.appendChild(chip)
    }
    emptyInner.appendChild(portBar)
    empty.appendChild(emptyInner)

    const iframe = document.createElement('iframe')
    iframe.className = 'hanzo-zen-browser-iframe'
    iframe.title = 'Workspace Browser Preview'
    iframe.hidden = true

    const probePort = async (url: string): Promise<boolean> => {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 600)
      try {
        await fetch(url, { mode: 'no-cors', signal: ctrl.signal })
        return true
      } catch {
        return false
      } finally {
        clearTimeout(timer)
      }
    }

    const navigateTo = (rawUrl: string) => {
      const trimmed = rawUrl.trim() || 'http://localhost:3000'
      const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`
      urlInput.value = normalized
      try {
        localStorage.setItem('hanzo.ide.browserUrl', normalized)
      } catch {
        /* ignore */
      }
      previewLabel.textContent = `${normalized} · Connecting…`
      void probePort(normalized).then((ok) => {
        if (ok) {
          empty.hidden = true
          iframe.hidden = false
          if (iframe.src !== normalized) iframe.src = normalized
        } else {
          iframe.hidden = true
          empty.hidden = false
          previewLabel.textContent = `${normalized} · Waiting for local dev server`
        }
      })
    }

    let autoProbed = false
    browserEl.addEventListener('hanzo:browser-opened', async () => {
      if (autoProbed && empty.hidden) return
      autoProbed = true
      const cur = urlInput.value.trim() || 'http://localhost:3000'
      if (await probePort(cur)) {
        navigateTo(cur)
        return
      }
      for (const port of [3000, 5173, 8080, 4321]) {
        const candidate = `http://localhost:${port}`
        if (candidate !== cur && (await probePort(candidate))) {
          navigateTo(candidate)
          return
        }
      }
    })

    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') navigateTo(urlInput.value)
    })
    reloadBtn.addEventListener('click', () => navigateTo(urlInput.value))
    backBtn.addEventListener('click', () => {
      try {
        iframe.contentWindow?.history.back()
      } catch {
        /* cross-origin */
      }
    })
    fwdBtn.addEventListener('click', () => {
      try {
        iframe.contentWindow?.history.forward()
      } catch {
        /* cross-origin */
      }
    })

    stage.append(empty, iframe)
    browserEl.append(addr, stage)
    editorPart.appendChild(browserEl)
  }

  if (!scratchHintEl) {
    const isMac = isMacDesktopPlatform()
    scratchHintEl = document.createElement('div')
    scratchHintEl.className = 'hanzo-zen-inline-hint'
    scratchHintEl.hidden = true
    scratchHintEl.innerHTML = isMac
      ? '<span><kbd>⌘K</kbd> Inline AI</span><span>·</span><span><kbd>⌘P</kbd> Quick Open</span><span>·</span><span><kbd>⌥⌘B</kbd> Agent</span>'
      : '<span><kbd>Ctrl K</kbd> Inline AI</span><span>·</span><span><kbd>Ctrl P</kbd> Quick Open</span><span>·</span><span><kbd>Ctrl Alt B</kbd> Agent</span>'
    editorPart.appendChild(scratchHintEl)
  }
}

function mountLeftSidebarMiniSwitcher(): void {
  const sidebar = document.querySelector<HTMLElement>('.monaco-workbench .part.sidebar')
  if (!sidebar || sidebar.querySelector('#hanzo-zen-left-chrome')) return

  leftChromeEl = document.createElement('div')
  leftChromeEl.id = 'hanzo-zen-left-chrome'
  leftChromeEl.className = 'hanzo-zen-left-chrome'

  const head = document.createElement('div')
  head.className = 'hanzo-zen-phead'

  leftTitleEl = document.createElement('span')
  leftTitleEl.id = 'hanzo-zen-left-title'
  leftTitleEl.textContent = state.leftView

  const grow = document.createElement('div')
  grow.className = 'hanzo-zen-phead-grow'

  const plusBtn = document.createElement('button')
  plusBtn.type = 'button'
  plusBtn.className = 'hanzo-zen-ib'
  plusBtn.title = 'New file'
  plusBtn.setAttribute('aria-label', 'New file')
  plusBtn.innerHTML = zenIcon('plus', 15)
  plusBtn.addEventListener('click', () => {
    if (activeWorkspacePath() && state.leftView === 'Explorer') {
      void execZenCommand('explorer.newFile')
    } else {
      void execZenCommand('workbench.action.files.newUntitledFile')
    }
  })

  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.className = 'hanzo-zen-ib'
  closeBtn.title = 'Close sidebar'
  closeBtn.setAttribute('aria-label', 'Close sidebar')
  closeBtn.innerHTML = zenIcon('close', 15)
  closeBtn.addEventListener('click', () => void toggleZenPanel('left'))

  head.append(leftTitleEl, grow, plusBtn, closeBtn)

  const tabs = document.createElement('div')
  tabs.className = 'hanzo-zen-pane-tabs'

  const tabSpecs: Array<{ view: ZenLeftView; icon: 'folder' | 'search' | 'git' | 'debug' }> = [
    { view: 'Explorer', icon: 'folder' },
    { view: 'Search', icon: 'search' },
    { view: 'Source control', icon: 'git' },
    { view: 'Run and debug', icon: 'debug' },
  ]

  for (const spec of tabSpecs) {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'hanzo-zen-ib'
    b.dataset.zenLeft = spec.view
    b.title = spec.view
    b.setAttribute('aria-label', spec.view)
    b.setAttribute('aria-pressed', String(state.leftView === spec.view))
    b.innerHTML = zenIcon(spec.icon, 15)
    b.addEventListener('click', () => void switchLeftSidebarView(spec.view))
    tabs.appendChild(b)
  }

  leftChromeEl.append(head, tabs)
  sidebar.prepend(leftChromeEl)
}

function mountEditorTabBarPlusButton(): void {
  document
    .querySelectorAll<HTMLElement>(
      '.monaco-workbench .part.editor .tabs-and-actions-container',
    )
    .forEach((bar) => {
      if (bar.querySelector('.hanzo-zen-tab-add')) return
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'hanzo-zen-ib hanzo-zen-tab-add'
      btn.title = 'New file (Ctrl+N)'
      btn.setAttribute('aria-label', 'New file')
      btn.innerHTML = zenIcon('plus', 14)
      btn.addEventListener('click', () => {
        void execZenCommand('workbench.action.files.newUntitledFile')
      })
      const tabsScroller = bar.querySelector('.monaco-scrollable-element')
      if (tabsScroller?.nextSibling) {
        bar.insertBefore(btn, tabsScroller.nextSibling)
      } else {
        bar.appendChild(btn)
      }
    })
}

export async function initializeZenWorkspace(): Promise<void> {
  const ws = activeWorkspacePath()
  if (ws) recordZenRecentFolder(ws)
  state = loadState()

  await ensureServices()
  mountWelcomeAndBrowserInEditor()
  mountLeftSidebarMiniSwitcher()
  mountEditorTabBarPlusButton()

  await applyPartsVisibility()

  // Keep toolbar buttons synced whenever VS Code shortcuts/commands toggle parts directly!
  if (layoutServiceRef?.onDidChangePartVisibility) {
    layoutServiceRef.onDidChangePartVisibility((ev: { partId: string; visible: boolean }) => {
      if (ev.partId === 'workbench.parts.sidebar') {
        state.left = ev.visible
      } else if (ev.partId === 'workbench.parts.panel') {
        state.bottom = ev.visible
      } else if (ev.partId === 'workbench.parts.auxiliarybar') {
        if (!ev.visible) {
          state.right = false
          state.integrations = false
        } else if (!state.right && !state.integrations) {
          state.right = true
        }
      }
      persistState()
      syncToolbarPressedAttributes()
      setTimeout(ensureComfortablePaneSizes, 30)
    })
  }

  if (editorServiceRef?.onDidEditorsChange) {
    editorServiceRef.onDidEditorsChange(() => {
      mountEditorTabBarPlusButton()
      syncWelcomeAndStatusVisibility()
    })
  }
  if (editorServiceRef?.onDidActiveEditorChange) {
    editorServiceRef.onDidActiveEditorChange(() => {
      syncWelcomeAndStatusVisibility()
    })
  }

  const editorContainer = document.querySelector('.monaco-workbench .part.editor')
  if (editorContainer) {
    const obs = new MutationObserver(() => {
      mountEditorTabBarPlusButton()
      syncWelcomeAndStatusVisibility()
    })
    obs.observe(editorContainer, { childList: true, subtree: true })
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && focusMode) {
      e.preventDefault()
      toggleZenFocusMode(false)
    }
  })
}
