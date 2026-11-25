/**
 * Canonical Hanzo IDE — Zen Theme Engine, Geometry, Keybindings & Model Policy.
 *
 * Unifies `Hanzo IDE` (`ai.hanzo.ide` v0.2.0) with `Hanzo Dev` (`themePalettes.ts`):
 *   - `zen` (Default Dark): `#000000` chrome/status, `#090909` editor canvas,
 *     `#0c0c0c` panels/sidebars, `#0b0b0b` tab strip, `#141414` surfaces/menus,
 *     `#191919` active tab, `#1b1b1b` hover/pressed, `#222222` 1px borders,
 *     `#e5e5e5` foreground, `#a0a0a0` muted, restrained Zen syntax colors.
 *   - `clay` (Dark Clay): `#141418` chrome, `#111016` editor, `#0e0d12` sidebar,
 *     `#1a1921` surface, `#2c2a38` border, `#d11641` accent.
 *   - `light` (Zen Light): `#ffffff` chrome/surface, `#fafafa` editor/terminal,
 *     `#f7f7f7` sidebar, `#efefef` hover, `#e4e4e7` border, `#27272a` ink.
 */

export type HanzoAppearance = 'dark' | 'light'
export type HanzoThemeId = 'zen' | 'clay' | 'light'

export interface HanzoShellPalette {
  id: HanzoThemeId
  name: string
  aliases: readonly string[]
  appearance: HanzoAppearance
  baseVsCodeTheme: string
  chrome: string
  chromeBorder: string
  floor: string
  rail: string
  sidebar: string
  tabBar: string
  tabActive: string
  stage: string
  surfaceRaised: string
  surfaceCard: string
  border: string
  borderSubtle: string
  rowHover: string
  rowActive: string
  inkPrimary: string
  inkSecondary: string
  inkMuted: string
  accent: string
  accentPill: string
  accentInk: string
  statusLive: string
  statusWarning: string
  statusError: string
}

/** Default Zen Dark workspace palette (matches `hanzo-ide.html` + `ZEN_THEME.variants.dark`). */
export const HANZO_ZEN_PALETTE: HanzoShellPalette = {
  id: 'zen',
  name: 'Zen',
  aliases: ['Zen', 'Hanzo Dark', 'Hanzo Obsidian'],
  appearance: 'dark',
  baseVsCodeTheme: 'Default Dark Modern',
  chrome: '#000000',
  chromeBorder: '#171717',
  floor: '#000000',
  rail: '#0c0c0c',
  sidebar: '#0c0c0c',
  tabBar: '#0b0b0b',
  tabActive: '#191919',
  stage: '#090909',
  surfaceRaised: '#141414',
  surfaceCard: '#141414',
  border: '#222222',
  borderSubtle: '#1b1b1b',
  rowHover: '#1b1b1b',
  rowActive: '#1c1c1c',
  inkPrimary: '#e5e5e5',
  inkSecondary: '#a0a0a0',
  inkMuted: '#777777',
  accent: '#e5e5e5',
  accentPill: '#242424',
  accentInk: '#111111',
  statusLive: '#82a681',
  statusWarning: '#fe9a00',
  statusError: '#fb414a',
}

/** Clay Dark workspace palette (matches `CLAY_THEME.variants.dark` in `Hanzo Dev`). */
export const HANZO_CLAY_PALETTE: HanzoShellPalette = {
  id: 'clay',
  name: 'Clay',
  aliases: ['Clay', 'Hanzo Clay'],
  appearance: 'dark',
  baseVsCodeTheme: 'Default Dark Modern',
  chrome: '#141418',
  chromeBorder: '#282633',
  floor: '#141418',
  rail: '#0e0d12',
  sidebar: '#0e0d12',
  tabBar: '#121117',
  tabActive: '#23212c',
  stage: '#111016',
  surfaceRaised: '#23212c',
  surfaceCard: '#1a1921',
  border: '#2c2a38',
  borderSubtle: '#24222f',
  rowHover: '#1f1d28',
  rowActive: '#252230',
  inkPrimary: '#f4f2f8',
  inkSecondary: '#9b96ab',
  inkMuted: '#8c869e',
  accent: '#d11641',
  accentPill: '#262430',
  accentInk: '#ffffff',
  statusLive: '#10b981',
  statusWarning: '#fe9a00',
  statusError: '#fb414a',
}

/** Zen Light workspace palette (matches `ZEN_THEME.colors` in `Hanzo Dev`). */
export const HANZO_LIGHT_PALETTE: HanzoShellPalette = {
  id: 'light',
  name: 'Zen Light',
  aliases: ['Zen Light', 'Hanzo Light', 'Hanzo Alabaster'],
  appearance: 'light',
  baseVsCodeTheme: 'Default Light Modern',
  chrome: '#ffffff',
  chromeBorder: '#e4e4e7',
  floor: '#ffffff',
  rail: '#f7f7f7',
  sidebar: '#f7f7f7',
  tabBar: '#fafafa',
  tabActive: '#eaeaea',
  stage: '#ffffff',
  surfaceRaised: '#ffffff',
  surfaceCard: '#fafafa',
  border: '#e4e4e7',
  borderSubtle: '#ececef',
  rowHover: '#efefef',
  rowActive: '#eaeaea',
  inkPrimary: '#27272a',
  inkSecondary: '#71717b',
  inkMuted: '#8e8e98',
  accent: '#18181b',
  accentPill: '#f4f4f5',
  accentInk: '#ffffff',
  statusLive: '#16a34a',
  statusWarning: '#d97706',
  statusError: '#dc2626',
}

/** Backwards-compatible alias for `HANZO_ZEN_PALETTE`. */
export const HANZO_OBSIDIAN_PALETTE: HanzoShellPalette = HANZO_ZEN_PALETTE

export const HANZO_THEMES: readonly HanzoShellPalette[] = [
  HANZO_ZEN_PALETTE,
  HANZO_CLAY_PALETTE,
  HANZO_LIGHT_PALETTE,
] as const

export function getPaletteById(themeId: HanzoThemeId | string): HanzoShellPalette {
  if (themeId === 'clay') return HANZO_CLAY_PALETTE
  if (themeId === 'light') return HANZO_LIGHT_PALETTE
  return HANZO_ZEN_PALETTE
}

export const HANZO_SHELL_GEOMETRY = {
  titlebarHeightPx: 40,
  sidebarDefaultWidthPx: 248,
  sidebarMinWidthPx: 185,
  sidebarMaxWidthPx: 420,
  rightSidebarDefaultWidthPx: 340,
  bottomPanelDefaultHeightPx: 210,
  statusBarHeightPx: 23,
  pillRowRadiusPx: 6,
  trafficLightsInsetPx: 78,
} as const

export interface HanzoShortcutSpec {
  id: string
  mac: string
  winLinux: string
  command: string
  label: string
}

export const HANZO_DEFAULT_KEYBINDINGS: readonly HanzoShortcutSpec[] = [
  {
    id: 'sidebar.toggle',
    mac: '⌘B',
    winLinux: 'Ctrl+B',
    command: 'workbench.action.toggleSidebarVisibility',
    label: 'Toggle Left Sidebar',
  },
  {
    id: 'palette.open',
    mac: '⌘K',
    winLinux: 'Ctrl+K',
    command: 'hanzo.commandOrInlineEdit',
    label: 'Search or Run a Command',
  },
  {
    id: 'commands.all',
    mac: '⇧⌘P',
    winLinux: 'Ctrl+Shift+P',
    command: 'workbench.action.showCommands',
    label: 'Show All Commands',
  },
  {
    id: 'terminal.toggle',
    mac: '⌃`',
    winLinux: 'Ctrl+`',
    command: 'workbench.action.terminal.toggleTerminal',
    label: 'Toggle Terminal',
  },
  {
    id: 'settings.open',
    mac: '⌘,',
    winLinux: 'Ctrl+,',
    command: 'workbench.action.openSettings',
    label: 'Settings',
  },
  {
    id: 'agent.toggle',
    mac: '⌥⌘B',
    winLinux: 'Ctrl+Alt+B',
    command: 'workbench.action.toggleAuxiliaryBar',
    label: 'Toggle AI Sidebar',
  },
] as const

export const HANZO_DEFAULT_MODEL = 'enso'

export const HANZO_ZEN_MODEL_PRESETS = [
  'enso',
  'enso-auto',
  'enso-pro',
  'zen6-coder',
  'zen6',
  'zen6-flash',
  'zen6-max',
  'zen-vl',
] as const

export const HANZO_OLLAMA_MODEL_PRESETS = [
  'enso',
  'zen6-coder',
  'zen6-flash',
  'qwen3-coder:30b',
  'qwen3-coder',
  'qwen3:8b',
  'deepseek-coder-v2',
  'llama3.2',
] as const

/** Enforce the Zen 6 / Qwen3+ policy: Zen 6+ (or evergreen `zen*` / `enso*`) + Qwen3+ only, never Qwen2 or legacy zen1..zen5. */
export function isAllowedModelId(modelId: string): boolean {
  const lower = modelId.trim().toLowerCase()
  if (!lower) return false
  if (lower.includes('qwen2') || lower.includes('qwen-2')) return false
  if (/(?:^|\/)zen[1-5](?:\b|-|$)/.test(lower)) return false
  return true
}

export const HANZO_IAM_DEFAULTS = {
  issuer: 'https://hanzo.id',
  domainLabel: 'hanzo.id',
  clientId: 'hanzo-ide',
  orgHeader: 'X-Org-Id',
  orgStorageKey: 'hanzo.console.org',
  themeStorageKey: 'hanzo.ide.appearance',
  themeIdStorageKey: 'hanzo.ide.themeId',
} as const

export function buildPaletteColorMap(p: HanzoShellPalette): Record<string, string> {
  const isDark = p.appearance === 'dark'
  return {
    'activityBar.background': p.rail,
    'activityBar.activeBorder': p.accent,
    'activityBar.foreground': p.inkPrimary,
    'activityBar.inactiveForeground': p.inkMuted,
    'activityBarBadge.background': p.accent,
    'activityBarBadge.foreground': p.accentInk,
    'statusBar.background': p.chrome,
    'statusBar.foreground': isDark ? '#888888' : p.inkSecondary,
    'statusBar.noFolderBackground': p.chrome,
    'statusBar.debuggingBackground': p.surfaceCard,
    'statusBar.debuggingForeground': p.inkPrimary,
    'sideBar.background': p.sidebar,
    'sideBar.foreground': p.inkPrimary,
    'sideBarSectionHeader.background': p.sidebar,
    'sideBarSectionHeader.foreground': p.inkSecondary,
    'sideBarTitle.foreground': p.inkPrimary,
    'editor.background': p.stage,
    'editor.foreground': isDark ? '#d5d5d5' : p.inkPrimary,
    'editorLineNumber.foreground': isDark ? '#666666' : p.inkMuted,
    'editorLineNumber.activeForeground': p.inkSecondary,
    'editorCursor.foreground': isDark ? '#eeeeee' : p.accent,
    'editor.lineHighlightBackground': isDark ? '#11111180' : '#00000006',
    'editor.selectionBackground': isDark ? '#ffffff1f' : '#18181b1f',
    'editorGroupHeader.tabsBackground': p.tabBar,
    'editorGroupHeader.noTabsBackground': p.stage,
    'tab.activeBackground': p.tabActive,
    'tab.inactiveBackground': p.tabBar,
    'tab.activeForeground': p.inkPrimary,
    'tab.inactiveForeground': isDark ? '#8d8d8d' : p.inkMuted,
    'tab.hoverBackground': p.rowHover,
    'tab.activeBorderTop': '#00000000',
    'breadcrumb.background': p.stage,
    'breadcrumb.foreground': isDark ? '#818181' : p.inkMuted,
    'breadcrumb.focusForeground': p.inkPrimary,
    'breadcrumb.activeSelectionForeground': p.inkPrimary,
    'panel.background': p.sidebar,
    'panelTitle.activeBorder': '#00000000',
    'panelTitle.activeForeground': isDark ? '#dddddd' : p.inkPrimary,
    'panelTitle.inactiveForeground': isDark ? '#888888' : p.inkMuted,
    'terminal.background': p.sidebar,
    'terminal.foreground': isDark ? '#bcbcbc' : p.inkPrimary,
    'terminalCursor.foreground': p.accent,
    'titleBar.activeBackground': p.chrome,
    'titleBar.activeForeground': p.inkPrimary,
    'titleBar.inactiveBackground': p.chrome,
    'titleBar.inactiveForeground': p.inkMuted,
    'commandCenter.background': isDark ? '#111111' : p.surfaceCard,
    'commandCenter.activeBackground': p.rowHover,
    'commandCenter.foreground': isDark ? '#8d8d8d' : p.inkSecondary,
    'commandCenter.activeForeground': p.inkPrimary,
    'commandCenter.border': p.border,
    'button.background': p.accent,
    'button.foreground': p.accentInk,
    'button.border': '#00000000',
    'button.hoverBackground': isDark ? '#ffffff' : '#27272a',
    'button.secondaryBackground': p.surfaceCard,
    'button.secondaryForeground': p.inkPrimary,
    'button.secondaryHoverBackground': p.rowHover,
    'input.background': p.surfaceCard,
    'input.foreground': p.inkPrimary,
    'input.placeholderForeground': p.inkMuted,
    'input.border': p.border,
    'dropdown.background': p.surfaceRaised,
    'dropdown.foreground': p.inkPrimary,
    'dropdown.border': p.border,
    'quickInput.background': isDark ? '#141414' : p.surfaceRaised,
    'quickInput.foreground': p.inkPrimary,
    'quickInputList.focusBackground': p.rowHover,
    'quickInputList.focusForeground': p.inkPrimary,
    'list.activeSelectionBackground': p.rowActive,
    'list.activeSelectionForeground': p.inkPrimary,
    'list.inactiveSelectionBackground': p.rowActive,
    'list.focusBackground': p.rowActive,
    'list.hoverBackground': p.rowHover,
    'list.highlightForeground': p.inkPrimary,
    'progressBar.background': p.accent,
    'badge.background': p.accentPill,
    'badge.foreground': p.inkPrimary,
    'textLink.foreground': p.inkPrimary,
    'textLink.activeForeground': p.accent,
    'errorForeground': p.statusError,
    'editorError.foreground': p.statusError,
    'editorWarning.foreground': p.statusWarning,
    'testing.iconPassed': p.statusLive,
    'testing.iconFailed': p.statusError,
    'contrastBorder': '#00000000',
    'contrastActiveBorder': '#00000000',
    'sash.hoverBorder': isDark ? '#858585' : '#a1a1aa',
    'focusBorder': isDark ? '#3a3a3a' : '#d4d4d8',
    'activityBar.border': p.border,
    'sideBar.border': p.border,
    'sideBarSectionHeader.border': '#00000000',
    'statusBar.border': p.borderSubtle,
    'titleBar.border': p.chromeBorder,
    'panel.border': p.border,
    'editorGroup.border': p.border,
    'editorGroupHeader.tabsBorder': '#1c1c1c',
    'editorGroupHeader.border': '#00000000',
    'tab.border': '#00000000',
    'menu.background': isDark ? '#141414' : p.surfaceRaised,
    'menu.foreground': p.inkPrimary,
    'menu.selectionBackground': p.rowHover,
    'menu.selectionForeground': p.inkPrimary,
    'menu.border': isDark ? '#2a2a2a' : p.border,
    'widget.border': p.border,
    'notifications.background': p.surfaceRaised,
    'notifications.border': p.border,
    'gitDecoration.modifiedResourceForeground': isDark ? '#d8d8d8' : '#27272a',
    'gitDecoration.untrackedResourceForeground': isDark ? '#a8c3a5' : '#16a34a',
    'gitDecoration.ignoredResourceForeground': isDark ? '#555555' : '#a1a1aa',
    'gitDecoration.deletedResourceForeground': isDark ? '#888888' : '#71717a',
    'gitDecoration.renamedResourceForeground': isDark ? '#a0a0a0' : '#52525b',
    'gitDecoration.stageModifiedResourceForeground': isDark ? '#e5e5e5' : '#18181b',
    'gitDecoration.conflictingResourceForeground': p.statusWarning,
  }
}

export function buildWorkbenchColorCustomizations(
  themeOrAppearance: HanzoThemeId | HanzoAppearance = 'zen',
): Record<string, unknown> {
  const themeId: HanzoThemeId =
    themeOrAppearance === 'dark'
      ? 'zen'
      : themeOrAppearance === 'clay'
        ? 'clay'
        : themeOrAppearance === 'light'
          ? 'light'
          : 'zen'
  const active = getPaletteById(themeId)
  const darkColors = buildPaletteColorMap(themeId === 'clay' ? HANZO_CLAY_PALETTE : HANZO_ZEN_PALETTE)
  const lightColors = buildPaletteColorMap(HANZO_LIGHT_PALETTE)
  return {
    ...buildPaletteColorMap(active),
    '[Default Dark Modern]': darkColors,
    '[Default Dark+]': darkColors,
    '[Default Light Modern]': lightColors,
    '[Default Light+]': lightColors,
  }
}

/** Restrained Zen syntax colors matching `hanzo-ide.html` & `uploaded_media_1795581530518.png`. */
export function buildZenTokenColorCustomizations(): Record<string, unknown> {
  const zenRules = {
    comments: '#777777',
    strings: '#a8be9e',
    keywords: '#b9a6d2',
    functions: '#c5b68f',
    types: '#a5bacb',
    numbers: '#c5b68f',
    variables: '#d5d5d5',
    textMateRules: [
      {
        scope: [
          'keyword',
          'keyword.control',
          'storage.type',
          'storage.modifier',
          'keyword.operator.expression',
          'keyword.operator.new',
        ],
        settings: { foreground: '#b9a6d2' },
      },
      {
        scope: ['string', 'string.quoted', 'string.template'],
        settings: { foreground: '#a8be9e' },
      },
      {
        scope: ['comment', 'punctuation.definition.comment'],
        settings: { foreground: '#777777' },
      },
      {
        scope: ['entity.name.function', 'support.function', 'meta.function-call.generic'],
        settings: { foreground: '#c5b68f' },
      },
      {
        scope: ['entity.name.type', 'entity.name.class', 'support.type', 'support.class'],
        settings: { foreground: '#a5bacb' },
      },
      {
        scope: ['variable', 'variable.other.readwrite', 'variable.other.constant', 'punctuation'],
        settings: { foreground: '#d5d5d5' },
      },
    ],
  }
  return {
    '[Default Dark Modern]': zenRules,
    '[Default Dark+]': zenRules,
  }
}

export type HanzoLayoutSide = 'tree-left' | 'ai-left'

export const HANZO_LAYOUT_SIDE_STORAGE_KEY = 'hanzo.ide.layoutSide'

export function readStoredLayoutSide(): HanzoLayoutSide {
  try {
    if (typeof localStorage === 'undefined') return 'tree-left'
    const stored = localStorage.getItem(HANZO_LAYOUT_SIDE_STORAGE_KEY)
    return stored === 'ai-left' ? 'ai-left' : 'tree-left'
  } catch {
    return 'tree-left'
  }
}

export function persistLayoutSide(side: HanzoLayoutSide): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(HANZO_LAYOUT_SIDE_STORAGE_KEY, side)
    }
  } catch {
    /* ignore */
  }
}

export function sideBarLocationForLayout(side: HanzoLayoutSide): 'left' | 'right' {
  return side === 'ai-left' ? 'right' : 'left'
}

export function buildWorkbenchConfigurationDefaults(
  layoutSide: HanzoLayoutSide = readStoredLayoutSide(),
): Record<string, unknown> {
  return {
    'workbench.colorTheme': HANZO_ZEN_PALETTE.baseVsCodeTheme,
    'workbench.preferredDarkColorTheme': HANZO_ZEN_PALETTE.baseVsCodeTheme,
    'workbench.preferredLightColorTheme': HANZO_LIGHT_PALETTE.baseVsCodeTheme,
    'workbench.sideBar.location': sideBarLocationForLayout(layoutSide),
    'editor.tokenColorCustomizations': buildZenTokenColorCustomizations(),
    'editor.fontFamily': "'Zen Mono', monospace",
    'terminal.integrated.fontFamily': "'Zen Mono', monospace",
    'debug.console.fontFamily': "'Zen Mono', monospace",
    'chat.editor.fontFamily': "'Zen Mono', monospace",
    'editor.fontSize': 13,
    'editor.lineHeight': 23,
    'editor.tabSize': 2,
    'editor.renderWhitespace': 'none',
    'editor.renderLineHighlight': 'none',
    'editor.guides.indentation': false,
    'editor.minimap.enabled': false,
    'editor.overviewRulerBorder': false,
    'editor.hideCursorInOverviewRuler': true,
    'editor.scrollbar.vertical': 'auto',
    'editor.scrollbar.horizontal': 'auto',
    'editor.scrollbar.verticalScrollbarSize': 6,
    'editor.scrollbar.horizontalScrollbarSize': 6,
    'breadcrumbs.enabled': true,
    'workbench.startupEditor': 'none',
    'workbench.editor.showTabs': 'multiple',
    'workbench.editor.editorActionsLocation': 'hidden',
    'window.menuBarVisibility': 'hidden',
    'window.enableMenuBarMnemonics': false,
    'window.commandCenter': false,
    'workbench.layoutControl.enabled': false,
    'workbench.activityBar.location': 'hidden',
    'workbench.quickOpen.closeOnFocusLost': true,
    'prettier.enable': true,
    'workbench.iconTheme': 'vs-minimal',
    'explorer.compactFolders': true,
    'explorer.openEditors.visible': 0,
    'terminal.integrated.fontSize': 12,
    'terminal.integrated.lineHeight': 1.45,
  }
}

export function readStoredThemeId(): HanzoThemeId {
  try {
    if (typeof localStorage === 'undefined') return 'zen'
    const id = localStorage.getItem(HANZO_IAM_DEFAULTS.themeIdStorageKey)
    if (id === 'clay' || id === 'light' || id === 'zen') return id
    const legacy = localStorage.getItem(HANZO_IAM_DEFAULTS.themeStorageKey)
    if (legacy === 'light') return 'light'
    return 'zen'
  } catch {
    return 'zen'
  }
}

export function readStoredAppearance(): HanzoAppearance {
  return readStoredThemeId() === 'light' ? 'light' : 'dark'
}

export type HanzoDesktopPlatform = 'macos' | 'windows' | 'linux'

export function detectDesktopPlatform(): HanzoDesktopPlatform {
  if (typeof navigator === 'undefined') return 'linux'
  const ua = `${navigator.platform || ''} ${navigator.userAgent || ''}`
  if (/Mac|Darwin/i.test(ua)) return 'macos'
  if (/Win/i.test(ua)) return 'windows'
  return 'linux'
}

export function isMacDesktopPlatform(): boolean {
  return detectDesktopPlatform() === 'macos'
}

export function applyDocumentAppearance(themeOrAppearance: HanzoThemeId | HanzoAppearance): void {
  const themeId: HanzoThemeId =
    themeOrAppearance === 'dark'
      ? 'zen'
      : themeOrAppearance === 'clay'
        ? 'clay'
        : themeOrAppearance === 'light'
          ? 'light'
          : 'zen'
  const appearance: HanzoAppearance = themeId === 'light' ? 'light' : 'dark'
  if (typeof document !== 'undefined') {
    const platform = detectDesktopPlatform()
    document.documentElement.dataset.hanzoTheme = appearance
    document.documentElement.dataset.hanzoThemeId = themeId
    document.documentElement.dataset.hanzoPlatform = platform
    document.documentElement.classList.toggle('light', appearance === 'light')
    document.documentElement.classList.toggle('dark', appearance === 'dark')
    // W3C-safe Linux outer window corners: never allow inline root/body background colors.
    if (platform === 'linux') {
      document.documentElement.style.removeProperty('background')
      document.documentElement.style.removeProperty('background-color')
      document.body?.style.removeProperty('background')
      document.body?.style.removeProperty('background-color')
    }
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(HANZO_IAM_DEFAULTS.themeStorageKey, appearance)
      localStorage.setItem(HANZO_IAM_DEFAULTS.themeIdStorageKey, themeId)
    }
  } catch {
    /* ignore storage restrictions */
  }
}
