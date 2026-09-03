// The window's half of the local ZAP bus.
//
// The Rust side serves ~/.hanzo/ide.sock and forwards anything that needs the
// editor here as an event, because only the window can show a file to the
// person sitting in front of it.

import { listen } from './tauri.ts'

export async function registerZap(): Promise<void> {
  await listen<string>('zap-open', async (event) => {
    const path = event.payload
    if (!path) return
    const { handleShowTextDocument } = await import('./extension-bridge.ts')
    await handleShowTextDocument({ path })
  })
}
