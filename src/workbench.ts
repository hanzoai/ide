/**
 * Hanzo Workbench Initialization
 *
 * Boots the full VS Code workbench shell using @codingame/monaco-vscode-api v28.
 * All 55+ service overrides are registered to match the full VS Code experience.
 */

// ─── Hanzo Design System ─────────────────────────────────────────────────────
import './styles/tokens.css'
import { tauri } from './hanzo/tauri.ts'
import './styles/overrides.css'

// ─── Default Extensions (must import before anything else) ──────────────────
// This imports ALL built-in VS Code extensions: language grammars (JS, TS, Python,
// Rust, Go, CSS, HTML, JSON, Markdown, etc.), themes, language features, git-base,
// emmet, search-result, merge-conflict, and more.
import '@codingame/monaco-vscode-all-default-extensions'

// ─── Worker setup (must be before any monaco/vscode imports) ────────────────
declare global {
  interface Window {
    MonacoEnvironment?: {
      getWorkerUrl(_moduleId: string, label: string): string | undefined
      getWorkerOptions(_moduleId: string, label: string): WorkerOptions | undefined
    }
  }
}

const workerUrls: Record<string, string> = {
  extensionHostWorkerMain: new URL(
    '@codingame/monaco-vscode-api/workers/extensionHost.worker',
    import.meta.url,
  ).toString(),
  editorWorkerService: new URL(
    'monaco-editor/esm/vs/editor/editor.worker.js',
    import.meta.url,
  ).toString(),
}

window.MonacoEnvironment = {
  getWorkerUrl(_moduleId: string, label: string) {
    return workerUrls[label] ?? workerUrls['editorWorkerService']
  },
  getWorkerOptions(_moduleId: string, _label: string) {
    return { type: 'module' }
  },
}

// ─── Service Override Imports ────────────────────────────────────────────────
import { initialize } from '@codingame/monaco-vscode-api'


// Core platform
import getBaseServiceOverride from '@codingame/monaco-vscode-base-service-override'
import getHostServiceOverride from '@codingame/monaco-vscode-host-service-override'
import getEnvironmentServiceOverride from '@codingame/monaco-vscode-environment-service-override'
import getLogServiceOverride from '@codingame/monaco-vscode-log-service-override'
import getLifecycleServiceOverride from '@codingame/monaco-vscode-lifecycle-service-override'
// Removed (Phase 8e Tier 2): remote-agent (VS Code Remote SSH — Hanzo is local-only)

// Files, models, working copy (the editor pipeline)
import getFilesServiceOverride, { registerFileSystemOverlay } from '@codingame/monaco-vscode-files-service-override'
import getModelServiceOverride from '@codingame/monaco-vscode-model-service-override'
import getWorkingCopyServiceOverride from '@codingame/monaco-vscode-working-copy-service-override'
import getEditorServiceOverride from '@codingame/monaco-vscode-editor-service-override'

// Extensions
import getExtensionsServiceOverride from '@codingame/monaco-vscode-extensions-service-override'
import getExtensionGalleryServiceOverride from '@codingame/monaco-vscode-extension-gallery-service-override'

// Theme, language, syntax
import getThemeServiceOverride from '@codingame/monaco-vscode-theme-service-override'
import getTextmateServiceOverride from '@codingame/monaco-vscode-textmate-service-override'
import getLanguagesServiceOverride from '@codingame/monaco-vscode-languages-service-override'
import getLanguageDetectionWorkerServiceOverride from '@codingame/monaco-vscode-language-detection-worker-service-override'
import getSnippetsServiceOverride from '@codingame/monaco-vscode-snippets-service-override'
import getEmmetServiceOverride from '@codingame/monaco-vscode-emmet-service-override'

// Configuration, keybindings, preferences
import getConfigurationServiceOverride, { updateUserConfiguration } from '@codingame/monaco-vscode-configuration-service-override'
import getKeybindingsServiceOverride from '@codingame/monaco-vscode-keybindings-service-override'
import getPreferencesServiceOverride from '@codingame/monaco-vscode-preferences-service-override'

// UI services
import getMarkersServiceOverride from '@codingame/monaco-vscode-markers-service-override'
import getQuickAccessServiceOverride from '@codingame/monaco-vscode-quickaccess-service-override'
import getNotificationsServiceOverride from '@codingame/monaco-vscode-notifications-service-override'
import getDialogsServiceOverride from '@codingame/monaco-vscode-dialogs-service-override'
import getOutputServiceOverride from '@codingame/monaco-vscode-output-service-override'
import getAccessibilityServiceOverride from '@codingame/monaco-vscode-accessibility-service-override'

// Views — Explorer, Search, Source Control, Outline, Timeline
import getExplorerServiceOverride from '@codingame/monaco-vscode-explorer-service-override'
import getSearchServiceOverride from '@codingame/monaco-vscode-search-service-override'
import getScmServiceOverride from '@codingame/monaco-vscode-scm-service-override'
import getOutlineServiceOverride from '@codingame/monaco-vscode-outline-service-override'
import getTimelineServiceOverride from '@codingame/monaco-vscode-timeline-service-override'
// Removed (Phase 8e Tier 2): comments (PR review — needs extension, Hanzo doesn't use)

// Terminal
import getTerminalServiceOverride from '@codingame/monaco-vscode-terminal-service-override'

// Storage, workspace trust, user data
import getStorageServiceOverride from '@codingame/monaco-vscode-storage-service-override'
import getWorkspaceTrustServiceOverride from '@codingame/monaco-vscode-workspace-trust-service-override'
import getSecretStorageServiceOverride from '@codingame/monaco-vscode-secret-storage-service-override'
import getAuthenticationServiceOverride from '@codingame/monaco-vscode-authentication-service-override'
// Removed (Phase 8e Tier 2): user-data-sync (VS Code Settings Sync — no server configured)
import getUserDataProfileServiceOverride from '@codingame/monaco-vscode-user-data-profile-service-override'

// Debug, testing, tasks
import getDebugServiceOverride from '@codingame/monaco-vscode-debug-service-override'
import getTestingServiceOverride from '@codingame/monaco-vscode-testing-service-override'
import getTaskServiceOverride from '@codingame/monaco-vscode-task-service-override'

// Multi-diff, performance, localization
import getMultiDiffEditorServiceOverride from '@codingame/monaco-vscode-multi-diff-editor-service-override'
import getPerformanceServiceOverride from '@codingame/monaco-vscode-performance-service-override'
import getLocalizationServiceOverride from '@codingame/monaco-vscode-localization-service-override'
// Removed (Phase 8d): Notebook, Interactive, Speech, Relauncher
// Removed (Phase 8e Tier 1): Chat (5.5MB — Hanzo has own chat), Telemetry (sends to Microsoft),
//   Welcome (startupEditor:'none'), Update (Tauri handles), EditSessions (cloud feature)

// Full workbench shell — manages activity bar, sidebar, editor, panel, status bar
import getWorkbenchServiceOverride from '@codingame/monaco-vscode-workbench-service-override'

// View-common: provides IWebviewService + IWebviewViewService — the real
// VS Code webview infrastructure (iframe creation, acquireVsCodeApi handshake,
// CSP / nonce, postMessage, localResourceRoots → webview-resource://). Without
// this, registerWebviewViewProvider has nothing to mount into.
import getViewCommonServiceOverride from '@codingame/monaco-vscode-view-common-service-override'

// ─── Hanzo custom modules ───────────────────────────────────────────────────
import { TauriFileSystemProvider } from './tauri-fs-provider.ts'
import { HanzoTerminalBackend } from './hanzo/terminal-backend.ts'
import { createWorkspaceProvider } from './hanzo/workspace.ts'
import { registerHanzoSettingsPane } from './hanzo/provider-settings.ts'
import { registerHanzoChat } from './hanzo/chat/view.ts'
import { registerInlineEdit } from './hanzo/inline.ts'
import { registerGhostCompletions } from './hanzo/completions.ts'
import { registerHanzoExtensions } from './hanzo/extensions.ts'
import { registerActivityFeed } from './hanzo/activity-feed.ts'
import { initEditorIntegration } from './hanzo/editor.ts'
import { registerMemory } from './hanzo/memory/index.ts'
import {
  applyDocumentAppearance,
  buildWorkbenchColorCustomizations,
  buildWorkbenchConfigurationDefaults,
  getPaletteById,
  readStoredThemeId,
  type HanzoThemeId,
} from './hanzo/theme.ts'

// ─── Workbench initialization ─────────────────────────────────────────────────

function setLoadingStatus(msg: string) {
  const el = document.getElementById('hanzo-load-status')
  if (el) el.textContent = msg
  else console.log('[hanzo-boot]', msg)
}

export async function initializeWorkbench(): Promise<void> {
  const initialThemeId = readStoredThemeId()
  applyDocumentAppearance(initialThemeId)
  // Mount `#hanzo-zen-toolbar` (40px flex child) BEFORE Monaco measures `#workbench-shell`
  const { mountWorkbenchShellChrome } = await import('./hanzo/account.ts')
  mountWorkbenchShellChrome()
  const container = document.getElementById('workbench-shell')!

  // Inject a visible status line into the loading screen
  const loading = document.getElementById('workbench-loading')
  if (loading) {
    const statusEl = document.createElement('div')
    statusEl.id = 'hanzo-load-status'
    statusEl.style.cssText = 'margin-top:12px;font-size:11px;color:#888;font-family:var(--hanzo-font-mono)'
    statusEl.textContent = 'Waiting for IPC...'
    loading.querySelector('.loading-inner')?.appendChild(statusEl)
  }

  // ─── Wait for Tauri IPC bridge to be ready ────────────────────────────────
  setLoadingStatus('Waiting for Tauri IPC...')
  let ipcWaitMs = 0
  const maxIpcWait = (window as any).__TAURI_INTERNALS__ ? 2000 : 150
  await new Promise<void>((resolve) => {
    const check = () => {
      if ((window as any).__TAURI_INTERNALS__?.invoke) {
        resolve()
      } else {
        ipcWaitMs += 10
        if (ipcWaitMs > maxIpcWait) {
          // Browser mode / non-Tauri host
          resolve()
          return
        }
        setTimeout(check, 10)
      }
    }
    check()
  })

  // ─── Register FS provider & Hanzo Chat view BEFORE initialize() ───────────
  // `registerHanzoChat` MUST run before `initialize()` so `ViewContainersRegistry`
  // knows `hanzo.chat` is the default AuxiliaryBar container during layout restore!
  setLoadingStatus('Registering file system...')
  registerFileSystemOverlay(1, new TauriFileSystemProvider())
  try {
    registerHanzoChat()
  } catch (e) {
    console.warn('[hanzo-boot] early chat view registration warning:', e)
  }

  // `#hanzo-zen-toolbar` (40px) is mounted directly on `document.body`, so
  // VS Code's internal `.part.titlebar` reserves 0px height.
  try {
    const { BrowserTitlebarPart } = await import(
      '@codingame/monaco-vscode-view-title-bar-service-override/vscode/vs/workbench/browser/parts/titlebar/titlebarPart'
    )
    Object.defineProperty(BrowserTitlebarPart.prototype, 'minimumHeight', {
      get() {
        return 0
      },
      configurable: true,
    })
  } catch (e) {
    console.warn('[hanzo-boot] titlebar height override skipped:', e)
  }

  // Resolve CLI quick-file / extra files ahead of `initialize()` so VS Code's
  // native `defaultLayout.editors` opens them directly in Group 1 on first paint!
  const { URI } = await import('@codingame/monaco-vscode-api/vscode/vs/base/common/uri')
  const { parseQuickFileTargetFromLocation } = await import('./hanzo/mcp-catalog.ts')
  const initialEditorEntries: Array<{ uri: any; viewColumn: number; options?: any }> = []
  const urlQuick = parseQuickFileTargetFromLocation(window.location.search, window.location.hash)
  if (urlQuick.quickFile) {
    initialEditorEntries.push({
      uri: URI.file(urlQuick.quickFile),
      viewColumn: 1,
      options: {
        pinned: true,
        ...(urlQuick.line
          ? {
              selection: {
                startLineNumber: urlQuick.line,
                startColumn: urlQuick.column ?? 1,
                endLineNumber: urlQuick.line,
                endColumn: urlQuick.column ?? 1,
              },
            }
          : {}),
      },
    })
  }
  if (tauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const cli = await invoke<{
        kind: string
        path?: string | null
        extra_files?: string[]
        line?: number | null
        column?: number | null
      }>('get_cli_launch_target')
      if (cli?.kind === 'file' && cli.path && initialEditorEntries.length === 0) {
        let exists = true
        try {
          await invoke('ide_stat', { path: cli.path })
        } catch {
          exists = false
        }
        initialEditorEntries.push({
          uri: exists ? URI.file(cli.path) : URI.file(cli.path).with({ scheme: 'untitled' }),
          viewColumn: 1,
          options: {
            pinned: true,
            ...(cli.line
              ? {
                  selection: {
                    startLineNumber: cli.line,
                    startColumn: cli.column ?? 1,
                    endLineNumber: cli.line,
                    endColumn: cli.column ?? 1,
                  },
                }
              : {}),
          },
        })
      }
      for (const extra of cli?.extra_files ?? []) {
        if (extra && !initialEditorEntries.some((e) => e.uri?.path === extra)) {
          initialEditorEntries.push({
            uri: URI.file(extra),
            viewColumn: 1,
            options: { pinned: true, preserveFocus: initialEditorEntries.length > 0 },
          })
        }
      }
    } catch {
      /* non-fatal */
    }
  }

  setLoadingStatus('Initializing VS Code workbench...')
  await initialize(
    {
      // ── Core platform ──────────────────────────────────────────────────
      ...getBaseServiceOverride(),
      ...getHostServiceOverride(),
      ...getEnvironmentServiceOverride(),
      ...getLogServiceOverride(),
      ...getLifecycleServiceOverride(),
      // remote-agent removed (Phase 8e Tier 2)

      // ── Files → Models → Working Copy → Editor (the pipeline) ──────────
      ...getFilesServiceOverride(),
      ...getModelServiceOverride(),
      ...getWorkingCopyServiceOverride(),
      ...getEditorServiceOverride(async (resource: any, _options: any, _sideBySide: any) => {
        // B28: route open-editor requests through vscode.open so internal
        // navigation (peek references, cross-file go-to-definition) works.
        // Never attempt to open a directory URI as a text editor tab!
        const uri = resource?.scheme ? resource
          : (resource?.object?.textEditorModel?.uri ?? resource?.resource ?? null)
        if (!uri || uri.scheme !== 'file') return false
        if (tauri()) {
          try {
            const { invoke } = await import('@tauri-apps/api/core')
            const fsPath = uri.fsPath || uri.path
            const s = await invoke<{ type: number }>('ide_stat', { path: fsPath })
            if (s?.type === 2) return false
          } catch { /* non-fatal */ }
        }
        try {
          const cmdModule = await import(
            '@codingame/monaco-vscode-api/vscode/vs/platform/commands/common/commands'
          ) as any
          const reg = cmdModule.CommandsRegistry ?? cmdModule.default?.CommandsRegistry
          const cmd = reg?.getCommand?.('vscode.open')
          if (cmd?.handler) {
            await cmd.handler(null as any, uri)
            return true
          }
        } catch { /* fall through */ }
        return false
      }),

      // ── Extensions ─────────────────────────────────────────────────────
      ...getExtensionsServiceOverride({
        enableWorkerExtensionHost: true,
      }),
      // B29: webOnly: false allows the full gallery to load. The OSS build
      // doesn't ship the full Open VSX runtime — themes/icons/grammars work
      // but extensions that require a Node.js host may fail to activate.
      // V2 ships the full host; bump this when that lands.
      ...getExtensionGalleryServiceOverride({ webOnly: false }),

      // ── Theme, language, syntax ────────────────────────────────────────
      ...getThemeServiceOverride(),
      ...getTextmateServiceOverride(),
      ...getLanguagesServiceOverride(),
      ...getLanguageDetectionWorkerServiceOverride(),
      ...getSnippetsServiceOverride(),
      ...getEmmetServiceOverride(),

      // ── Configuration, keybindings, preferences ────────────────────────
      ...getConfigurationServiceOverride(),
      ...getKeybindingsServiceOverride(),
      ...getPreferencesServiceOverride(),

      // ── UI services ────────────────────────────────────────────────────
      ...getMarkersServiceOverride(),
      ...getQuickAccessServiceOverride(),
      ...getNotificationsServiceOverride(),
      ...getDialogsServiceOverride(),
      ...getOutputServiceOverride(),
      ...getAccessibilityServiceOverride(),

      // ── Views ──────────────────────────────────────────────────────────
      ...getExplorerServiceOverride(),
      ...getSearchServiceOverride(),
      ...getScmServiceOverride(),
      ...getOutlineServiceOverride(),
      ...getTimelineServiceOverride(),
      // comments removed (Phase 8e Tier 2)

      // ── Terminal ───────────────────────────────────────────────────────
      ...getTerminalServiceOverride(new HanzoTerminalBackend()),

      // ── Storage, trust, auth, user data ────────────────────────────────
      ...getStorageServiceOverride(),
      ...getWorkspaceTrustServiceOverride(),
      ...getSecretStorageServiceOverride(),
      ...getAuthenticationServiceOverride(),
      ...getUserDataProfileServiceOverride(),

      // ── Debug, testing, tasks ──────────────────────────────────────────
      ...getDebugServiceOverride(),
      ...getTestingServiceOverride(),
      ...getTaskServiceOverride(),

      // ── Editor features ────────────────────────────────────────────────
      ...getMultiDiffEditorServiceOverride(),
      ...getPerformanceServiceOverride(),
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore — works at runtime with 0 args
      ...getLocalizationServiceOverride(),

      // ── Webview infrastructure ────────────────────────────────────────
      // Registers IWebviewService + IWebviewViewService used by extensions
      // that contribute panels / sidebar webviews (Claude Code, Continue,
      // Cline, GitLens, vscode-pull-request-github, etc).
      ...getViewCommonServiceOverride(),

      // ── Full workbench shell (must be last) ────────────────────────────
      ...getWorkbenchServiceOverride(),
    },
    container,
    {
      productConfiguration: {
        nameShort: 'Hanzo IDE',
        nameLong: 'Hanzo IDE — Unified Agent Workspace',
        applicationName: 'hanzo-ide',
        dataFolderName: '.hanzo',
        // Must match a real VS Code version so extensions pass engines.vscode check.
        // @codingame/monaco-vscode-api v28 ≈ VS Code 1.96.x
        version: '1.96.0',
        // Open VSX — the open extension registry (not Microsoft Marketplace)
        extensionsGallery: {
          serviceUrl: 'https://open-vsx.org/vscode/gallery',
          extensionUrlTemplate: 'https://open-vsx.org/vscode/unpkg/{publisher}/{name}/{version}/{path}',
          resourceUrlTemplate: 'https://open-vsx.org/vscode/unpkg/{publisher}/{name}/{version}/{path}',
          controlUrl: '',
          nlsBaseUrl: '',
        },
      },

      workspaceProvider: createWorkspaceProvider(),

      // Mount both Explorer (`workbench.explorer.fileView`) and `hanzo.chat` view containers
      // so toggling Left Explorer or Right Agent/MCP Dock immediately renders live content;
      // `zen-workspace.ts` controls initial part visibility (minimal on empty boot, Explorer on folder open).
      defaultLayout: {
        views: [{ id: 'workbench.explorer.fileView' }, { id: 'hanzo.chat' }],
        ...(initialEditorEntries.length > 0
          ? {
              editors: initialEditorEntries,
              force: true,
            }
          : {}),
      },

      configurationDefaults: {
        ...buildWorkbenchConfigurationDefaults(),
        'workbench.colorTheme': getPaletteById(initialThemeId).baseVsCodeTheme,
        'workbench.colorCustomizations': buildWorkbenchColorCustomizations(initialThemeId),
      },
    },
  )

  // Core workbench initialized — if `defaultLayout.editors` wasn't already populated, run quick-file fallback
  if (initialEditorEntries.length === 0) {
    const { openQuickLaunchFileIfPresent } = await import('./hanzo/workspace.ts')
    void openQuickLaunchFileIfPresent()
  }
}

/**
 * Phase 2: Deferred features — runs AFTER the loading screen is removed.
 * AI features, extensions, MCP servers, workspace services, indexing.
 * The user sees the IDE immediately while these initialize in the background.
 */
export async function initializeDeferredFeatures(): Promise<void> {
  console.log('[hanzo] Starting deferred features...')

  // The Hanzo AI frontend's `hanzoEngine.startListening()` bootstrap used to
  // run here. Hanzo listens to `engine-event` directly via Tauri's
  // `listen()` API in src/hanzo/chat/streaming.ts (and the activity feed
  // / progress listeners). Removed in extraction phase 2 along with the
  // rest of the Hanzo AI frontend assets.

  // ─── Mount Zen 38px Toolbar & Minimal Workspace Layout Immediately ─────────
  import('./hanzo/account.ts')
    .then(({ registerAccount }) => registerAccount())
    .catch((e) => console.warn('[hanzo] account toolbar failed:', e))
  import('./hanzo/zen-workspace.ts')
    .then(({ initializeZenWorkspace }) => initializeZenWorkspace())
    .catch((e) => console.warn('[hanzo] zen workspace failed:', e))

  // ─── Hanzo AI Features ──────────────────────────────────────────────────
  // Each feature in its own try/catch so one failure doesn't kill the rest
  try { registerHanzoSettingsPane() } catch (e) { console.warn('[hanzo] settings pane failed:', e) }
  try { registerHanzoChat() } catch (e) { console.warn('[hanzo] chat failed:', e) }
  try { registerInlineEdit() } catch (e) { console.warn('[hanzo] inline edit failed:', e) }
  try { registerGhostCompletions() } catch (e) { console.warn('[hanzo] completions failed:', e) }
  try { registerHanzoExtensions() } catch (e) { console.warn('[hanzo] extensions panel failed:', e) }
  try { registerActivityFeed() } catch (e) { console.warn('[hanzo] activity feed failed:', e) }
  import('./hanzo/terminal-cmdk.ts')
    .then((m) => m.registerTerminalCmdK())
    .catch((e) => console.warn('[hanzo] terminal cmd+k failed:', e))
  import('./hanzo/add-to-chat.ts')
    .then((m) => m.registerAddToChat())
    .catch((e) => console.warn('[hanzo] add-to-chat failed:', e))
  registerMemory().catch(e => console.warn('[hanzo] memory palace failed:', e))
  import('./hanzo/zap.ts')
    .then(({ registerZap }) => registerZap())
    .catch(e => console.warn('[hanzo] local bus listener failed:', e))
  initEditorIntegration().catch(e => console.warn('[hanzo] editor integration failed:', e))

  // Register edit review listener immediately — before agent can start
  import('./hanzo/tool-bridge.ts').then(({ initEditReviewListener, initToolBridge }) => {
    initEditReviewListener()
    initToolBridge().catch(e => console.warn('[hanzo] tool bridge failed:', e))
  })
  console.log('[hanzo] AI features registered')

  // ─── Register Open Folder / File commands in command palette ──────────────
  const { CommandsRegistry } = await import('@codingame/monaco-vscode-api/vscode/vs/platform/commands/common/commands')
  const { pickAndOpenFolder, pickAndOpenFile } = await import('./hanzo/workspace.ts')

  CommandsRegistry.registerCommand('hanzo.openFolder', () => pickAndOpenFolder())
  CommandsRegistry.registerCommand('hanzo.openFile', () => pickAndOpenFile())
  CommandsRegistry.registerCommand('workbench.action.files.openFolder', () => pickAndOpenFolder())
  CommandsRegistry.registerCommand('hanzo.getPhoneApp', () => {
    void import('./hanzo/phone-app-modal.ts').then((m) => m.openPhoneAppModal())
  })
  CommandsRegistry.registerCommand('hanzo.newScratchFile', () => {
    void import('./hanzo/zen-workspace.ts').then(({ execZenCommand }) => {
      void execZenCommand('workbench.action.files.newUntitledFile')
    })
  })
  CommandsRegistry.registerCommand('hanzo.mcp.openDrawer', () => {
    void import('./hanzo/zen-workspace.ts').then(({ toggleZenPanel }) => {
      void toggleZenPanel('integrations')
    })
  })
  CommandsRegistry.registerCommand('hanzo.mcp.runTool', () => {
    void import('./hanzo/mcp-drawer.ts').then(({ openMcpToolRunnerModal }) => {
      openMcpToolRunnerModal()
    })
  })
  CommandsRegistry.registerCommand('hanzo.mcp.addCustomServer', () => {
    void import('./hanzo/mcp-drawer.ts').then(({ openAddCustomMcpModal }) => {
      openAddCustomMcpModal()
    })
  })

  // ─── Register Extension MCP Adapters ─────────────────────────────────────
  try {
    const {
      registerExtensionAdapters, registerFormatCommand,
      registerInstallCommand, scanAndRegisterInstalledExtensions,
    } = await import('./hanzo/extension-mcp.ts')
    await registerFormatCommand()
    await registerInstallCommand()
    // Register known adapters + scan installed extensions after MCP registry initializes
    if (tauri()) setTimeout(async () => {
      await registerExtensionAdapters().catch((e) =>
        console.warn('[hanzo] Extension adapter registration failed:', e),
      )
      await scanAndRegisterInstalledExtensions().catch((e) =>
        console.warn('[hanzo] Extension scan failed:', e),
      )
    }, 2000)
  } catch (e) {
    console.warn('[hanzo] Extension MCP setup failed:', e)
  }


  // ─── Load installed extensions into the workbench ──────────────────────────
  // Registers themes, grammars, icon packs, snippets, keybindings, etc.
  // Runs on requestIdleCallback so it never blocks folder open or UI.
  try {
    const { loadAllInstalledExtensions } = await import('./hanzo/extension-loader.ts')
    const startLoader = () => {
      loadAllInstalledExtensions().catch((e) =>
        console.warn('[hanzo] Extension loader failed:', e),
      )
    }
    // Use idle callback if available, otherwise a long delay
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(startLoader, { timeout: 15000 })
    } else {
      setTimeout(startLoader, 10000)
    }
  } catch (e) {
    console.warn('[hanzo] Extension loader setup failed:', e)
  }

  // ─── Hide VS Code Extensions icon + watermark patcher ────────────────────
  // Both used to be 4–5 staggered setTimeouts (B31, B33). Replaced with a
  // single MutationObserver scoped to .monaco-workbench so we react when the
  // DOM is actually ready instead of guessing. The observer self-disconnects
  // when both targets are handled OR after 30 s as a safety net.
  function hideVscodeExtensions(): boolean {
    // B32: match by command/identifier where possible. The aria-label
    // approach broke under non-English locales because it required a
    // localised "Extensions" string. We still fall back to aria for builds
    // where the id selector doesn't catch our quarry.
    let hidAny = false
    document.querySelectorAll('.activitybar .action-item').forEach(el => {
      // Skip our own Extensions panel — id starts with "hanzo".
      if ((el as HTMLElement).id?.toLowerCase().includes('hanzo')) return
      const label = el.querySelector('.action-label')
      const aria = label?.getAttribute('aria-label') || ''
      const labelTitle = label?.getAttribute('title') || ''
      const composite = label?.getAttribute('composite') || ''
      // VS Code's built-in extensions viewlet stable id is workbench.view.extensions
      const isVscodeExtensions =
        composite === 'workbench.view.extensions' ||
        // Aria fallback: covers the macOS shortcut indicator.
        (aria.includes('Extensions') && aria.includes('⇧⌘X')) ||
        (labelTitle.includes('Extensions') && labelTitle.includes('⇧⌘X'))
      if (isVscodeExtensions) {
        ;(el as HTMLElement).style.display = 'none'
        hidAny = true
      }
    })
    return hidAny
  }
  hideVscodeExtensions()
  let extensionsHidden = false
  const workbench = document.querySelector('.monaco-workbench') ?? document.body
  const observer = new MutationObserver(() => {
    if (!extensionsHidden) extensionsHidden = hideVscodeExtensions()
    if (extensionsHidden) observer.disconnect()
  })
  observer.observe(workbench, { childList: true, subtree: true })
  setTimeout(() => observer.disconnect(), 30_000)

  // ─── Start Extension Host (Node.js sidecar for full extension support) ─────
  try {
    const { startExtensionHost, onExtensionsReady, initExtensionInstallSync } = await import('./hanzo/extension-bridge.ts')
    const { getWorkspace } = await import('./hanzo/ide-context.ts')

    // Sync workbench extension installs to the Node.js sidecar
    initExtensionInstallSync().catch((e) =>
      console.warn('[hanzo] Extension install sync failed:', e),
    )

    onExtensionsReady(async (extensions) => {
      console.log(`[hanzo] Extension host ready: ${extensions.length} extensions loaded`)
      extensions.forEach((ext) => {
        console.log(`[hanzo]   ${ext.id} (${ext.commands.length} commands)`)
      })

      // Send the current active editor to the sidecar now that it's ready
      try {
        const { getService: getSvc, ICodeEditorService: ICodeEdSvc } = await import('@codingame/monaco-vscode-api/services')
        const edSvc = await getSvc(ICodeEdSvc) as any
        const ed = edSvc?.getActiveCodeEditor?.()
        const model = ed?.getModel?.()
        if (model?.uri?.scheme === 'file') {
          const { notifyActiveEditorChanged } = await import('./hanzo/extension-bridge.ts')
          const path = model.uri.fsPath || model.uri.path
          const lang = model.getLanguageId?.() ?? 'plaintext'
          const content = model.getValue?.() || ''
          notifyActiveEditorChanged(path, lang, content, model.getVersionId?.() ?? 1)
        }
      } catch { /* no active editor yet, that's fine */ }
    })

    // Kill any orphaned sidecar before starting a new one (Bug #3: page reload orphans)
    const { stopExtensionHost } = await import('./hanzo/extension-bridge.ts')
    await stopExtensionHost().catch(() => {})

    // Clean up sidecar on window close — Tauri's onCloseRequested actually awaits
    // the handler, unlike beforeunload which doesn't reliably wait for promises.
    // The beforeunload below is kept as a best-effort fallback for the page-reload
    // case (folder open triggers a reload, not a window close).
    if (tauri()) try {
      const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow')
      const win = getCurrentWebviewWindow()
      await win.onCloseRequested(async () => {
        try { await stopExtensionHost() } catch {}
      })
    } catch (e) {
      console.warn('[hanzo] Could not register window close handler:', e)
    }
    window.addEventListener('beforeunload', () => {
      stopExtensionHost().catch(() => {})
    })

    // Always start the extension host. Extensions are user-global
    // (~/.hanzo/extensions/), not workspace-specific. Some extensions
    // (Claude Code, Continue, Copilot Chat) activate on
    // onStartupFinished and want to register UI immediately, before
    // the user picks a folder. Previously the host only started when
    // a workspace existed, so any user who opened Hanzo without a
    // folder saw nothing extension-related — symptom: "I installed
    // Claude Code and the panel never showed up." When a folder
    // opens later, the workbench reload re-bootstraps and we restart
    // the host with the new workspace path.
    const ws = getWorkspace()
    console.log('[hanzo] Extension host: workspace =', ws ?? '(none, using user-home)')
    let extDir: string | undefined
    if (tauri()) try {
      const { homeDir } = await import('@tauri-apps/api/path')
      const home = (await homeDir()).replace(/[\\/]+$/, '')
      if (home) extDir = `${home}/.hanzo/extensions`
    } catch (e2) {
      console.warn('[hanzo] Could not resolve home dir:', e2)
    }
    // Pass an empty string when no folder is open. The Node sidecar
    // accepts this (workspaceContains: scans short-circuit on empty
    // path, file-event hooks no-op without a workspace), and any
    // extension that calls vscode.workspace.workspaceFolders gets the
    // empty array we already return in that case.
    const wsForHost = ws || ''
    console.log('[hanzo] Extension host: extDir =', extDir)
    if (tauri()) startExtensionHost(wsForHost, extDir).catch((e) => {
      console.warn('[hanzo] Extension host failed to start:', e)
    })
  } catch (e) {
    console.warn('[hanzo] Extension bridge setup failed:', e)
  }

  // ─── Listen for agent-triggered workspace open ────────────────────────────
  try {
    const { listenForWorkspaceOpen, watchWorkspaceFolders, initWorkspaceServices } = await import('./hanzo/workspace.ts')
    await listenForWorkspaceOpen()
    await watchWorkspaceFolders()
    await initWorkspaceServices()
  } catch (e) {
    console.warn('[hanzo] Workspace listener setup failed:', e)
  }

  // ─── Wire the native application menu to workbench commands ────────────────
  try {
    const { listenForMenuActions } = await import('./hanzo/app-menu.ts')
    await listenForMenuActions()
  } catch (e) {
    console.warn('[hanzo] App-menu listener setup failed:', e)
  }

  // ─── Apply Hanzo IDE — Zen theme & register shell commands ──────────────
  const setTheme = async (next: HanzoThemeId) => {
    applyDocumentAppearance(next)
    const palette = getPaletteById(next)
    await updateUserConfiguration(
      JSON.stringify({
        'workbench.colorTheme': palette.baseVsCodeTheme,
        'workbench.colorCustomizations': buildWorkbenchColorCustomizations(next),
      }),
    )
  }

  CommandsRegistry.registerCommand('hanzo.useZenTheme', () => setTheme('zen'))
  CommandsRegistry.registerCommand('hanzo.useClayTheme', () => setTheme('clay'))
  CommandsRegistry.registerCommand('hanzo.useDarkTheme', () => setTheme('zen'))
  CommandsRegistry.registerCommand('hanzo.useLightTheme', () => setTheme('light'))
  CommandsRegistry.registerCommand('hanzo.toggleTheme', () => {
    const next: HanzoThemeId = readStoredThemeId() === 'light' ? 'zen' : 'light'
    return setTheme(next)
  })
  CommandsRegistry.registerCommand('hanzo.cycleTheme', () => {
    const cur = readStoredThemeId()
    const next: HanzoThemeId = cur === 'zen' ? 'clay' : cur === 'clay' ? 'light' : 'zen'
    return setTheme(next)
  })
  CommandsRegistry.registerCommand('hanzo.toggleLayoutSide', () =>
    import('./hanzo/zen-workspace.ts').then(({ toggleLayoutSide }) => toggleLayoutSide()),
  )
  CommandsRegistry.registerCommand('hanzo.useReferenceLayout', () =>
    import('./hanzo/zen-workspace.ts').then(({ toggleLayoutSide }) => toggleLayoutSide('ai-left')),
  )
  CommandsRegistry.registerCommand('hanzo.useDefaultLayout', () =>
    import('./hanzo/zen-workspace.ts').then(({ toggleLayoutSide }) => toggleLayoutSide('tree-left')),
  )
  if (tauri()) {
    const { setDockIconMode } = await import('./hanzo/dock-icon.ts')
    CommandsRegistry.registerCommand('hanzo.dockIcon.branded', () => setDockIconMode('branded'))
    CommandsRegistry.registerCommand('hanzo.dockIcon.minimal', () => setDockIconMode('minimal'))
    const { listen } = await import('./hanzo/tauri.ts')
    void listen<string>('open-hanzo-settings', ({ payload }) => {
      void import('./hanzo/settings-modal.ts').then(({ openHanzoSettingsModal }) => {
        openHanzoSettingsModal((payload as any) || 'local-node')
      })
    }).catch(() => {})
  }
  CommandsRegistry.registerCommand('hanzo.commandOrInlineEdit', async () => {
    const { StandaloneServices, getService, ICodeEditorService } = await import(
      '@codingame/monaco-vscode-api/services'
    )
    const { ICommandService } = await import(
      '@codingame/monaco-vscode-api/vscode/vs/platform/commands/common/commands'
    )
    const edSvc = (await getService(ICodeEditorService)) as any
    const activeEd = edSvc?.getActiveCodeEditor?.()
    const sel = activeEd?.getSelection?.()
    const cmdSvc = StandaloneServices.get(ICommandService) as any
    if (activeEd?.hasTextFocus?.() && sel && !sel.isEmpty?.()) {
      await cmdSvc?.executeCommand?.('hanzo.inlineEdit')
    } else {
      await cmdSvc?.executeCommand?.('workbench.action.showCommands')
    }
  })

  // Global Zen Workspace shortcuts (`hanzo-ide.html` + `Hanzo Dev` parity):
  //   Ctrl/⌘ K        → Command Palette (and starts 1.4s chord for Ctrl+K Ctrl+O → Open folder)
  //   Ctrl/⌘ O        → Open file (or Open folder if within Ctrl+K chord)
  //   Ctrl/⌘ B        → Toggle Left Sidebar
  //   Ctrl `          → Toggle Bottom Terminal Panel
  //   Ctrl/⌘ Alt B    → Toggle Right AI Sidebar
  //   Ctrl/⌘ ,        → Settings
  let chordTimestamp = 0
  window.addEventListener(
    'keydown',
    (e) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      const key = e.key.toLowerCase()
      if (key === 'k' && !e.shiftKey && !e.altKey) {
        chordTimestamp = Date.now()
        const target = e.target as HTMLElement | null
        if (target?.closest?.('.monaco-editor')) return // handled by inline.ts
        if (target?.closest?.('.quick-input-widget')) return
        e.preventDefault()
        e.stopPropagation()
        void import('./hanzo/zen-workspace.ts').then(({ execZenCommand }) => {
          void execZenCommand('workbench.action.showCommands')
        })
      } else if (key === 'p' && !e.shiftKey && !e.altKey) {
        if ((e.target as HTMLElement | null)?.closest?.('.quick-input-widget')) return
        e.preventDefault()
        e.stopPropagation()
        void import('./hanzo/zen-workspace.ts').then(({ execZenCommand }) => {
          void execZenCommand('workbench.action.quickOpen')
        })
      } else if (key === 'n' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        e.stopPropagation()
        void import('./hanzo/zen-workspace.ts').then(({ execZenCommand }) => {
          void execZenCommand('workbench.action.files.newUntitledFile')
        })
      } else if (key === 'o' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        e.stopPropagation()
        const inChord = Date.now() - chordTimestamp < 1400
        chordTimestamp = 0
        if (inChord) {
          void pickAndOpenFolder()
        } else {
          void pickAndOpenFile()
        }
      } else if (e.key === ',' && !e.shiftKey && !e.altKey) {
        e.preventDefault()
        e.stopPropagation()
        void import('./hanzo/settings-modal.ts').then(({ openHanzoSettingsModal }) => {
          openHanzoSettingsModal('general')
        })
      } else if (key === 'b' && e.altKey && !e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        void import('./hanzo/zen-workspace.ts').then(({ toggleZenPanel }) => {
          void toggleZenPanel('right')
        })
      } else if (key === 'b' && !e.altKey && !e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        void import('./hanzo/zen-workspace.ts').then(({ toggleZenPanel }) => {
          void toggleZenPanel('left')
        })
      } else if (e.key === '`' && !e.altKey && !e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        void import('./hanzo/zen-workspace.ts').then(({ toggleZenPanel }) => {
          void toggleZenPanel('bottom')
        })
      }
    },
    { capture: true },
  )

  await setTheme(readStoredThemeId())
}
