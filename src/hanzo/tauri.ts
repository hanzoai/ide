/**
 * The Tauri shell, at the one place this codebase meets it.
 *
 * Every Tauri API reaches for `window.__TAURI_INTERNALS__`, and in a plain
 * browser (ide.hanzo.ai) that is undefined: `listen()` throws before it can
 * even return a promise, which took the whole chat down at bootstrap and left
 * a dozen other features — PTY, fs watch, LSP, DAP, the extension host, the
 * zap bus — one page load away from the same crash.
 *
 * Engine events, sandbox progress, the OS menu: all of it exists only inside
 * the shell, so outside it a subscription has nothing to subscribe to and a
 * broadcast has nobody to reach. That is not an error; it is the answer. These
 * two return it, and every module imports them from HERE rather than from
 * `@tauri-apps/api/event`, so no caller has to ask where it is running.
 *
 * `invoke` is deliberately not wrapped: a command that cannot run should throw
 * so its caller can take the other path — `send.ts` falls back to the cloud on
 * exactly that throw. `tauri()` is for those forks in behaviour.
 */
import {
  listen as shellListen,
  emit as shellEmit,
  type EventCallback,
  type UnlistenFn,
} from '@tauri-apps/api/event'

export const tauri = (): boolean => Boolean((window as any).__TAURI_INTERNALS__?.invoke)

export const listen = <T>(event: string, handler: EventCallback<T>): Promise<UnlistenFn> =>
  tauri() ? shellListen<T>(event, handler) : Promise.resolve(() => {})

export const emit = (event: string, payload?: unknown): Promise<void> =>
  tauri() ? shellEmit(event, payload) : Promise.resolve()
