/**
 * Hanzo Inline Edit — Cmd+I (Cmd+Shift+K)
 *
 * Select code → press Cmd+I (or click the floating Inline Edit pill / right-click
 * context menu / Command Palette) → type instruction → agent returns edited code
 * with inline preview. Accept or reject.
 *
 * Avoids bare Cmd+K so VS Code's universal chord prefix (Cmd+K Cmd+S, Cmd+K Cmd+O,
 * Cmd+K Cmd+W, Cmd+K Z) continues to work without collision.
 *
 * Uses Hanzo AI engine_chat_send with the selection as context.
 * Streams via engine-event for real-time feedback.
 */

import { invoke } from '@tauri-apps/api/core'
import { type UnlistenFn } from '@tauri-apps/api/event'
import { listen } from './tauri.ts'
import { getService, ICodeEditorService } from '@codingame/monaco-vscode-api/services'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatResponse {
  run_id: string
  session_id: string
}

interface CapturedSelection {
  text: string
  range: any // Monaco IRange
  editor: any // ICodeEditor
  model: any // ITextModel
  filePath: string
  language: string
}

// ─── State ────────────────────────────────────────────────────────────────────

let _overlay: HTMLElement | null = null
let _selectionPill: HTMLElement | null = null
let _runId: string | null = null
let _unlisten: UnlistenFn | null = null
let _accum = ''
let _captured: CapturedSelection | null = null
const _wiredEditors = new WeakSet<object>()

const INLINE_SYSTEM_PROMPT = `You are Hanzo's inline code editor. The user has selected code and wants you to modify it.

Rules:
- Output ONLY the replacement code. No explanations, no markdown fences, no commentary.
- Preserve the original indentation style.
- If the instruction is unclear, make your best guess — the user can reject and retry.
- Never output anything except the replacement code.`

// ─── Registration ─────────────────────────────────────────────────────────────

export function registerInlineEdit(): void {
  void registerInlineAction()
  void registerSelectionAffordance()

  console.log('[hanzo-inline] inline edit registered as hanzo.inlineEdit action (Cmd+I / Cmd+Shift+K)')
}

async function registerInlineAction(): Promise<void> {
  try {
    const { Action2, registerAction2, MenuId } = (await import(
      '@codingame/monaco-vscode-api/vscode/vs/platform/actions/common/actions'
    )) as any
    if (!registerAction2 || !Action2) return

    registerAction2(
      class extends Action2 {
        static readonly id = 'hanzo.inlineEdit'
        constructor() {
          super({
            id: 'hanzo.inlineEdit',
            title: {
              value: 'Hanzo: Inline Edit Selection',
              original: 'Hanzo: Inline Edit Selection',
            },
            f1: true,
            // Primary: CtrlCmd(2048) | KeyI(39) — VS Code's standard inline assist
            // shortcut, avoiding the Cmd+K chord prefix collision (#2).
            // Secondary: CtrlCmd(2048) | Shift(1024) | KeyK(41) (Cmd+Shift+K).
            keybinding: {
              primary: 2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */,
              secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 41 /* KeyCode.KeyK */],
              weight: 1000,
            },
            menu: MenuId?.EditorContext
              ? [
                  {
                    id: MenuId.EditorContext,
                    group: '1_modification',
                    order: 1.5,
                  },
                ]
              : undefined,
          })
        }
        async run(): Promise<void> {
          await showInlinePrompt()
        }
      },
    )
  } catch (e) {
    console.warn('[hanzo-inline] action registration failed:', e)
  }
}

function hideSelectionPill(): void {
  if (_selectionPill) {
    _selectionPill.style.display = 'none'
  }
}

function ensureSelectionPill(): HTMLElement {
  if (_selectionPill && document.body.contains(_selectionPill)) {
    return _selectionPill
  }
  const pill = document.createElement('button')
  pill.id = 'hanzo-inline-selection-pill'
  pill.type = 'button'
  pill.setAttribute('aria-label', 'Hanzo Inline Edit Selection (Cmd+I)')
  pill.style.cssText = [
    'position:fixed',
    'display:none',
    'align-items:center',
    'gap:6px',
    'padding:3px 8px',
    'border-radius:5px',
    'font-family:var(--hanzo-font-ui, sans-serif)',
    'font-size:11px',
    'font-weight:500',
    'line-height:1.4',
    'color:var(--vscode-editorWidget-foreground, #e5e5e5)',
    'background:var(--vscode-editorWidget-background, #1c1c1e)',
    'border:1px solid var(--vscode-editorWidget-border, rgba(255,255,255,0.14))',
    'box-shadow:0 4px 12px rgba(0,0,0,0.35)',
    'cursor:pointer',
    'z-index:9999',
    'user-select:none',
  ].join(';')
  pill.innerHTML = '<span>✦ Edit</span><span style="opacity:0.55;font-size:10px">⌘I</span>'
  pill.addEventListener('mousedown', (e) => {
    // Keep editor selection intact when clicking the floating action pill.
    e.preventDefault()
    e.stopPropagation()
  })
  pill.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    hideSelectionPill()
    void showInlinePrompt()
  })
  document.body.appendChild(pill)
  _selectionPill = pill
  return pill
}

function updateSelectionPillForEditor(editor: any): void {
  try {
    if (_overlay) {
      hideSelectionPill()
      return
    }
    const model = editor?.getModel?.()
    const selection = editor?.getSelection?.()
    if (!model || !selection || selection.isEmpty?.()) {
      hideSelectionPill()
      return
    }
    const selectedText = model.getValueInRange?.(selection) ?? ''
    if (!selectedText.trim()) {
      hideSelectionPill()
      return
    }
    const domNode: HTMLElement | null = editor.getDomNode?.() ?? null
    if (!domNode) {
      hideSelectionPill()
      return
    }
    const startPos = {
      lineNumber: selection.startLineNumber,
      column: selection.startColumn,
    }
    const scrolled = editor.getScrolledVisiblePosition?.(startPos)
    const rect = domNode.getBoundingClientRect()
    if (!scrolled || rect.width === 0 || rect.height === 0) {
      hideSelectionPill()
      return
    }

    const pill = ensureSelectionPill()
    const top = Math.max(8, rect.top + scrolled.top - 28)
    const left = Math.min(
      window.innerWidth - 110,
      Math.max(rect.left + 16, rect.left + scrolled.left),
    )
    pill.style.top = `${top}px`
    pill.style.left = `${left}px`
    pill.style.display = 'inline-flex'
  } catch {
    hideSelectionPill()
  }
}

async function registerSelectionAffordance(): Promise<void> {
  try {
    const editorService = await getService(ICodeEditorService)

    const wireEditor = (editor: any) => {
      if (!editor || typeof editor !== 'object' || _wiredEditors.has(editor)) return
      _wiredEditors.add(editor)
      editor.onDidChangeCursorSelection?.(() => updateSelectionPillForEditor(editor))
      editor.onDidScrollChange?.(() => updateSelectionPillForEditor(editor))
      editor.onDidBlurEditorText?.(() => hideSelectionPill())
      editor.onDidDispose?.(() => hideSelectionPill())
    }

    const existing: any[] = Array.from((editorService as any).listCodeEditors?.() || [])
    for (const ed of existing) wireEditor(ed)

    ;(editorService as any).onCodeEditorAdd?.((editor: any) => wireEditor(editor))
  } catch (e) {
    console.debug('[hanzo-inline] selection affordance registration deferred:', e)
  }
}

// ─── Capture Current Selection ───────────────────────────────────────────────

async function captureSelection(): Promise<CapturedSelection | null> {
  try {
    const editorService = await getService(ICodeEditorService)
    const editor = (editorService as any).getActiveCodeEditor?.()
    if (!editor) return null

    const model = editor.getModel?.()
    if (!model) return null

    const selection = editor.getSelection?.()
    if (!selection || selection.isEmpty?.()) return null

    const text = model.getValueInRange(selection)
    if (!text.trim()) return null

    const uri = model.uri
    const filePath = uri.fsPath || uri.path
    const language = model.getLanguageId?.() ?? 'unknown'

    return { text, range: selection, editor, model, filePath, language }
  } catch (e) {
    console.warn('[hanzo-inline] captureSelection failed:', e)
    return null
  }
}

// ─── Show Inline Prompt ───────────────────────────────────────────────────────

async function showInlinePrompt(): Promise<void> {
  // Remove any existing overlay or floating selection pill
  dismissOverlay()
  hideSelectionPill()

  // Capture the current editor selection
  _captured = await captureSelection()

  const overlay = document.createElement('div')
  overlay.id = 'hanzo-inline-edit'
  overlay.style.cssText = [
    'position:fixed',
    'top:50%',
    'left:50%',
    'transform:translate(-50%,-50%)',
    'width:500px',
    'background:var(--vscode-editorWidget-background,#252526)',
    'border:1px solid var(--vscode-editorWidget-border,#454545)',
    'border-radius:8px',
    'box-shadow:0 8px 32px rgba(0,0,0,0.4)',
    'z-index:10000',
    'display:flex',
    'flex-direction:column',
    'overflow:hidden',
  ].join(';')

  // Header
  const header = document.createElement('div')
  header.style.cssText = 'padding:8px 12px;font-size:11px;font-weight:600;color:var(--vscode-foreground);border-bottom:1px solid var(--vscode-widget-border,#333);display:flex;justify-content:space-between;align-items:center'

  const selectionInfo = _captured
    ? `<span style="font-size:10px;opacity:0.7;margin-left:8px">${_captured.filePath.split('/').pop()} · ${_captured.text.split('\n').length} lines</span>`
    : '<span style="font-size:10px;opacity:0.5;margin-left:8px">⚠ No selection — select code first</span>'

  header.innerHTML = `<span>Inline Edit (⌘I)${selectionInfo}</span><span style="font-size:10px;opacity:0.5">Esc to dismiss</span>`
  overlay.appendChild(header)

  // Show captured selection preview
  if (_captured) {
    const preview = document.createElement('div')
    preview.style.cssText = 'padding:6px 12px;font-family:var(--hanzo-font-mono);font-size:11px;line-height:1.4;white-space:pre-wrap;max-height:120px;overflow-y:auto;background:var(--vscode-editor-background,#1e1e1e);color:var(--vscode-foreground);opacity:0.7;border-bottom:1px solid var(--vscode-widget-border,#333)'
    // Show first 10 lines of selection
    const lines = _captured.text.split('\n')
    const truncated = lines.length > 10 ? lines.slice(0, 10).join('\n') + `\n... (${lines.length - 10} more lines)` : _captured.text
    preview.textContent = truncated
    overlay.appendChild(preview)
  }

  // Input
  const input = document.createElement('input')
  input.type = 'text'
  input.placeholder = _captured ? 'Describe the change…' : 'Select code first, then press ⌘I'
  input.disabled = !_captured
  input.style.cssText = 'padding:10px 12px;background:var(--vscode-input-background);border:none;outline:none;color:var(--vscode-input-foreground);font-size:13px;font-family:var(--hanzo-font-ui)'
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const instruction = input.value.trim()
      if (instruction && _captured) {
        executeInlineEdit(instruction, overlay)
      }
    }
    if (e.key === 'Escape') {
      dismissOverlay()
    }
  })
  overlay.appendChild(input)

  // Result area (hidden until response comes in)
  const resultArea = document.createElement('div')
  resultArea.id = 'hanzo-inline-result'
  resultArea.style.cssText = 'display:none;max-height:300px;overflow-y:auto;padding:8px 12px;font-family:var(--hanzo-font-mono);font-size:12px;line-height:1.5;white-space:pre-wrap;color:var(--vscode-foreground)'
  overlay.appendChild(resultArea)

  // Action buttons (hidden until response)
  const actions = document.createElement('div')
  actions.id = 'hanzo-inline-actions'
  actions.style.cssText = 'display:none;padding:8px 12px;border-top:1px solid var(--vscode-widget-border,#333);gap:6px;justify-content:flex-end'

  const acceptBtn = document.createElement('button')
  acceptBtn.textContent = 'Accept (Enter)'
  acceptBtn.style.cssText = 'background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:none;border-radius:4px;padding:4px 12px;font-size:12px;cursor:pointer'
  acceptBtn.addEventListener('click', () => applyAndDismiss())

  const rejectBtn = document.createElement('button')
  rejectBtn.textContent = 'Reject (Esc)'
  rejectBtn.style.cssText = 'background:transparent;color:var(--vscode-foreground);border:1px solid var(--vscode-widget-border,#333);border-radius:4px;padding:4px 12px;font-size:12px;cursor:pointer'
  rejectBtn.addEventListener('click', dismissOverlay)

  actions.appendChild(rejectBtn)
  actions.appendChild(acceptBtn)
  overlay.appendChild(actions)

  // Global key handler for accept/reject when result is showing
  const keyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      dismissOverlay()
      document.removeEventListener('keydown', keyHandler)
    }
    if (e.key === 'Enter' && actions.style.display === 'flex') {
      applyAndDismiss()
      document.removeEventListener('keydown', keyHandler)
    }
  }
  document.addEventListener('keydown', keyHandler)

  document.body.appendChild(overlay)
  _overlay = overlay
  input.focus()
}

// ─── Execute ──────────────────────────────────────────────────────────────────

async function executeInlineEdit(instruction: string, overlay: HTMLElement): Promise<void> {
  const resultArea = overlay.querySelector('#hanzo-inline-result') as HTMLElement
  const actions = overlay.querySelector('#hanzo-inline-actions') as HTMLElement
  const input = overlay.querySelector('input') as HTMLInputElement

  if (!resultArea || !actions || !_captured) return

  input.disabled = true
  resultArea.style.display = 'block'
  resultArea.textContent = '⏳ Thinking…'
  _accum = ''

  // Apply one engine event to the overlay.
  const handleEvent = (payload: any) => {
    if (payload.kind === 'delta') {
      _accum += payload.text
      resultArea.textContent = _accum
      resultArea.scrollTop = resultArea.scrollHeight
    } else if (payload.kind === 'complete') {
      resultArea.textContent = payload.text || _accum
      actions.style.display = 'flex'
      _unlisten?.()
      _unlisten = null
      _runId = null
    }
  }

  // engine_chat_send only returns our run_id AFTER the round-trip, but events
  // can arrive before then. Buffer everything until we know our run_id, then
  // replay only OUR events — otherwise a concurrent run (e.g. the main chat
  // streaming) would bleed its deltas into this overlay, or its `complete`
  // would hijack the inline edit with the wrong text.
  const pending: any[] = []
  _unlisten = await listen<any>('engine-event', ({ payload }) => {
    if (_runId === null) { pending.push(payload); return }
    if (payload.run_id !== _runId) return
    handleEvent(payload)
  })

  // Include actual editor selection as context
  const selectedCode = _captured.text

  try {
    const response = await invoke<ChatResponse>('engine_chat_send', {
      request: {
        message: `[File: ${_captured.filePath}] [Language: ${_captured.language}]\n\n[Selected Code]\n${selectedCode}\n\n[Instruction]\n${instruction}`,
        system_prompt: INLINE_SYSTEM_PROMPT,
        tools_enabled: false,
        auto_approve_all: true,
        // Project rules would corrupt the raw rewritten-code output format.
        skip_project_rules: true,
      },
    })
    _runId = response.run_id
    // Replay any events that arrived for our run before we knew the id.
    for (const p of pending) {
      if (p.run_id === _runId) handleEvent(p)
    }
    pending.length = 0
  } catch (err) {
    resultArea.textContent = `Error: ${err}`
    actions.style.display = 'flex'
    _unlisten?.()
    _unlisten = null
  }
}

// ─── Apply Result to Editor ──────────────────────────────────────────────────

async function applyAndDismiss(): Promise<void> {
  if (!_captured || !_overlay) {
    dismissOverlay()
    return
  }

  const resultArea = _overlay.querySelector('#hanzo-inline-result') as HTMLElement
  const newCode = resultArea?.textContent?.trim()
  if (!newCode || newCode === '⏳ Thinking…') {
    dismissOverlay()
    return
  }

  try {
    const { editor, range, model } = _captured

    // Verify the editor and model are still valid
    if (!editor.getModel?.() || editor.getModel() !== model) {
      console.warn('[hanzo-inline] editor/model changed since capture — cannot apply')
      dismissOverlay()
      return
    }

    // Apply the edit as an undoable operation
    editor.executeEdits('hanzo-inline-edit', [{
      range,
      text: newCode,
      forceMoveMarkers: true,
    }])

    // Move cursor to end of inserted text
    const newLines = newCode.split('\n')
    const endLine = range.startLineNumber + newLines.length - 1
    const endCol = newLines.length === 1
      ? range.startColumn + newCode.length
      : newLines[newLines.length - 1].length + 1

    const monaco = await import('monaco-editor')
    editor.setPosition?.(new (monaco as any).Position(endLine, endCol))
    editor.revealPositionInCenter?.(new (monaco as any).Position(endLine, endCol))

    console.log('[hanzo-inline] edit applied successfully')
  } catch (e) {
    console.warn('[hanzo-inline] failed to apply edit:', e)
  }

  dismissOverlay()
}

// ─── Dismiss ──────────────────────────────────────────────────────────────────

function dismissOverlay(): void {
  _overlay?.remove()
  _overlay = null
  _unlisten?.()
  _unlisten = null
  _runId = null
  _accum = ''
  _captured = null

  // Return focus to editor
  getService(ICodeEditorService).then((svc: any) => {
    svc.getActiveCodeEditor?.()?.focus?.()
  }).catch(() => {})
}
