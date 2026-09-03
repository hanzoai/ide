/**
 * Hanzo detached chat window - standalone bootstrap.
 *
 * Runs in a separate Tauri WebviewWindow (label "hanzo-chat-detached")
 * created by the `open_chat_window` Rust command. This entry point
 * does NOT load the Monaco workbench, the file explorer, the
 * extension host, or any other IDE machinery - only the chat panel.
 *
 * State migration with the main window happens via localStorage:
 *   - On Detach: main window writes `hanzo:chat:detached-state` and
 *     opens this window. We hydrate from that key on mount.
 *   - On Reattach: this window writes the current state back to the
 *     same key, emits `chat-reattach` to main, and closes.
 *
 * Engine events: Tauri's `app.emit()` broadcasts to every webview, so
 * the chat module's existing `engine-event` listener picks up streaming
 * deltas, tool requests, etc. without any extra plumbing.
 */
import '@codingame/monaco-vscode-api/vscode/vs/base/browser/ui/codicons/codicon/codicon.css'
import '@codingame/monaco-vscode-api/vscode/vs/base/browser/ui/codicons/codicon/codicon-modifiers.css'
import './styles/tokens.css'

import { invoke } from '@tauri-apps/api/core'
import { emit, listen, tauri } from './hanzo/tauri.ts'
import { finish } from './hanzo/iam.ts'

import { S } from './hanzo/chat/state.ts'
import type { ChatMsg } from './hanzo/chat/types.ts'
import { build } from './hanzo/chat/index.ts'
import { showStreamingBubble } from './hanzo/chat/render.ts'
import { ensureListening } from './hanzo/chat/streaming.ts'

const DETACHED_STATE_KEY = 'hanzo:chat:detached-state'

/**
 * Snapshot of state migrated between the auxiliary-bar slot and the
 * detached window. Only the values that need to survive the handoff
 * are listed - DOM refs (S.msgList etc.) are local to each window
 * and recomputed on mount.
 */
interface DetachedSnapshot {
  messages: ChatMsg[]
  sessionId: string | null
  runId: string | null
  streamAccum: string
  streaming: boolean
  selectedAgentId: string | null
  selectedModel: string | null
}

function readSnapshot(): DetachedSnapshot | null {
  try {
    const raw = localStorage.getItem(DETACHED_STATE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as DetachedSnapshot
  } catch (e) {
    console.warn('[hanzo-chat-detached] snapshot read failed:', e)
    return null
  }
}

function writeSnapshot(snap: DetachedSnapshot): void {
  try {
    localStorage.setItem(DETACHED_STATE_KEY, JSON.stringify(snap))
  } catch (e) {
    console.warn('[hanzo-chat-detached] snapshot write failed:', e)
  }
}

function clearSnapshot(): void {
  try {
    localStorage.removeItem(DETACHED_STATE_KEY)
  } catch { /* nothing to do */ }
}

function currentSnapshot(): DetachedSnapshot {
  return {
    messages: S.messages,
    sessionId: S.sessionId,
    runId: S.runId,
    streamAccum: S.streamAccum,
    streaming: S.streaming,
    selectedAgentId: S.selectedAgent?.agent_id ?? null,
    selectedModel: S.selectedModel,
  }
}

/**
 * The single reattach code path used by:
 *   - the Reattach button in this window
 *   - the `chat-trigger-reattach` event from the main panel's
 *     "Bring chat back" button
 *   - the `beforeunload` handler (best-effort on OS X close)
 *
 * Steps: snapshot current state to localStorage, emit `chat-reattach`
 * so the main panel hydrates, then ask Rust to close this window.
 * Idempotent — guarded by `reattaching` so concurrent triggers don't
 * double-emit or race the close.
 */
let reattaching = false
async function performReattach(): Promise<void> {
  if (reattaching) return
  reattaching = true
  try {
    writeSnapshot(currentSnapshot())
    try { await emit('chat-reattach') } catch (e) { console.warn('[hanzo-chat-detached] emit reattach failed:', e) }
    try { await invoke('close_chat_window') } catch (e) { console.warn('[hanzo-chat-detached] close failed:', e) }
  } finally {
    // Don't reset — the window is closing.
  }
}

function applySnapshot(snap: DetachedSnapshot): void {
  S.messages = snap.messages ?? []
  S.sessionId = snap.sessionId ?? null
  S.runId = snap.runId ?? null
  S.streamAccum = snap.streamAccum ?? ''
  S.streaming = snap.streaming ?? false
  // selectedAgent comes back through prefs once the agent list arrives.
  S.selectedModel = snap.selectedModel ?? null
}

/** Send the chat back to the main window. */
function reattach(): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.title = 'Return the chat to the main window'
  btn.setAttribute('aria-label', 'Return the chat to the main window')
  btn.innerHTML = '<span class="codicon codicon-screen-normal" style="font-size:13px"></span>'
  btn.addEventListener('click', () => { void performReattach() })
  return btn
}

async function bootstrap(): Promise<void> {
  if (!tauri()) await finish().catch((e) => console.warn('[hanzo-chat-detached] sign-in did not finish:', e))
  const root = document.getElementById('hanzo-chat-detached-root')
  if (!root) {
    console.error('[hanzo-chat-detached] root element missing')
    return
  }

  // 1. Hydrate the migrated snapshot, if any. The main window writes
  //    this immediately before opening us; under normal use the key is
  //    populated. Missing key means cold-launching the chat directly,
  //    in which case we start empty and the user sees a fresh chat.
  const snap = readSnapshot()
  if (snap) {
    applySnapshot(snap)
    // Clear so a future cold-launch doesn't replay stale state. We
    // re-write it on Reattach.
    clearSnapshot()
  }

  // 2. Set up the engine-event listener (drives streaming deltas, tool
  //    requests, etc). The same listener the main window uses.
  await ensureListening()

  // 3. Listen for the main panel's "Bring chat back" trigger. This is
  //     symmetric with the Reattach button click — both code paths run
  //     `performReattach()` from inside this window's JS, which means
  //     the snapshot write and `chat-reattach` emit are guaranteed to
  //     happen before close. Relying on `beforeunload` to do this on a
  //     Rust-initiated close was unreliable (the Tauri close path can
  //     skip JS lifecycle events), which left the main panel stuck on
  //     the placeholder.
  try {
    await listen('chat-trigger-reattach', () => { void performReattach() })
  } catch (e) {
    console.warn('[hanzo-chat-detached] trigger-reattach listener failed:', e)
  }

  // 4. Build the chat; Reattach is this window's control.
  const chat = build(root)
  if (tauri()) chat.actions.appendChild(reattach())
  if (S.streaming) showStreamingBubble()

  // Closing through the OS control still hands the chat back: write the
  // snapshot and tell the main window before the page goes.
  window.addEventListener('beforeunload', () => {
    try { writeSnapshot(currentSnapshot()) } catch { /* best effort */ }
    void emit('chat-reattach').catch(() => { /* swallow */ })
  })
}

bootstrap().catch((e) => {
  console.error('[hanzo-chat-detached] bootstrap failed:', e)
  const root = document.getElementById('hanzo-chat-detached-root')
  if (root) {
    root.innerHTML = `<div style="padding:24px;color:#f88;font-family:var(--hanzo-font-mono, monospace);font-size:12px"><h3>Detached chat failed to start</h3><pre style="white-space:pre-wrap;margin-top:8px">${String(e)}</pre></div>`
  }
})
