// The identity control in the title row: which ORG you are in, and who you are.
//
// Hanzo IAM owns identity. The CLI already holds its OIDC flow and writes the
// credential to ~/.hanzo, so this only starts that flow and reflects its
// result — there is no second login path to keep in step.
//
// It reads the way hanzo.ai reads: the org leads, because that is the thing a
// person switches, and the account sits under it. The org was a TOOLTIP here —
// the one fact that decides which tenant's work you are looking at, written
// where nothing but a hover could find it.

import './account.css'
import { invoke } from '@tauri-apps/api/core'
import { tauri } from './tauri.ts'
import { orgs, session, signIn, signOut, user } from './iam.ts'

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

/**
 * The control's slot: the workbench titlebar, or whatever a host hands in.
 *
 * PREPENDED in the titlebar, so identity sits top-LEFT where the product name
 * would be — the position it holds on hanzo.ai. A host that hands in its own
 * element decides its own order, so the chat window is unaffected.
 */
function slot(into?: HTMLElement): HTMLElement | null {
  const host = into ?? document.querySelector<HTMLElement>('.monaco-workbench .part.titlebar')
  if (!host) return null
  let el = host.querySelector<HTMLElement>('.hanzo-account')
  if (el) return el
  el = document.createElement('div')
  el.className = 'hanzo-account'
  if (into) host.appendChild(el)
  else host.prepend(el)
  return el
}

/** The org a person last chose here; empty until they choose one. */
const ORG_KEY = 'hanzo.console.org'
const chosenOrg = (): string => {
  try {
    return localStorage.getItem(ORG_KEY) ?? ''
  } catch {
    return ''
  }
}
const chooseOrg = (name: string): void => {
  try {
    localStorage.setItem(ORG_KEY, name)
  } catch {
    /* private mode */
  }
}

export async function registerAccount(into?: HTMLElement): Promise<void> {
  const el = slot(into)
  if (!el) return

  const render = (a: Account) => {
    el.textContent = ''

    if (!a.signed_in) {
      const btn = document.createElement('button')
      btn.className = 'hanzo-account-btn'
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
      el.appendChild(btn)
      return
    }

    // The org leads and the account sits under it — the order hanzo.ai uses,
    // because the org is the thing a person switches and the account is the
    // thing they rarely touch. The org used to live in this control's TOOLTIP:
    // the one fact that decides whose work is on screen, written where only a
    // hover could find it.
    const org = document.createElement('span')
    org.className = 'hanzo-account-org'
    org.textContent = a.org ?? '—'

    const who = document.createElement('button')
    who.className = 'hanzo-account-btn hanzo-account-who'
    who.textContent = a.identity ?? 'Signed in'
    who.title = 'Sign out'
    who.onclick = async () => {
      who.disabled = true
      if (tauri()) {
        try {
          await invoke('auth_logout')
        } catch (e) {
          console.warn('Logout error:', e)
        }
      } else {
        await signOut().catch((e) => console.warn('Logout error:', e))
      }
      render(await status())
      who.disabled = false
    }

    el.append(org, who)

    // Filled after the row is drawn: the org list is a network read, and the
    // titlebar must not wait on it to say who you are. A switcher appears only
    // where there is a second org to choose — one offering a single choice is a
    // control that cannot do anything.
    void orgs()
      .then((list) => {
        if (list.length < 2) return
        const pick = document.createElement('select')
        pick.className = 'hanzo-account-switch'
        pick.title = 'Switch organization'
        for (const name of list) {
          const o = document.createElement('option')
          o.value = name
          o.textContent = name
          o.selected = name === (chosenOrg() || a.org || '')
          pick.appendChild(o)
        }
        pick.onchange = () => {
          chooseOrg(pick.value)
          window.dispatchEvent(new CustomEvent('hanzo:org', { detail: pick.value }))
        }
        org.replaceWith(pick)
      })
      .catch(() => {})
  }


  try {
    render(await status())
  } catch {
    render({ identity: null, org: null, signed_in: false })
  }
}
