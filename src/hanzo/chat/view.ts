// The chat as a workbench view: the auxiliary bar hosts what `build` makes,
// and Detach is the control this host adds.

import { registerCustomView, ViewContainerLocation } from '@codingame/monaco-vscode-workbench-service-override'
import { invoke } from '@tauri-apps/api/core'
import { emit } from '../tauri.ts'
import { S } from './state.ts'
import { build } from './index.ts'
import { ensureListening } from './streaming.ts'
import { renderMessagesFull } from './render.ts'

export function registerHanzoChat(): void {
  ensureListening().catch(console.error)

  registerCustomView({
    id: 'hanzo.chat',
    name: 'Hanzo',
    location: ViewContainerLocation.AuxiliaryBar,
    icon: `${window.location.origin}/mark.svg`,
    order: 0,
    default: true,
    renderBody(container) {
      const chat = build(container)
      chat.actions.appendChild(detach())
      return chat
    },
  })
}

/** Pop the chat into its own window. */
function detach(): HTMLButtonElement {
  // Snapshot the state for the new window to hydrate, ask the shell for
  // the window, and park this panel behind a placeholder until Reattach.
  const detachBtn = document.createElement('button')
  detachBtn.type = 'button'
  detachBtn.title = 'Pop chat into its own window'
  detachBtn.setAttribute('aria-label', 'Open chat in a separate window')
  detachBtn.innerHTML = '<span class="codicon codicon-multiple-windows" style="font-size:13px"></span>'
  detachBtn.addEventListener('click', async () => {
    try {
      const snapshot = {
        messages: S.messages,
        sessionId: S.sessionId,
        runId: S.runId,
        streamAccum: S.streamAccum,
        streaming: S.streaming,
        selectedAgentId: S.selectedAgent?.agent_id ?? null,
        selectedModel: S.selectedModel,
      }
      localStorage.setItem('hanzo:chat:detached-state', JSON.stringify(snapshot))
      await invoke('open_chat_window')
      // Park the main panel: clear the message list and replace it with
      // a "Chat is detached" card so the user has one obvious place
      // to bring it back. Disable the input so they can't send from
      // here while detached.
      renderDetachedPlaceholder()
    } catch (e) {
      console.warn('[hanzo-chat] detach failed:', e)
    }
  })
  return detachBtn
}

/**
 * Replace the message list with a "Chat detached" card and disable
 * the input. Called on Detach. Restored by `renderMessagesFull()`
 * which the chat-reattach listener triggers.
 */
function renderDetachedPlaceholder(): void {
  if (S.msgList) {
    S.msgList.innerHTML = ''
    const card = document.createElement('div')
    card.style.cssText =
      'margin:24px 14px;padding:18px 20px;border-radius:8px;' +
      'background:rgba(255, 255, 255,0.06);border:1px solid rgba(255, 255, 255,0.25);' +
      'display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;'

    const title = document.createElement('div')
    title.style.cssText = 'font-size:13px;font-weight:600;color:var(--hanzo-accent, #ffffff);'
    title.textContent = 'Chat is detached'
    card.appendChild(title)

    const desc = document.createElement('div')
    desc.style.cssText = 'font-size:11px;color:var(--hanzo-text-secondary, #a0a0a8);line-height:1.5;'
    desc.textContent = 'The chat is running in its own window. Bring it back here when you want.'
    card.appendChild(desc)

    const btn = document.createElement('button')
    btn.textContent = 'Bring chat back'
    btn.style.cssText =
      'background:var(--hanzo-accent, #ffffff);color:var(--hanzo-bg, #0a0a0c);' +
      'border:none;border-radius:6px;padding:7px 14px;font-size:12px;font-weight:600;' +
      'cursor:pointer;font-family:inherit;'
    btn.addEventListener('click', async () => {
      // Symmetric with the Reattach button INSIDE the detached
      // window: ask that window's JS to perform the reattach
      // itself (write snapshot → emit chat-reattach → close).
      // We CANNOT just `invoke('close_chat_window')` here because
      // Tauri's Rust-side close skips the JS `beforeunload`, so
      // the snapshot never gets written and the chat-reattach
      // event never fires. By emitting a trigger event, the
      // detached window runs the same code path the working
      // Reattach button uses.
      try { await emit('chat-trigger-reattach') } catch (e) { console.warn('[hanzo-chat] trigger reattach failed:', e) }
      // Belt-and-braces fallback: if the detached window is
      // already gone (no listener), hydrate from any stale
      // localStorage snapshot after a short delay so the user
      // isn't stranded with the placeholder.
      setTimeout(() => {
        // If chat-reattach already fired, the localStorage key
        // has been cleared and S.msgList is no longer the
        // placeholder — bail out.
        if (!localStorage.getItem('hanzo:chat:detached-state')) return
        try {
          const raw = localStorage.getItem('hanzo:chat:detached-state')
          if (!raw) return
          const snap = JSON.parse(raw)
          if (Array.isArray(snap.messages)) S.messages = snap.messages
          if ('sessionId' in snap) S.sessionId = snap.sessionId ?? null
          if ('runId' in snap) S.runId = snap.runId ?? null
          if (typeof snap.streamAccum === 'string') S.streamAccum = snap.streamAccum
          if (typeof snap.streaming === 'boolean') S.streaming = snap.streaming
          if (typeof snap.selectedModel === 'string') S.selectedModel = snap.selectedModel
          localStorage.removeItem('hanzo:chat:detached-state')
          renderMessagesFull()
          if (S.textarea) S.textarea.disabled = false
          if (S.sendBtn) S.sendBtn.disabled = !S.textarea?.value.trim()
        } catch { /* nothing */ }
        // Try to close the window in case it's still hanging.
        void invoke('close_chat_window').catch(() => { /* ignored */ })
      }, 600)
    })
    card.appendChild(btn)

    S.msgList.appendChild(card)
  }

  // Disable the input row while detached.
  if (S.textarea) {
    S.textarea.disabled = true
    S.textarea.placeholder = 'Chat is in the detached window…'
  }
  if (S.sendBtn) S.sendBtn.disabled = true
}
