import { DEFAULT_HANZO_DEV_LAYOUT, loadHanzoDevLayoutSettings } from '../src/hanzo/settings-layout.ts'
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  HANZO_CLAY_PALETTE,
  HANZO_DEFAULT_KEYBINDINGS,
  HANZO_DEFAULT_MODEL,
  HANZO_IAM_DEFAULTS,
  HANZO_LIGHT_PALETTE,
  HANZO_OLLAMA_MODEL_PRESETS,
  HANZO_SHELL_GEOMETRY,
  HANZO_ZEN_MODEL_PRESETS,
  HANZO_ZEN_PALETTE,
  buildWorkbenchColorCustomizations,
  buildWorkbenchConfigurationDefaults,
  isAllowedModelId,
} from '../src/hanzo/theme.ts'
import { renderHanzoMarkSvg, zenIcon } from '../src/hanzo/brand.ts'
import { MOBILE_APP_DOWNLOADS } from '../src/hanzo/phone-app-modal.ts'
import {
  HANZO_HIP0300_CORE_TOOLS,
  HANZO_MCP_CATALOG_PRESETS,
  HANZO_NATIVE_IDE_CAPABILITIES,
  buildDefaultToolSampleArgs,
  buildMcpServerConfigFromPreset,
  countEnabledNativeTools,
  formatQuickTopbarLabel,
  parseQuickFileTargetFromLocation,
  persistWorkspaceExplorerOpen,
  pickPreferredEntryFile,
} from '../src/hanzo/mcp-catalog.ts'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('Hanzo Zen, Clay & Zen Light palettes match Hanzo Dev tokens', () => {
  assert.equal(HANZO_ZEN_PALETTE.appearance, 'dark')
  assert.equal(HANZO_ZEN_PALETTE.chrome, '#000000')
  assert.equal(HANZO_ZEN_PALETTE.stage, '#090909')
  assert.equal(HANZO_ZEN_PALETTE.sidebar, '#0c0c0c')
  assert.equal(HANZO_ZEN_PALETTE.tabBar, '#0b0b0b')
  assert.equal(HANZO_ZEN_PALETTE.surfaceRaised, '#141414')
  assert.equal(HANZO_ZEN_PALETTE.border, '#222222')
  assert.equal(HANZO_ZEN_PALETTE.inkPrimary, '#e5e5e5')
  assert.equal(HANZO_ZEN_PALETTE.inkSecondary, '#a0a0a0')

  assert.equal(HANZO_CLAY_PALETTE.chrome, '#141418')
  assert.equal(HANZO_CLAY_PALETTE.stage, '#111016')
  assert.equal(HANZO_CLAY_PALETTE.sidebar, '#0e0d12')
  assert.equal(HANZO_CLAY_PALETTE.accent, '#d11641')

  assert.equal(HANZO_LIGHT_PALETTE.appearance, 'light')
  assert.equal(HANZO_LIGHT_PALETTE.chrome, '#ffffff')
  assert.equal(HANZO_LIGHT_PALETTE.sidebar, '#f7f7f7')
  assert.equal(HANZO_LIGHT_PALETTE.border, '#e4e4e7')
})

test('Zen shell geometry enforces 40px toolbar, 248px left, 340px right, 210px bottom, 23px statusbar', () => {
  assert.equal(HANZO_SHELL_GEOMETRY.titlebarHeightPx, 40)
  assert.equal(HANZO_SHELL_GEOMETRY.sidebarDefaultWidthPx, 248)
  assert.equal(HANZO_SHELL_GEOMETRY.rightSidebarDefaultWidthPx, 340)
  assert.equal(HANZO_SHELL_GEOMETRY.bottomPanelDefaultHeightPx, 210)
  assert.equal(HANZO_SHELL_GEOMETRY.statusBarHeightPx, 23)
})

test('Default keybindings include ⌘B, ⌘K, ⇧⌘P, ⌃`, ⌘,, and ⌥⌘B', () => {
  const macShortcuts = new Map(HANZO_DEFAULT_KEYBINDINGS.map((k) => [k.mac, k.command]))
  assert.equal(macShortcuts.get('⌘B'), 'workbench.action.toggleSidebarVisibility')
  assert.equal(macShortcuts.get('⌘K'), 'hanzo.commandOrInlineEdit')
  assert.equal(macShortcuts.get('⇧⌘P'), 'workbench.action.showCommands')
  assert.equal(macShortcuts.get('⌃`'), 'workbench.action.terminal.toggleTerminal')
  assert.equal(macShortcuts.get('⌘,'), 'workbench.action.openSettings')
  assert.equal(macShortcuts.get('⌥⌘B'), 'workbench.action.toggleAuxiliaryBar')
})

test('Workbench defaults hide permanent Activity Bar and contain zero VS Code blue/purple defaults', () => {
  const dark = buildWorkbenchColorCustomizations('zen')
  const serialized = JSON.stringify(dark).toLowerCase()
  assert.ok(!serialized.includes('#007acc'), 'must not use legacy VS Code blue #007acc')
  assert.ok(!serialized.includes('#0078d4'), 'must not use default VS Code blue #0078d4')
  assert.ok(!serialized.includes('#68217a'), 'must not use VS Code no-folder purple #68217a')
  assert.equal(dark['quickInput.background'], '#141414')

  const defaults = buildWorkbenchConfigurationDefaults()
  assert.equal(defaults['workbench.activityBar.location'], 'hidden')
  assert.equal(defaults['window.menuBarVisibility'], 'hidden')
  assert.equal(defaults['editor.minimap.enabled'], false)
  assert.equal(defaults['editor.lineHeight'], 23)
  assert.equal(defaults['editor.fontSize'], 13)
  assert.equal(defaults['editor.fontFamily'], "'Zen Mono', monospace")
  assert.equal(defaults['terminal.integrated.fontFamily'], "'Zen Mono', monospace")

  const mainTs = fs.readFileSync(path.join(rootDir, 'src/main.ts'), 'utf8')
  const chatMainTs = fs.readFileSync(path.join(rootDir, 'src/chat-main.ts'), 'utf8')
  assert.ok(mainTs.includes("import '@hanzo/font/css'"), 'main.ts must import @hanzo/font/css')
  assert.ok(chatMainTs.includes("import '@hanzo/font/css'"), 'chat-main.ts must import @hanzo/font/css')
})

test('Default model is enso and Zen 6 / Qwen3+ model policy rejects qwen2 and legacy zen4/zen5', () => {
  assert.equal(HANZO_DEFAULT_MODEL, 'enso')
  assert.equal(HANZO_ZEN_MODEL_PRESETS[0], 'enso')
  for (const m of [...HANZO_ZEN_MODEL_PRESETS, ...HANZO_OLLAMA_MODEL_PRESETS]) {
    assert.equal(isAllowedModelId(m), true, `expected ${m} to be allowed`)
  }
  assert.equal(isAllowedModelId('enso'), true)
  assert.equal(isAllowedModelId('zen6-coder'), true)
  assert.equal(isAllowedModelId('enso-auto'), true)
  assert.equal(isAllowedModelId('qwen3-coder:30b'), true)
  assert.equal(isAllowedModelId('qwen2.5-coder:7b'), false)
  assert.equal(isAllowedModelId('qwen2:7b'), false)
  assert.equal(isAllowedModelId('zen5-coder'), false)
  assert.equal(isAllowedModelId('zen4-max'), false)
})

test('Brand module uses official 7-path @hanzo/logo geometry and Hanzo Dev lucide/menu icons', () => {
  const mark = renderHanzoMarkSvg(40)
  assert.ok(mark.includes('viewBox="0 0 67 67"'))
  assert.equal((mark.match(/<path /g) || []).length, 7, 'official @hanzo/logo mark has 7 paths')

  const menuSvg = zenIcon('menu')
  assert.ok(menuSvg.includes('M1 1h17M1 10h10.7'), 'must use DesktopAppMenu.tsx F-menu path')
  assert.ok(zenIcon('left').includes('M9 3v18'))
  assert.ok(zenIcon('right').includes('M15 3v18'))
  assert.ok(zenIcon('terminal').includes('M11 13h4'))
  assert.ok(zenIcon('browser').includes('M3 8.5h18'))
  assert.ok(zenIcon('popout').includes('M15 3h6v6'))
})

test('HIP-0300 MCP catalog presets and Native IDE tool suites cover all required integrations', () => {
  assert.equal(HANZO_NATIVE_IDE_CAPABILITIES.length, 7)
  const capIds = HANZO_NATIVE_IDE_CAPABILITIES.map((c) => c.id)
  assert.deepEqual(capIds, ['filesystem', 'sandbox', 'ast', 'memory', 'git', 'lsp', 'browser'])
  assert.ok(countEnabledNativeTools() >= 18)

  for (const required of ['fs', 'exec', 'code', 'git', 'fetch', 'think', 'memory', 'plan']) {
    assert.ok(HANZO_HIP0300_CORE_TOOLS.includes(required as any), `missing HIP-0300 tool ${required}`)
  }

  const presetIds = HANZO_MCP_CATALOG_PRESETS.map((p) => p.id)
  assert.deepEqual(presetIds, ['hanzo', 'hanzod', 'github', 'playwright', 'database'])

  const hanzoCfg = buildMcpServerConfigFromPreset(HANZO_MCP_CATALOG_PRESETS[0], {
    resolvedBinary: '/home/z/.local/bin/hanzo-mcp',
    workspacePath: '/data/apps-latest/ide',
  })
  assert.equal(hanzoCfg.command, '/home/z/.local/bin/hanzo-mcp')
  assert.deepEqual(hanzoCfg.args, ['--transport', 'stdio', '--project-dir', '/data/apps-latest/ide'])

  const hanzodCfg = buildMcpServerConfigFromPreset(HANZO_MCP_CATALOG_PRESETS[1])
  assert.equal(hanzodCfg.url, 'http://127.0.0.1:3690/mcp')
  assert.equal(hanzodCfg.transport, 'streamable_http')

  const sampleFs = JSON.parse(buildDefaultToolSampleArgs('fs', '/data/apps-latest/ide'))
  assert.equal(sampleFs.action, 'list')
  assert.equal(sampleFs.uri, '/data/apps-latest/ide')
})

test('Zed-speed quick-file URL parsing, scratch pill formatting & W3C Linux corners', () => {
  const qf = parseQuickFileTargetFromLocation(
    '?quickFile=%2Fdata%2Fapps-latest%2Fide%2Fsrc%2Fmain.ts&line=12&col=4',
    '',
  )
  assert.equal(qf.quickFile, '/data/apps-latest/ide/src/main.ts')
  assert.equal(qf.line, 12)
  assert.equal(qf.column, 4)
  assert.equal(qf.workspaceFolder, null)

  const ws = parseQuickFileTargetFromLocation('?zenLayout=expanded', '#%2Fdata%2Fapps-latest%2Fide')
  assert.equal(ws.workspaceFolder, '/data/apps-latest/ide')
  assert.equal(ws.zenLayout, 'expanded')

  assert.deepEqual(
    formatQuickTopbarLabel({
      workspacePath: null,
      activeFilePath: null,
      isUntitledScratch: true,
    }),
    { label: 'New file · Scratch', kind: 'scratch' },
  )
  assert.deepEqual(
    formatQuickTopbarLabel({
      workspacePath: null,
      activeFilePath: '/data/apps-latest/ide/src/main.ts',
      isUntitledScratch: false,
    }),
    { label: 'src / main.ts', kind: 'quick-file' },
  )
  assert.deepEqual(
    formatQuickTopbarLabel({
      workspacePath: '/data/apps-latest/ide',
      activeFilePath: '/data/apps-latest/ide/src/main.ts',
      isUntitledScratch: false,
    }),
    { label: 'apps-latest / ide', kind: 'workspace' },
  )

  const overridesCss = fs.readFileSync(path.join(rootDir, 'src/styles/overrides.css'), 'utf8')
  assert.ok(!overridesCss.includes('clip-path: inset(0 round 12px)'), 'must not use root clip-path on Linux')
  assert.ok(overridesCss.includes('border-radius: 12px !important;'))
  assert.ok(overridesCss.includes("html[data-zen-single-tab='true']"))
  assert.ok(
    overridesCss.includes('textarea:not(.hanzo-chat-textarea):focus-visible'),
    'overrides.css must not draw a rectangular focus outline inside rounded chat composer',
  )
  assert.ok(
    overridesCss.includes('.monaco-workbench .part.auxiliarybar .pane-body > .monaco-scrollable-element'),
    'auxiliarybar scrollable chain must stretch 100% height so composer anchors flush to bottom',
  )

  const chatCss = fs.readFileSync(path.join(rootDir, 'src/hanzo/chat/styles.css'), 'utf8')
  assert.ok(chatCss.includes('border-radius: 16px;'))
  assert.ok(chatCss.includes('border: 1px solid #262626;'))
  assert.ok(chatCss.includes('margin-top: auto !important;'))
  assert.ok(chatCss.includes('.hanzo-chat-textarea:focus-visible'))

  // Verify Open Folder forces Explorer open & TauriFileSystemProvider works outside $HOME
  const mem = new Map<string, string>()
  const fakeStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, v)
    },
  }
  persistWorkspaceExplorerOpen('/data/apps-latest/ide', fakeStorage)
  const savedLayout = JSON.parse(mem.get('hanzo.ide.zenLayout.v2:/data/apps-latest/ide') || '{}')
  assert.equal(savedLayout.left, true)
  assert.equal(savedLayout.leftView, 'Explorer')
  const recents = JSON.parse(mem.get('hanzo.ide.recentFolders') || '[]')
  assert.equal(recents[0], '/data/apps-latest/ide')

  assert.equal(
    pickPreferredEntryFile([
      { name: 'src', is_dir: true },
      { name: 'Cargo.toml', is_dir: false },
      { name: 'README.md', is_dir: false },
    ]),
    'README.md',
  )

  const fsProviderTs = fs.readFileSync(path.join(rootDir, 'src/tauri-fs-provider.ts'), 'utf8')
  assert.ok(fsProviderTs.includes('ide_list_dir'), 'TauriFileSystemProvider must use unrestricted ide_list_dir')
  assert.ok(fsProviderTs.includes('ide_read_file_bytes'), 'TauriFileSystemProvider must use ide_read_file_bytes')
  assert.ok(fsProviderTs.includes('ide_write_file_bytes'), 'TauriFileSystemProvider must use ide_write_file_bytes')

  const defaultCap = fs.readFileSync(path.join(rootDir, 'src-tauri/capabilities/default.json'), 'utf8')
  const appPermToml = fs.readFileSync(path.join(rootDir, 'src-tauri/permissions/app.toml'), 'utf8')
  assert.ok(defaultCap.includes('allow-hanzo-ide-commands'), 'release localhost ACL must include allow-hanzo-ide-commands')
  assert.ok(defaultCap.includes('"http://localhost:*#*"'), 'remote ACL must match URL hash routes (#/path/to/folder)')
  assert.ok(defaultCap.includes('"http://localhost:*?*#*"'), 'remote ACL must match query + hash routes')
  for (const cmd of [
    'ide_list_dir',
    'ide_read_file_bytes',
    'ide_write_file_bytes',
    'ide_stat',
    'get_cli_launch_target',
    'engine_mcp_status',
    'engine_mcp_list_tools',
    'engine_mcp_execute_tool',
  ]) {
    assert.ok(appPermToml.includes(`"${cmd}"`), `app.toml must authorize ${cmd}`)
  }
})

test('IAM config, Sign-In SVG, and Get Hanzo on your phone match Hanzo Dev & Desktop', () => {
  assert.equal(HANZO_IAM_DEFAULTS.issuer, 'https://hanzo.id')
  assert.equal(HANZO_IAM_DEFAULTS.clientId, 'hanzo-ide')
  assert.equal(HANZO_IAM_DEFAULTS.orgHeader, 'X-Org-Id')

  assert.equal(MOBILE_APP_DOWNLOADS[0].url, 'https://hanzo.ai/download#mobile')

  const accountTs = fs.readFileSync(path.join(rootDir, 'src/hanzo/account.ts'), 'utf8')
  assert.ok(accountTs.includes('Get Hanzo on your phone'))
  assert.ok(!accountTs.includes('Get Hanzo IDE on your phone'))
  assert.ok(!accountTs.includes('Get Hanzo Dev on your phone'))

  const signInTs = fs.readFileSync(path.join(rootDir, 'src/hanzo/signin-modal.ts'), 'utf8')
  assert.ok(signInTs.includes('Sign in to Hanzo IDE'))
  assert.ok(signInTs.includes('Continue without signing in'))
  assert.ok(signInTs.includes('M23.745 12.27'), 'must use exact canonical @hanzo/ui Google SVG')
})

test('Unified Hanzo Dev layout defaults and kebab-case settings codicons', () => {
  const layout = loadHanzoDevLayoutSettings()
  assert.deepEqual(layout, DEFAULT_HANZO_DEV_LAYOUT)
  assert.equal(layout.chatWidth, 'comfortable')
  assert.equal(layout.appearanceContrast, 100)
  assert.equal(layout.glassOpacity, 100)
  assert.equal(layout.browserDefaultPort, 3000)

  const modalTs = fs.readFileSync(path.join(rootDir, 'src/hanzo/settings-modal.ts'), 'utf8')
  const icons = modalTs.match(/codicon-[a-zA-Z0-9-]+/g) ?? []
  assert.ok(icons.length >= 10)
  for (const icon of icons) {
    assert.equal(icon, icon.toLowerCase(), `Codicon class must be lowercase kebab-case: ${icon}`)
  }
})
