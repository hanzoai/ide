// The sign-in control in the title row.
//
// Hanzo IAM owns identity. The CLI already holds its OIDC flow and writes the
// credential to ~/.hanzo, so this only starts that flow and reflects its
// result — there is no second login path to keep in step.

import './account.css'
import { invoke } from '@tauri-apps/api/core'
import { tauri } from './tauri.ts'
import { session, signIn, signOut, user } from './iam.ts'

interface Account {
  identity: string | null
  org: string | null
  signed_in: boolean
}

const POLL_MS = 1500
const POLL_LIMIT = 120 // two minutes is longer than any browser round-trip

async function status(): Promise<Account> {
  if (tauri()) {
    try {
      return await invoke<Account>('auth_status')
    } catch {
      // fallback
    }
  }
  // Outside the shell, IAM is the only thing that knows.
  if (!session().authenticated) return { identity: null, org: null, signed_in: false }
  const u = await user().catch(() => null)
  return {
    identity: u?.name || u?.email || 'Signed in',
    org: u?.owner ?? null,
    signed_in: true,
  }
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

/** The control's slot: the workbench titlebar, or whatever a host hands in. */
function slot(into = document.querySelector<HTMLElement>('.monaco-workbench .part.titlebar')): HTMLElement | null {
  if (!into) return null
  let el = into.querySelector<HTMLElement>('.hanzo-account')
  if (el) return el
  el = document.createElement('div')
  el.className = 'hanzo-account'
  into.appendChild(el)
  return el
}

export async function registerAccount(into?: HTMLElement): Promise<void> {
  const el = slot(into)
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
        if (tauri()) {
          try {
            await invoke('auth_logout')
          } catch (e) {
            console.warn('Logout error:', e)
          }
        }
        else await signOut().catch((e) => console.warn('Logout error:', e))
        render(await status())
        btn.disabled = false
      }
    } else {
      btn.textContent = 'Sign In'
      btn.title = 'Sign in through Hanzo IAM'
      btn.onclick = async () => {
        btn.disabled = true
        if (tauri()) {
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
        } else {
          await signIn()
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
