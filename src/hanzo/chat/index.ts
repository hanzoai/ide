/**
 * Hanzo Chat — Panel Registration & Entry Point
 *
 * registerHanzoChat() creates the VS Code custom view panel,
 * wires up DOM elements, and loads initial data.
 *
 * Re-exports registerHanzoChat as the public API for workbench.ts.
 */

import './styles.css'

import { marked } from 'marked'
import { invoke } from '@tauri-apps/api/core'
import { listen, tauri } from '../tauri.ts'
import { api } from '../cloud.ts'
import { S } from './state.ts'
import type { Agent, Session, StoredMessage, ApprovalMode, ChatMsg } from './types.ts'
import {
  renderMessages,
  renderMessagesFull,
  updateAgentSelect,
  updateSessionSelect,
  updateContextPills,
  renderAttachBar,
  clearPlanProgress,
  openPathInEditor,
  updateStatus,
} from './render.ts'
import { initProgressListener } from './streaming.ts'
import { checkProviders, renderProviderSetup } from './settings.ts'
import { doSend, doAbort, doWhisper, doResume } from './send.ts'
import { loadPrefs, savePrefs } from './prefs.ts'

marked.setOptions({ async: false, breaks: true, gfm: true })

// ─── Data Loading ────────────────────────────────────────────────────────────

async function loadAgents(): Promise<void> {
  if (tauri()) try {
    S.agents = await invoke<Agent[]>('engine_list_all_agents')
  } catch (e) {
    console.warn('[hanzo-chat] failed to load agents:', e)
    S.agents = []
  }
  updateAgentSelect()
}

export async function loadSessions(): Promise<void> {
  if (tauri()) try {
    const all = await invoke<Session[]>('engine_sessions_list')
    // Hide the persistent ghost-completion session from the selector (B49).
    S.sessions = all.filter(s => s.id !== '__hanzo_completions__')
  } catch (e) {
    console.warn('[hanzo-chat] failed to load sessions:', e)
    S.sessions = []
  }
  updateSessionSelect()
}

async function loadHistory(): Promise<void> {
  if (!S.sessionId) return
  try {
    const stored = await invoke<StoredMessage[]>('engine_chat_history', {
      sessionId: S.sessionId,
      limit: 200,
    })
    S.messages = stored
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        ts: new Date(m.created_at),
        messageId: m.id,
      }))
    renderMessages()
  } catch { /* no history yet */ }
}

/** The model select shows these, with the chosen one selected. */
function offer(models: string[]): void {
  if (!S.modelSelect || !models.length) return
  S.modelSelect.innerHTML = ''
  for (const m of models) {
    const opt = document.createElement('option')
    opt.value = m
    opt.textContent = m
    opt.selected = m === S.selectedModel
    S.modelSelect.appendChild(opt)
  }
}

async function loadModels(): Promise<void> {
  if (!tauri()) {
    // Outside the shell the cloud's catalog is the list, and Zen is the default.
    const res = await fetch(`${api}/v1/models`).catch(() => null)
    const ids: string[] = res?.ok ? ((await res.json()).data ?? []).map((m: { id: string }) => m.id) : []
    S.selectedModel ??= ids.includes('zen') ? 'zen' : ids[0] ?? null
    offer(ids)
    return
  }
  try {
    const config = await invoke<any>('engine_get_config')
    S.selectedModel = config?.default_model || null
    if (S.selectedModel) offer([S.selectedModel])
    const models = await invoke<string[]>('engine_list_provider_models', { providerId: '' }).catch(() => [])
    offer(models)
  } catch { /* config not ready */ }
}

export async function updateModelSelect(): Promise<void> {
  if (!S.modelSelect) return
  try {
    const config = await invoke<any>('engine_get_config')
    const providers: any[] = config?.providers ?? []
    const current = S.selectedModel

    const models = new Set<string>()
    if (config?.default_model) models.add(config.default_model)
    for (const p of providers) {
      if (p.default_model) models.add(p.default_model)
    }
    const PRESETS: Record<string, string[]> = {
      anthropic: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
      openai: ['gpt-5.4', 'gpt-4o', 'gpt-4o-mini', 'o3', 'o4-mini'],
      google: ['gemini-3.1-pro-preview', 'gemini-2.5-pro', 'gemini-2.5-flash'],
      moonshot: ['kimi-k2', 'moonshot-v1-128k'],
      deepseek: ['deepseek-chat', 'deepseek-reasoner'],
      claudecode: ['sonnet', 'opus', 'haiku'],
    }
    for (const p of providers) {
      // If provider has enabled_models, only show those. Otherwise show all presets.
      const enabledModels: string[] | undefined = p.enabled_models
      if (enabledModels && enabledModels.length > 0) {
        for (const m of enabledModels) models.add(m)
      } else {
        for (const m of PRESETS[p.kind] ?? []) models.add(m)
      }
    }

    // Always include the currently-selected model, even if it isn't in any
    // provider's presets/enabled list (e.g. a custom or saved model). Without
    // this the dropdown rebuild dropped it and silently fell back to "Auto"
    // while S.selectedModel still pointed at the real model — the UI lied.
    if (current) models.add(current)

    S.modelSelect.innerHTML = ''
    const autoOpt = document.createElement('option')
    autoOpt.value = ''; autoOpt.textContent = 'Auto'
    autoOpt.selected = !current
    S.modelSelect.appendChild(autoOpt)
    for (const m of models) {
      const opt = document.createElement('option')
      opt.value = m; opt.textContent = m
      opt.selected = m === current
      S.modelSelect.appendChild(opt)
    }
  } catch { /* ignore */ }
}

// ─── @git mention: attach the working-tree diff as context ─────────────────────

function insertAtCaret(textarea: HTMLTextAreaElement, text: string): void {
  const pos = textarea.selectionStart
  textarea.value = textarea.value.slice(0, pos) + text + textarea.value.slice(pos)
  const newPos = pos + text.length
  textarea.setSelectionRange(newPos, newPos)
  textarea.dispatchEvent(new Event('input'))
  textarea.focus()
}

async function attachGitDiff(textarea: HTMLTextAreaElement): Promise<void> {
  try {
    const { getWorkspace } = await import('../ide-context.ts')
    const ws = getWorkspace()
    if (!ws) { insertAtCaret(textarea, '\n(no workspace open)\n'); return }
    const staged = await invoke<Array<{ path: string; patch: string }>>('git_diff', { repoPath: ws, staged: true }).catch(() => [])
    const unstaged = await invoke<Array<{ path: string; patch: string }>>('git_diff', { repoPath: ws, staged: false }).catch(() => [])
    const all = [...(staged ?? []), ...(unstaged ?? [])]
    if (all.length === 0) { insertAtCaret(textarea, '\n(no git changes)\n'); return }
    let body = ''
    let budget = 8000 // cap so a huge diff doesn't bloat the input
    for (const d of all) {
      const block = `### ${d.path}\n${d.patch}\n`
      if (budget - block.length < 0) { body += '\n[diff truncated]\n'; break }
      body += block
      budget -= block.length
    }
    insertAtCaret(textarea, `\n\nMy current git changes:\n\`\`\`diff\n${body}\`\`\`\n`)
  } catch (e) {
    console.warn('[hanzo-chat] @git attach failed:', e)
  }
}

// ─── Panel Registration ──────────────────────────────────────────────────────

export interface Chat { actions: HTMLElement; dispose(): void }

/** The chat, built into any host. The host adds its own window control to `actions`. */
export function build(container: HTMLElement): Chat {
  container.className = 'hanzo-chat-container'
  container.style.cssText = 'display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden'

  // 2B: load persisted user prefs BEFORE building the controls so the
  // initial UI state (selected approval mode button, thinking level
  // dropdown, plan-mode toggle) reflects what the user picked last
  // session. selectedAgent is resolved later, after loadAgents()
  // populates S.agents.
  const prefs = loadPrefs()
  S.approvalMode = prefs.approvalMode
  S.thinkingLevel = prefs.thinkingLevel
  S.planMode = prefs.planMode
  const prefsAgentId = prefs.selectedAgentId

  // Helper for the four control mutation sites below. Reads the
  // current S values (rather than taking arguments) so the callsites
  // stay short and don't drift out of sync.
  function persistPrefs(): void {
    savePrefs({
      approvalMode: S.approvalMode,
      thinkingLevel: S.thinkingLevel,
      planMode: S.planMode,
      selectedAgentId: S.selectedAgent?.agent_id ?? null,
    })
  }

  // ── Top Bar (conversation + agent controls) ────────────────────────
  const topBar = document.createElement('div')
  topBar.className = 'hanzo-chat-topbar'

  const topBarMain = document.createElement('div')
  topBarMain.className = 'hanzo-chat-topbar-main'
  const topBarActions = document.createElement('div')
  topBarActions.className = 'hanzo-chat-topbar-actions'
  const topBarContext = document.createElement('div')
  topBarContext.className = 'hanzo-chat-topbar-context'

  topBar.appendChild(topBarMain)
  topBar.appendChild(topBarContext)

  // Session selector
  const sessionSel = document.createElement('select')
  sessionSel.className = 'hanzo-chat-session-select'
  sessionSel.title = 'Conversation history'
  sessionSel.setAttribute('aria-label', 'Conversation history')
  sessionSel.addEventListener('change', async () => {
    if (S.streaming) await doAbort()
    S.surfaced = false; S.surfacedRound = 0
    if (S.resumeBtn) S.resumeBtn.style.display = 'none'
    const val = sessionSel.value
    if (val) {
      S.sessionId = val
      S.messages = []
      await loadHistory()
    } else {
      S.sessionId = null
      S.messages = []
      renderMessagesFull()
    }
  })
  S.sessionSelect = sessionSel
  topBarMain.appendChild(sessionSel)
  topBarMain.appendChild(topBarActions)

  // Agent selector
  const agentLabel = document.createElement('span')
  agentLabel.className = 'hanzo-chat-context-label'
  agentLabel.innerHTML = '<span class="codicon codicon-sparkle" aria-hidden="true"></span><span>Agent</span>'
  topBarContext.appendChild(agentLabel)

  const agentSel = document.createElement('select')
  agentSel.className = 'hanzo-chat-agent-select'
  agentSel.title = 'Choose an agent'
  agentSel.setAttribute('aria-label', 'Agent')
  agentSel.addEventListener('change', () => {
    const val = agentSel.value
    if (!val) {
      S.selectedAgent = null
      persistPrefs()
      return
    }
    // V2 build populates BUILTIN_AGENTS; OSS keeps it empty so we go
    // straight to the DB-agent lookup. The dynamic-import path below is
    // only meaningful when builtins exist.
    import('./send.ts').then(({ BUILTIN_AGENTS }) => {
      if (BUILTIN_AGENTS.length === 0) {
        S.selectedAgent = S.agents.find(a => a.agent_id === val) || null
        persistPrefs()
        return
      }
      const builtin = (BUILTIN_AGENTS as unknown as any[]).find((a: any) => a.agent_id === val)
      if (builtin) {
        S.selectedAgent = {
          agent_id: builtin.agent_id,
          role: builtin.role,
          name: builtin.name,
          system_prompt: builtin.system_prompt,
        } as any
      } else {
        S.selectedAgent = S.agents.find(a => a.agent_id === val) || null
      }
      persistPrefs()
    }).catch(() => {
      S.selectedAgent = S.agents.find(a => a.agent_id === val) || null
      persistPrefs()
    })
  })
  S.agentSelect = agentSel
  topBarContext.appendChild(agentSel)

  // Model selector (rendered in the composer footer)
  const modelSel = document.createElement('select')
  modelSel.className = 'hanzo-chat-model-select'
  modelSel.title = 'Language model'
  modelSel.setAttribute('aria-label', 'Language model')
  modelSel.innerHTML = '<option value="">Auto</option>'
  let modelSaving = false
  modelSel.addEventListener('change', async () => {
    if (modelSaving) return
    S.selectedModel = modelSel.value || null
    // Persist the model selection so it survives reload
    modelSaving = true
    try {
      const config = await invoke<any>('engine_get_config')
      await invoke('engine_set_config', {
        config: { ...config, default_model: S.selectedModel || undefined }
      })
    } catch (e) {
      console.warn('[hanzo-chat] Failed to persist model selection:', e)
    } finally {
      modelSaving = false
    }
  })
  S.modelSelect = modelSel

  // New chat button
  const newBtn = document.createElement('button')
  newBtn.type = 'button'
  newBtn.title = 'New chat'
  newBtn.setAttribute('aria-label', 'Start a new chat')
  newBtn.innerHTML = '<span class="codicon codicon-add" style="font-size:13px"></span>'
  newBtn.addEventListener('click', async () => {
    // Abort any in-flight run first. Without this the old run kept
    // executing on the backend and its delta/complete events (runId still
    // set) bled into the freshly-cleared chat. doAbort marks the run
    // completed and clears runId/streaming. Mirrors the session switcher.
    if (S.streaming) await doAbort()
    // Reset the agent's cognitive state and episodic memories so the new
    // chat starts completely fresh — no working memory or recalled findings
    // carry over from the previous run.
    const agentToReset = S.selectedAgent
    // Do NOT null selectedAgent — engine_agent_reset clears the cognitive
    // state for this agent, so the same agent_id starts fresh on the next
    // send. Nulling it would cause the next send to use "default" agent
    // while the dropdown still visually shows the old agent.
    S.sessionId = null
    S.completedRounds = 0
    S.streamAccum = ''
    S.surfaced = false
    S.surfacedRound = 0
    S.surfacedSummary = ''
    if (S.resumeBtn) S.resumeBtn.style.display = 'none'
    S.messages = []
    clearPlanProgress()
    renderMessagesFull()
    S.textarea?.focus()
    if (agentToReset) {
      try {
        await invoke('engine_agent_reset', { agentId: agentToReset.agent_id })
      } catch (e) {
        console.warn('[hanzo-chat] engine_agent_reset failed:', e)
      }
    }
  })
  topBarActions.appendChild(newBtn)

  // Providers / Settings button
  const settingsBtn = document.createElement('button')
  settingsBtn.type = 'button'
  settingsBtn.title = 'Configure providers & models'
  settingsBtn.setAttribute('aria-label', 'Configure providers and models')
  settingsBtn.innerHTML = '<span class="codicon codicon-settings-gear" style="font-size:13px"></span>'
  settingsBtn.addEventListener('click', () => renderProviderSetup())
  topBarActions.appendChild(settingsBtn)



  container.appendChild(topBar)

  // ── Status + Tool indicator ────────────────────────────────────────
  const statusRow = document.createElement('div')
  statusRow.className = 'hanzo-chat-statusbar'

  const headerStatus = document.createElement('span')
  headerStatus.className = 'hanzo-chat-status'
  headerStatus.setAttribute('role', 'status')
  headerStatus.setAttribute('aria-live', 'polite')
  S.headerStatus = headerStatus
  statusRow.appendChild(headerStatus)

  const tokenDisp = document.createElement('span')
  tokenDisp.className = 'hanzo-chat-token'
  S.tokenDisplay = tokenDisp
  statusRow.appendChild(tokenDisp)

  container.appendChild(statusRow)

  const toolRow = document.createElement('div')
  toolRow.className = 'hanzo-chat-toolrow'
  toolRow.style.cssText = 'display:none;align-items:center;gap:6px;padding:4px 10px;font-size:11px;color:var(--vscode-descriptionForeground);flex-shrink:0'
  toolRow.innerHTML = '<span class="codicon codicon-loading codicon-modifier-spin" style="font-size:12px"></span><span class="hanzo-tool-label">Working…</span>'
  S.toolRow = toolRow
  container.appendChild(toolRow)

  // ── Progress log (sandbox ctx.log messages) ─────────────────────
  const progressLog = document.createElement('div')
  progressLog.className = 'hanzo-chat-progress'
  progressLog.style.cssText = 'display:none;padding:4px 12px 4px 28px;font-size:11px;max-height:120px;overflow-y:auto;flex-shrink:0'
  S.progressLog = progressLog
  container.appendChild(progressLog)

  initProgressListener().catch(console.warn)

  // ── Message list ───────────────────────────────────────────────────
  const messageStage = document.createElement('div')
  messageStage.className = 'hanzo-chat-message-stage'

  const msgList = document.createElement('div')
  msgList.className = 'hanzo-chat-messages'
  msgList.setAttribute('role', 'log')
  msgList.setAttribute('aria-label', 'Chat conversation')
  msgList.setAttribute('aria-live', 'polite')
  msgList.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest('[data-fspath]') as HTMLElement | null
    if (target?.dataset.fspath) openPathInEditor(target.dataset.fspath)
  })
  msgList.addEventListener('wheel', (e) => {
    e.stopPropagation()
    msgList.scrollTop += e.deltaY
  }, { passive: false })

  const scrollLatestBtn = document.createElement('button')
  scrollLatestBtn.type = 'button'
  scrollLatestBtn.className = 'hanzo-chat-scroll-latest'
  scrollLatestBtn.title = 'Jump to latest message'
  scrollLatestBtn.setAttribute('aria-label', 'Jump to latest message')
  scrollLatestBtn.setAttribute('data-visible', 'false')
  scrollLatestBtn.innerHTML = '<span class="codicon codicon-chevron-down" aria-hidden="true"></span>'
  const updateScrollLatest = () => {
    const distance = msgList.scrollHeight - msgList.scrollTop - msgList.clientHeight
    scrollLatestBtn.setAttribute('data-visible', String(distance > 120))
  }
  msgList.addEventListener('scroll', updateScrollLatest, { passive: true })
  scrollLatestBtn.addEventListener('click', () => {
    msgList.scrollTo({ top: msgList.scrollHeight, behavior: 'smooth' })
  })
  const messageObserver = new MutationObserver(updateScrollLatest)
  messageObserver.observe(msgList, { childList: true, subtree: true })

  S.msgList = msgList
  messageStage.appendChild(msgList)
  messageStage.appendChild(scrollLatestBtn)
  container.appendChild(messageStage)

  // ── Context pills bar (rendered inside the composer) ───────────────
  const contextBar = document.createElement('div')
  contextBar.className = 'hanzo-chat-context-bar'
  S.contextBar = contextBar

  // ── Input area ─────────────────────────────────────────────────────
  const inputArea = document.createElement('div')
  inputArea.className = 'hanzo-chat-input-area'

  // Composer footer (context controls, modes, model, and send actions)
  const optionsRow = document.createElement('div')
  optionsRow.className = 'hanzo-chat-options-row'
  const optionsLeft = document.createElement('div')
  optionsLeft.className = 'hanzo-chat-options-left'
  const optionsRight = document.createElement('div')
  optionsRight.className = 'hanzo-chat-options-right'
  optionsRow.appendChild(optionsLeft)
  optionsRow.appendChild(optionsRight)

  const thinkingControl = document.createElement('label')
  thinkingControl.className = 'hanzo-chat-thinking-control'
  thinkingControl.title = 'Reasoning effort'
  thinkingControl.innerHTML = '<span class="codicon codicon-lightbulb" aria-hidden="true"></span>'

  const thinkingSel = document.createElement('select')
  thinkingSel.className = 'hanzo-chat-thinking-select'
  thinkingSel.setAttribute('aria-label', 'Reasoning effort')
  thinkingSel.innerHTML = '<option value="none">None</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>'
  // 2B: restore the persisted level from prefs (S.thinkingLevel was
  // hydrated above) instead of always defaulting to "none".
  thinkingSel.value = S.thinkingLevel || 'none'
  thinkingSel.addEventListener('change', () => {
    S.thinkingLevel = thinkingSel.value
    persistPrefs()
  })
  thinkingControl.appendChild(thinkingSel)
  optionsLeft.appendChild(thinkingControl)

  // Plan mode toggle
  const planBtn = document.createElement('button')
  planBtn.type = 'button'
  planBtn.className = 'hanzo-chat-plan-button'
  planBtn.title = 'Plan mode: agent writes a plan for approval before executing'
  planBtn.innerHTML = '<span class="codicon codicon-list-tree" aria-hidden="true"></span> Plan'
  function updatePlanBtn() {
    planBtn.setAttribute('aria-pressed', String(S.planMode))
    if (S.textarea) S.textarea.placeholder = S.planMode ? 'Describe what you want built… (agent will plan first)' : 'Ask Hanzo anything…'
  }
  planBtn.addEventListener('click', () => {
    S.planMode = !S.planMode
    updatePlanBtn()
    persistPrefs()
  })
  updatePlanBtn()
  optionsLeft.appendChild(planBtn)

  // Approval mode selector
  const approvalWrap = document.createElement('div')
  approvalWrap.className = 'hanzo-chat-approval'
  approvalWrap.setAttribute('role', 'group')
  approvalWrap.setAttribute('aria-label', 'Tool approval mode')
  const approvalModes: { mode: ApprovalMode; label: string; title: string }[] = [
    { mode: 'ask',  label: 'Ask',  title: 'Ask before every write, run, edit, or external action. Read-only tools (file reads, AST queries, git status) still run without asking.' },
    { mode: 'auto', label: 'Auto', title: 'Run without asking, including shell commands, file deletes, and external API calls.' },
  ]
  const approvalBtns: HTMLButtonElement[] = []
  function setApprovalMode(m: ApprovalMode, persist = true) {
    S.approvalMode = m
    approvalBtns.forEach((b, i) => {
      const active = approvalModes[i].mode === m
      b.setAttribute('aria-pressed', String(active))
    })
    // 2B: persist user's approval-mode pick across restarts. The
    // `persist` arg lets the post-build initialisation call this to
    // paint the UI without saving (the value already came FROM
    // localStorage; saving on restore would be a no-op write).
    if (persist) {
      savePrefs({
        approvalMode: S.approvalMode,
        thinkingLevel: S.thinkingLevel,
        planMode: S.planMode,
        selectedAgentId: S.selectedAgent?.agent_id ?? null,
      })
    }
  }
  for (const { mode, label, title } of approvalModes) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.textContent = label
    btn.title = title
    btn.addEventListener('click', () => setApprovalMode(mode))
    approvalBtns.push(btn)
    approvalWrap.appendChild(btn)
  }
  // Paint the buttons to match the loaded preference. Pass persist=false
  // because the value came FROM localStorage; saving here would be a
  // redundant write on every renderBody.
  setApprovalMode(S.approvalMode, false)

  // Text input row
  const inputRow = document.createElement('div')
  inputRow.className = 'hanzo-chat-input-row'

  const textarea = document.createElement('textarea')
  textarea.rows = 1
  textarea.className = 'hanzo-chat-textarea'
  textarea.placeholder = 'Ask Hanzo anything…'
  textarea.setAttribute('aria-label', 'Message Hanzo')
  let _heightTimer: ReturnType<typeof setTimeout> | null = null
  textarea.addEventListener('input', () => {
    if (_heightTimer) return
    _heightTimer = setTimeout(() => {
      _heightTimer = null
      // Measure scrollHeight without collapsing to 'auto' first —
      // collapsing causes a layout reflow that can trigger VS Code's focus manager.
      const target = Math.min(textarea.scrollHeight, 160)
      if (Math.abs(textarea.offsetHeight - target) > 2) {
        textarea.style.height = target + 'px'
      }
    }, 50)
  })
  // Enter sends, Shift+Enter inserts a newline. Skip while an IME
  // composition is active (e.isComposing / keyCode 229) — otherwise
  // pressing Enter to confirm a Japanese/Chinese/Korean candidate would
  // fire off a half-composed message.
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
      e.preventDefault()
      doSend()
    }
  })
  textarea.addEventListener('focus', () => { updateContextPills() })

  // ── Focus theft protection ──
  // VS Code's workbench aggressively reclaims focus for the active editor.
  // When the user is actively typing in the chat textarea, we must prevent
  // any external focus steal. We detect "active typing" by tracking recent
  // input events and immediately reclaim focus if it's stolen mid-type.
  let _lastInputTime = 0
  textarea.addEventListener('input', () => { _lastInputTime = Date.now() })
  textarea.addEventListener('blur', () => {
    // If the user typed within the last 2 seconds, reclaim focus.
    // This prevents VS Code's focus manager from stealing focus mid-sentence.
    if (Date.now() - _lastInputTime < 2000 && textarea.value.length > 0) {
      requestAnimationFrame(() => textarea.focus())
    }
  })
  S.textarea = textarea

  const sendBtn = document.createElement('button')
  sendBtn.type = 'button'
  sendBtn.title = 'Send (Enter)'
  sendBtn.className = 'hanzo-chat-send'
  sendBtn.setAttribute('aria-label', 'Send message')
  sendBtn.disabled = true
  sendBtn.innerHTML = '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"></path><path d="m6 11 6-6 6 6"></path></svg>'
  sendBtn.addEventListener('click', doSend)
  const updateSendState = () => { sendBtn.disabled = textarea.value.trim().length === 0 }
  textarea.addEventListener('input', updateSendState)
  S.sendBtn = sendBtn

  const stopBtn = document.createElement('button')
  stopBtn.type = 'button'
  stopBtn.title = 'Stop generation'
  stopBtn.className = 'hanzo-chat-stop'
  stopBtn.setAttribute('aria-label', 'Stop generation')
  stopBtn.style.display = 'none'
  stopBtn.innerHTML = '<span class="codicon codicon-debug-stop" aria-hidden="true"></span>'
  stopBtn.addEventListener('click', doAbort)
  S.stopBtn = stopBtn

  const surfaceBtn = document.createElement('button')
  surfaceBtn.type = 'button'
  surfaceBtn.title = 'Pause agent and surface findings for discussion'
  surfaceBtn.className = 'hanzo-chat-run-button'
  surfaceBtn.style.display = 'none'
  surfaceBtn.innerHTML = '<span class="codicon codicon-comment-discussion" aria-hidden="true"></span><span>Surface</span>'
  surfaceBtn.addEventListener('click', () => {
    if (S.sessionId) {
      invoke('engine_chat_surface', { sessionId: S.sessionId }).catch(console.warn)
      updateStatus('Surfacing after current tools…')
    }
  })
  S.surfaceBtn = surfaceBtn

  const resumeBtn = document.createElement('button')
  resumeBtn.type = 'button'
  resumeBtn.title = 'Resume audit from where it was paused'
  resumeBtn.className = 'hanzo-chat-run-button'
  resumeBtn.style.display = 'none'
  resumeBtn.innerHTML = '<span class="codicon codicon-debug-continue" aria-hidden="true"></span><span>Resume</span>'
  resumeBtn.addEventListener('click', doResume)
  S.resumeBtn = resumeBtn

  // Shared file picker helper
  async function pickAndAttach(insertMention: boolean): Promise<void> {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const { readTextFile } = await import('@tauri-apps/plugin-fs')
    const picked = await open({ multiple: true, directory: false }).catch(() => null)
    if (!picked) return
    const files = Array.isArray(picked) ? picked : [picked]
    for (const f of files) {
      try {
        const content = await readTextFile(f)
        const name = f.split('/').pop() ?? f
        S.attachments.push({ name, content, isImage: false })
        renderAttachBar()
        if (insertMention && S.textarea) {
          const pos = S.textarea.selectionStart ?? S.textarea.value.length
          const before = S.textarea.value.slice(0, pos)
          const after = S.textarea.value.slice(pos)
          const prefix = before.endsWith('@') ? before.slice(0, -1) : before
          S.textarea.value = `${prefix}@${name} ${after}`
          const newPos = prefix.length + name.length + 2
          S.textarea.setSelectionRange(newPos, newPos)
          S.textarea.dispatchEvent(new Event('input'))
          S.textarea.focus()
        }
      } catch { /* skip unreadable */ }
    }
  }

  // @ mention button
  const mentionBtn = document.createElement('button')
  mentionBtn.type = 'button'
  mentionBtn.title = 'Add file, Git changes, or chat participant (@)'
  mentionBtn.className = 'hanzo-chat-composer-tool'
  mentionBtn.setAttribute('aria-label', 'Add context with an at mention')
  mentionBtn.textContent = '@'
  mentionBtn.addEventListener('click', () => pickAndAttach(true))

  // ── @-mention menu ───────────────────────────────────────────────
  // Pre-Phase-B behaviour: typing `@` at a word boundary opened the
  // file picker immediately. That left no room for chat participants
  // (Continue, Claude Code, etc) which also use `@`. Now we show a
  // small floating menu listing every registered participant plus a
  // "Pick a file…" entry. If no participants are registered the menu
  // skips itself and goes straight to the file picker for backward
  // compatibility.
  let _mentionMenu: HTMLDivElement | null = null
  function dismissMentionMenu(): void {
    if (_mentionMenu) { _mentionMenu.remove(); _mentionMenu = null }
  }
  async function openMentionMenu(): Promise<void> {
    dismissMentionMenu()
    const { listParticipants } = await import('../extension-chat-participants.ts')
    const participants = listParticipants()
    // The menu always shows now — even with zero chat participants it still
    // offers File and Git context items. (Previously it skipped straight to
    // the file picker when no participants were registered, which hid the
    // Git option entirely.)

    const items: { kind: 'participant' | 'file' | 'git'; id: string; label: string; hint?: string }[] = [
      ...participants.map((p) => ({
        kind: 'participant' as const,
        id: p.id,
        label: `@${p.id}`,
        hint: p.fullName,
      })),
      { kind: 'file', id: 'file', label: 'Pick a file…', hint: 'Insert @<filename> from disk' },
      { kind: 'git', id: 'git', label: 'Git changes', hint: 'Attach the current working-tree diff' },
    ]

    const menu = document.createElement('div')
    menu.style.cssText =
      'position:fixed;z-index:99999;background:var(--vscode-menu-background,#1e1e1e);' +
      'border:1px solid var(--vscode-widget-border,#303031);border-radius:6px;' +
      'box-shadow:0 4px 16px rgba(0,0,0,0.35);min-width:240px;max-width:380px;' +
      'font-family:var(--vscode-font-family,system-ui);font-size:13px;' +
      'color:var(--vscode-foreground,#cccccc);overflow:hidden;'
    // Anchor the menu just above the textarea's caret. We use the
    // textarea's bounding rect since the precise caret position
    // would require a hidden mirror element; "above the input row"
    // is good enough for v1.
    const rect = textarea.getBoundingClientRect()
    menu.style.left = `${Math.round(rect.left + 8)}px`
    menu.style.bottom = `${Math.round(window.innerHeight - rect.top + 4)}px`

    const header = document.createElement('div')
    header.textContent = 'Insert mention'
    header.style.cssText =
      'padding:6px 10px;font-size:11px;letter-spacing:0.05em;text-transform:uppercase;' +
      'color:var(--vscode-descriptionForeground,#9d9d9d);' +
      'border-bottom:1px solid var(--vscode-widget-border,#303031);'
    menu.appendChild(header)

    let activeIdx = 0
    const rows: HTMLDivElement[] = []
    for (const [idx, item] of items.entries()) {
      const row = document.createElement('div')
      row.style.cssText = 'padding:6px 12px;cursor:pointer;display:flex;flex-direction:column;gap:1px;'
      row.dataset.idx = String(idx)
      const label = document.createElement('div')
      label.textContent = item.label
      label.style.cssText = 'color:var(--vscode-foreground,#cccccc);'
      row.appendChild(label)
      if (item.hint) {
        const hint = document.createElement('div')
        hint.textContent = item.hint
        hint.style.cssText = 'color:var(--vscode-descriptionForeground,#9d9d9d);font-size:11px;'
        row.appendChild(hint)
      }
      row.addEventListener('mouseenter', () => { setActive(idx) })
      row.addEventListener('mousedown', (ev) => {
        ev.preventDefault() // keep textarea focus
        choose(idx)
      })
      rows.push(row)
      menu.appendChild(row)
    }
    function setActive(i: number): void {
      activeIdx = i
      for (const [j, r] of rows.entries()) {
        r.style.background = j === activeIdx
          ? 'var(--vscode-list-activeSelectionBackground,#094771)'
          : 'transparent'
      }
    }
    setActive(0)

    function choose(idx: number): void {
      const it = items[idx]
      if (!it) { dismissMentionMenu(); return }
      if (it.kind === 'file') {
        dismissMentionMenu()
        // Strip the trailing @ that the user just typed; pickAndAttach
        // re-inserts an @<filename> mention so we don't end up with @@.
        const pos = textarea.selectionStart
        if (textarea.value.slice(pos - 1, pos) === '@') {
          textarea.value = textarea.value.slice(0, pos - 1) + textarea.value.slice(pos)
          textarea.setSelectionRange(pos - 1, pos - 1)
        }
        pickAndAttach(true)
      } else if (it.kind === 'git') {
        dismissMentionMenu()
        // Strip the bare @ then inject the working-tree diff as context.
        const pos = textarea.selectionStart
        if (textarea.value.slice(pos - 1, pos) === '@') {
          textarea.value = textarea.value.slice(0, pos - 1) + textarea.value.slice(pos)
          textarea.setSelectionRange(pos - 1, pos - 1)
        }
        void attachGitDiff(textarea)
      } else {
        // Insert participant id in place of the bare @.
        dismissMentionMenu()
        const pos = textarea.selectionStart
        const before = textarea.value.slice(0, pos)
        const after = textarea.value.slice(pos)
        // The user just typed `@`; replace that with `@<id> ` so the
        // dispatch path in send.ts catches it as a participant.
        const replaced = before.endsWith('@')
          ? `${before.slice(0, -1)}@${it.id} `
          : `${before}@${it.id} `
        textarea.value = replaced + after
        const newPos = replaced.length
        textarea.setSelectionRange(newPos, newPos)
        textarea.dispatchEvent(new Event('input'))
        textarea.focus()
      }
    }

    document.body.appendChild(menu)
    _mentionMenu = menu

    const onKey = (ev: KeyboardEvent) => {
      if (!_mentionMenu) return
      if (ev.key === 'ArrowDown') { ev.preventDefault(); setActive(Math.min(activeIdx + 1, items.length - 1)) }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); setActive(Math.max(activeIdx - 1, 0)) }
      else if (ev.key === 'Enter') { ev.preventDefault(); choose(activeIdx) }
      else if (ev.key === 'Escape') { ev.preventDefault(); dismissMentionMenu(); cleanup() }
      else if (ev.key === ' ' || ev.key === 'Tab') {
        // Letting the user keep typing dismisses the menu.
        dismissMentionMenu(); cleanup()
      }
    }
    const onBlur = () => { dismissMentionMenu(); cleanup() }
    function cleanup(): void {
      textarea.removeEventListener('keydown', onKey, true)
      textarea.removeEventListener('blur', onBlur)
    }
    textarea.addEventListener('keydown', onKey, true)
    textarea.addEventListener('blur', onBlur)
  }

  // Trigger the menu when user types @ at a word boundary.
  textarea.addEventListener('keydown', (e) => {
    if (e.key === '@') {
      const pos = textarea.selectionStart
      const before = textarea.value.slice(0, pos)
      if (before === '' || /[\s\n]$/.test(before)) {
        // Allow the @ to land in the textarea first; opening the
        // menu is async (loads the participants module), and we
        // want the caret position to already include the @.
        requestAnimationFrame(() => { void openMentionMenu() })
      }
    }
  })

  // The "@" toolbar button keeps its old behaviour (file picker)
  // for users who still want a one-click file mention.

  // Attach file button (paperclip)
  const attachBtn = document.createElement('button')
  attachBtn.type = 'button'
  attachBtn.title = 'Attach file'
  attachBtn.className = 'hanzo-chat-composer-tool'
  attachBtn.setAttribute('aria-label', 'Attach file')
  attachBtn.innerHTML = '<span class="codicon codicon-paperclip" aria-hidden="true"></span>'
  attachBtn.addEventListener('click', () => pickAndAttach(false))

  // Image paste support
  textarea.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const blob = item.getAsFile()
        if (!blob) continue
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = reader.result as string
          S.attachments.push({ name: `image-${Date.now()}.png`, content: dataUrl, isImage: true })
          renderAttachBar()
        }
        reader.readAsDataURL(blob)
      }
    }
  })

  inputRow.appendChild(textarea)
  optionsLeft.prepend(attachBtn)
  optionsLeft.prepend(mentionBtn)
  optionsRight.appendChild(approvalWrap)
  optionsRight.appendChild(modelSel)
  optionsRight.appendChild(surfaceBtn)
  optionsRight.appendChild(resumeBtn)
  optionsRight.appendChild(stopBtn)
  optionsRight.appendChild(sendBtn)

  // Attachment bar (shown above input row when files are attached)
  const attachBar = document.createElement('div')
  attachBar.className = 'hanzo-chat-attachment-bar'
  S.attachmentBar = attachBar

  const composer = document.createElement('div')
  composer.className = 'hanzo-chat-composer'
  composer.appendChild(contextBar)
  composer.appendChild(attachBar)
  composer.appendChild(inputRow)
  composer.appendChild(optionsRow)
  inputArea.appendChild(composer)

  // ── Whisper row (visible only while streaming) ──────────────────────
  const whisperRow = document.createElement('div')
  whisperRow.className = 'hanzo-whisper-row'
  S.whisperRow = whisperRow

  const whisperIcon = document.createElement('span')
  whisperIcon.className = 'codicon codicon-comment'
  whisperIcon.style.cssText = 'font-size:11px;opacity:0.45;flex-shrink:0'
  whisperRow.appendChild(whisperIcon)

  const whisperInput = document.createElement('input')
  whisperInput.type = 'text'
  whisperInput.className = 'hanzo-whisper-input'
  whisperInput.placeholder = 'Whisper to agent…'
  whisperInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doWhisper() } })
  S.whisperInput = whisperInput
  whisperRow.appendChild(whisperInput)

  const whisperBtn = document.createElement('button')
  whisperBtn.className = 'hanzo-whisper-btn'
  whisperBtn.title = 'Inject guidance into current run'
  whisperBtn.innerHTML = '<span class="codicon codicon-send" style="font-size:11px"></span>'
  whisperBtn.addEventListener('click', doWhisper)
  whisperRow.appendChild(whisperBtn)

  inputArea.appendChild(whisperRow)

  // Separator line above input
  const separator = document.createElement('div')
  separator.className = 'hanzo-chat-separator'
  container.appendChild(separator)

  container.appendChild(inputArea)

  // ── Load initial data ──────────────────────────────────────────────
  renderMessages()

  checkProviders().then(() => {
    if (S.needsProviderSetup) renderProviderSetup()
    else renderMessages()
  }).catch(() => {
    renderMessages()
  })
  loadAgents()
    .then(() => {
      // 2B: restore the persisted agent selection now that S.agents is
      // populated. selectedAgentId stored in prefs may be stale if the
      // agent has since been deleted; in that case we leave selectedAgent
      // null and let the user repick.
      if (prefsAgentId) {
        const saved = S.agents.find((a) => a.agent_id === prefsAgentId)
        if (saved) {
          S.selectedAgent = saved
          if (S.agentSelect) S.agentSelect.value = prefsAgentId
        }
      }
    })
    .catch(() => {})
  loadSessions().catch(() => {})
  loadModels().then(() => updateModelSelect()).catch(() => {})
  // Capture the unlisten so renderBody-on-remount doesn't stack listeners.
  // Silent failure here means model select never auto-refreshes when the
  // user adds or removes a provider in Settings — log so we can spot it.
  listen('provider-updated', () => updateModelSelect()).then((unlisten) => {
    S.providerUpdatedUnlisten = unlisten
  }).catch((e) => {
    console.warn('[hanzo-chat] provider-updated listener registration failed:', e)
  })

  // Phase 3 v1: re-hydrate from the detached chat's snapshot when the
  // user clicks Reattach in the chat window. The chat-main.ts script
  // serialises state into the same localStorage key the Detach button
  // uses and emits `chat-reattach` before closing its window.
  listen('chat-reattach', () => {
    try {
      const raw = localStorage.getItem('hanzo:chat:detached-state')
      if (!raw) return
      const snap = JSON.parse(raw) as {
        messages?: ChatMsg[]
        sessionId?: string | null
        runId?: string | null
        streamAccum?: string
        streaming?: boolean
        selectedAgentId?: string | null
        selectedModel?: string | null
      }
      if (Array.isArray(snap.messages)) S.messages = snap.messages
      if ('sessionId' in snap) S.sessionId = snap.sessionId ?? null
      if ('runId' in snap) S.runId = snap.runId ?? null
      if (typeof snap.streamAccum === 'string') S.streamAccum = snap.streamAccum
      if (typeof snap.streaming === 'boolean') S.streaming = snap.streaming
      if (typeof snap.selectedModel === 'string') S.selectedModel = snap.selectedModel
      // selectedAgentId hydration relies on S.agents being populated;
      // if loadAgents has already run we resolve, otherwise leave it
      // for the user to repick.
      if (snap.selectedAgentId) {
        const found = S.agents.find((a) => a.agent_id === snap.selectedAgentId)
        if (found) S.selectedAgent = found
      }
      localStorage.removeItem('hanzo:chat:detached-state')
      renderMessagesFull()
      // Re-enable the input row that the "Chat detached" placeholder
      // disabled. Without this the textarea stays read-only after
      // reattach and the user can't type.
      if (S.textarea) {
        S.textarea.disabled = false
        S.textarea.placeholder = 'Ask Hanzo anything…'
      }
      if (S.sendBtn) S.sendBtn.disabled = !S.textarea?.value.trim()
    } catch (e) {
      console.warn('[hanzo-chat] chat-reattach hydration failed:', e)
    }
  }).then((unlisten) => {
    S.chatReattachUnlisten = unlisten
  }).catch((e) => {
    console.warn('[hanzo-chat] chat-reattach listener registration failed:', e)
  })

  return {
    actions: topBarActions,
    dispose() {
      messageObserver.disconnect()
      S.msgList = null; S.textarea = null; S.sendBtn = null; S.stopBtn = null
      S.toolRow = null; S.streamingBubble = null; S.headerStatus = null; S.progressLog = null
      if (S.progressUnlisten) { S.progressUnlisten(); S.progressUnlisten = null }
      if (S.providerUpdatedUnlisten) { S.providerUpdatedUnlisten(); S.providerUpdatedUnlisten = null }
      if (S.chatReattachUnlisten) { S.chatReattachUnlisten(); S.chatReattachUnlisten = null }
      S.agentSelect = null; S.modelSelect = null; S.sessionSelect = null
      S.tokenDisplay = null; S.attachmentBar = null; S.contextBar = null
      S.whisperRow = null; S.whisperInput = null
      S.surfaceBtn = null; S.resumeBtn = null; S.surfaced = false; S.surfacedRound = 0
      S.attachments = []; S.checkpoint = null
    },
  }
}
