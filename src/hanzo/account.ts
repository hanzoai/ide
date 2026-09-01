// The sign-in control in the title row.
//
// Hanzo IAM owns identity. The CLI already holds its OIDC flow and writes the
// credential to ~/.hanzo, so this only starts that flow and reflects its
// result — there is no second login path to keep in step.

import { invoke } from '@tauri-apps/api/core'

interface Account {
  identity: string | null
  org: string | null
  signed_in: boolean
}

const POLL_MS = 1500
const POLL_LIMIT = 120 // two minutes is longer than any browser round-trip

async function status(): Promise<Account> {
  return await invoke<Account>('auth_status')
}

/** Wait for the browser half of the sign-in to land, then stop. */
async function awaitSignIn(render: (a: Account) => void): Promise<void> {
  for (let i = 0; i < POLL_LIMIT; i++) {
    await new Promise(r => setTimeout(r, POLL_MS))
    try {
      const a = await status()
      if (a.signed_in) {
        render(a)
        return
      }
    } catch {
      // The CLI is mid-write; the next tick will see a settled file.
    }
  }
  render({ identity: null, org: null, signed_in: false })
}

function slot(): HTMLElement | null {
  const bar = document.querySelector<HTMLElement>('.monaco-workbench .part.titlebar')
  if (!bar) return null
  let el = bar.querySelector<HTMLElement>('.hanzo-account')
  if (el) return el
  el = document.createElement('div')
  el.className = 'hanzo-account'
  bar.appendChild(el)
  return el
}

export async function registerAccount(): Promise<void> {
  const el = slot()
  if (!el) return

  const render = (a: Account) => {
    el.textContent = ''
    const btn = document.createElement('button')
    btn.className = 'hanzo-account-btn'

    if (a.signed_in) {
      btn.textContent = a.identity ?? 'Signed in'
      btn.title = a.org ? `Signed in to ${a.org} — click to sign out` : 'Click to sign out'
      btn.onclick = async () => {
        btn.disabled = true
        try {
          await invoke('auth_logout')
          render(await status())
        } catch (e) {
          btn.textContent = String(e)
        } finally {
          btn.disabled = false
        }
      }
    } else {
      btn.textContent = 'Sign In'
      btn.title = 'Sign in through Hanzo IAM'
      btn.onclick = async () => {
        btn.disabled = true
        btn.textContent = 'Continue in browser…'
        try {
          await invoke('auth_login')
          await awaitSignIn(render)
        } catch (e) {
          btn.textContent = 'Sign In'
          btn.title = String(e)
        } finally {
          btn.disabled = false
        }
      }
    }
    el.appendChild(btn)
  }

  try {
    render(await status())
  } catch {
    render({ identity: null, org: null, signed_in: false })
  }
}
