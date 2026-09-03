/**
 * Hanzo IAM, for the document OUTSIDE the shell (ide.hanzo.ai).
 *
 * Inside Tauri the Rust side runs the CLI's own OIDC flow and holds the
 * credential in ~/.hanzo; nothing here is used there. In a plain browser this
 * is the whole of sign-in: the SDK's PKCE redirect to hanzo.id and the exchange
 * it completes on the way back. IAM owns identity and tokens; this page keeps
 * no second copy and reads no key of its own.
 *
 * It returns to `/`, not to a callback route: the site is static files on
 * GitHub Pages, so a path with no file behind it is a 404, and the root is the
 * one address that always answers. The exchange finishes there on load.
 */
import { configureIam, getIam, getSession, getUser, handleCallback, logout, startLogin } from '@hanzo/iam'

configureIam({
  issuer: import.meta.env.VITE_HANZO_IAM_URL ?? 'https://hanzo.id',
  clientId: 'hanzo-ide',
  redirect: `${location.origin}/`,
  // offline_access asks for a refresh token, so a long session renews itself
  // instead of lapsing into a sign-in prompt mid-work.
  scope: 'openid profile email offline_access',
})

export { startLogin as signIn, getSession as session, getUser as user, logout as signOut }

/** A live access token, renewed if it has expired; null when signed out. */
export const token = (): Promise<string | null> => getIam().getValidAccessToken()

/**
 * Finish a sign-in this page was returned to. A no-op on every other load.
 *
 * The code and state come off the URL afterwards: a code is single-use, so a
 * reload of the address it arrived on would otherwise re-run a spent exchange
 * and report a failure for a sign-in that already succeeded.
 */
export async function finish(): Promise<void> {
  if (!new URL(location.href).searchParams.has('code')) return
  await handleCallback()
  history.replaceState(null, '', location.pathname)
}
