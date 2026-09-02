/**
 * Hanzo Workbench Initialization
 *
 * Boots the full VS Code workbench shell using @codingame/monaco-vscode-api v28.
 * All 55+ service overrides are registered to match the full VS Code experience.
 */

// ─── Hanzo Design System ─────────────────────────────────────────────────────
import './styles/tokens.css'
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
import { registerHanzoChat } from './hanzo/chat/index.ts'
import { registerInlineEdit } from './hanzo/inline.ts'
import { registerGhostCompletions } from './hanzo/completions.ts'
import { registerHanzoExtensions } from './hanzo/extensions.ts'
import { registerActivityFeed } from './hanzo/activity-feed.ts'
import { initEditorIntegration } from './hanzo/editor.ts'
import { registerMemory } from './hanzo/memory/index.ts'

// ─── Workbench initialization ─────────────────────────────────────────────────

function setLoadingStatus(msg: string) {
  const el = document.getElementById('hanzo-load-status')
  if (el) el.textContent = msg
  else console.log('[hanzo-boot]', msg)
}

export async function initializeWorkbench(): Promise<void> {
  const container = document.getElementById('workbench-shell')!

  // Inject a visible status line into the loading screen
  const loading = document.getElementById('workbench-loading')
  if (loading) {
    const statusEl = document.createElement('div')
    statusEl.id = 'hanzo-load-status'
    statusEl.style.cssText = 'margin-top:12px;font-size:11px;color:#888;font-family:Zen Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace}

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

  // ─── Register FS provider BEFORE initialize() ─────────────────────────────
  setLoadingStatus('Registering file system...')
  registerFileSystemOverlay(1, new TauriFileSystemProvider())

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
        // The signature is loosely typed in @codingame/monaco-vscode-api;
        // runtime reality is that `resource` is either a URI or carries
        // `.object.textEditorModel.uri`. Try both.
        const uri = resource?.scheme ? resource
          : (resource?.object?.textEditorModel?.uri ?? resource?.resource ?? null)
        if (!uri || uri.scheme !== 'file') return false
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
        nameShort: 'Hanzo',
        nameLong: 'Hanzo — Agent Workspace',
        applicationName: 'hanzo',
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

      configurationDefaults: {
        'workbench.colorTheme': 'Default Dark Modern',
        'editor.fontFamily': "'Zen Mono', 'SF Mono', ui-monospace, monospace",
        'terminal.integrated.fontFamily': "'Zen Mono', 'SF Mono', ui-monospace, monospace",
        'debug.console.fontFamily': "'Zen Mono', 'SF Mono', ui-monospace, monospace",
        'chat.editor.fontFamily': "'Zen Mono', 'SF Mono', ui-monospace, monospace",
        'editor.fontSize': 13,
        'editor.tabSize': 2,
        'editor.renderWhitespace': 'selection',
        'editor.minimap.enabled': false,
        'workbench.startupEditor': 'none',
        'window.menuBarVisibility': 'hidden',
        'workbench.activityBar.location': 'default',
        // Prevent command palette from closing on spurious focus loss in Tauri WKWebView.
        'workbench.quickOpen.closeOnFocusLost': false,
        // Enable Prettier extension (it defaults to disabled if config returns undefined)
        'prettier.enable': true,
        // File icon theme — Seti gives proper per-type icons (COBOL, JS, etc.)
        'workbench.iconTheme': 'vs-seti',
        // Merge single-child folders into one row to keep the tree compact
        'explorer.compactFolders': true,
      },
    },
  )

  // Core workbench initialized — loading screen can now be removed.
  // Everything below runs in initializeDeferredFeatures() AFTER the UI is visible.
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
  import('./hanzo/account.ts')
    .then(({ registerAccount }) => registerAccount())
    .catch(e => console.warn('[hanzo] account control failed:', e))
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

  // ─── Register Open Folder command in command palette ────────────────────
  const { CommandsRegistry } = await import('@codingame/monaco-vscode-api/vscode/vs/platform/commands/common/commands')
  const { pickAndOpenFolder } = await import('./hanzo/workspace.ts')

  CommandsRegistry.registerCommand('hanzo.openFolder', () => pickAndOpenFolder())
  CommandsRegistry.registerCommand('workbench.action.files.openFolder', () => pickAndOpenFolder())

  // ─── Register Extension MCP Adapters ─────────────────────────────────────
  try {
    const {
      registerExtensionAdapters, registerFormatCommand,
      registerInstallCommand, scanAndRegisterInstalledExtensions,
    } = await import('./hanzo/extension-mcp.ts')
    await registerFormatCommand()
    await registerInstallCommand()
    // Register known adapters + scan installed extensions after MCP registry initializes
    setTimeout(async () => {
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
  function patchWatermark(): boolean {
    const letterpress = document.querySelector<HTMLElement>(
      '.monaco-workbench .editor-group-watermark .letterpress, .monaco-workbench .editor-group-watermark > .letterpress'
    )
    if (!letterpress) return false
    letterpress.style.cssText += ';background:url("/mark.svg") center/contain no-repeat!important;width:76px!important;height:76px!important;font-size:0!important;color:transparent!important;opacity:1!important;filter:none!important'
    Array.from(letterpress.children).forEach(c => { (c as HTMLElement).style.display = 'none' })
    return true
  }

  patchWatermark()
  hideVscodeExtensions()
  let watermarkPatched = false
  let extensionsHidden = false
  const workbench = document.querySelector('.monaco-workbench') ?? document.body
  const observer = new MutationObserver(() => {
    if (!watermarkPatched) watermarkPatched = patchWatermark()
    if (!extensionsHidden) extensionsHidden = hideVscodeExtensions()
    if (watermarkPatched && extensionsHidden) observer.disconnect()
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
    try {
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
    try {
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
    startExtensionHost(wsForHost, extDir).catch((e) => {
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

  // ─── Apply Hanzo theme colors ─────────────────────────────────────────────
  await updateUserConfiguration(JSON.stringify({
    'workbench.colorCustomizations': {
      'activityBar.background': '#111111',
      'activityBar.activeBorder': '#d8d8d8',
      'activityBar.foreground': '#cccccc',
      'activityBar.inactiveForeground': '#555555',
      'activityBarBadge.background': '#d8d8d8',
      'activityBarBadge.foreground': '#000000',
      'statusBar.background': '#111111',
      'statusBar.foreground': '#cccccc',
      'statusBar.noFolderBackground': '#333333',
      'sideBar.background': '#161616',
      'sideBarSectionHeader.background': '#111111',
      'editorGroupHeader.tabsBackground': '#131313',
      'tab.activeBackground': '#1a1a1a',
      'tab.inactiveBackground': '#131313',
      'panel.background': '#161616',
      'panelTitle.activeBorder': '#d8d8d8',
      'button.background': '#1f1f1f',
      'button.foreground': '#fafafa',
      'button.border': '#333333',
      'button.secondaryBackground': '#161616',
      'button.secondaryForeground': '#a1a1a1',
      'button.secondaryHoverBackground': '#222222',
      'button.hoverBackground': '#2a2a2a',
      'list.activeSelectionBackground': '#242424',
      'list.activeSelectionForeground': '#d8d8d8',
      'list.inactiveSelectionBackground': '#1c1c1c',
      'list.focusBackground': '#242424',
      'list.hoverBackground': '#1a1a1a',
      'list.focusOutline': '#d8d8d8',
      'progressBar.background': '#d8d8d8',
      'titleBar.activeBackground': '#111111',

      // Seams. The workbench paints its own 1px borders from these; with the
      // panels at #111111 against a #000000 editor the value step already
      // separates them, so every seam is transparent rather than a drawn line.
      'contrastBorder': '#00000000',
      'sash.hoverBorder': '#00000000',
      'focusBorder': '#3a3a3a',
      'contrastActiveBorder': '#00000000',
      'activityBar.border': '#00000000',
      'sideBar.border': '#00000000',
      'sideBarSectionHeader.border': '#00000000',
      'statusBar.border': '#00000000',
      'titleBar.border': '#00000000',
      'panel.border': '#00000000',
      'editorGroup.border': '#00000000',
      'editorGroupHeader.tabsBorder': '#00000000',
      'editorGroupHeader.border': '#00000000',
      'tab.border': '#00000000',
      'menu.border': '#00000000',
      'widget.border': '#00000000',
      'input.border': '#2a2a2a',
      'dropdown.border': '#2a2a2a',
      // Git decorations — the badge letter (M/U/A/D/C) carries the state,
      // so these stay on the neutral ramp instead of adding hue to the tree.
      'gitDecoration.modifiedResourceForeground': '#d8d8d8',
      'gitDecoration.untrackedResourceForeground': '#b4b4b4',
      'gitDecoration.ignoredResourceForeground': '#444444',
      'gitDecoration.deletedResourceForeground': '#888888',
      'gitDecoration.renamedResourceForeground': '#b4b4b4',
      'gitDecoration.stageModifiedResourceForeground': '#d8d8d8',
      'gitDecoration.conflictingResourceForeground': '#d8d8d8',
    },
  }))
}
