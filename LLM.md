# Hanzo IDE

An AI-native IDE: a Rust/Tauri shell (`src-tauri/`, `crates/`) around a VS Code
workbench (`@codingame/monaco-vscode-api`, TypeScript under `src/`), with the
same web build published as static files to ide.hanzo.ai.

## ide.hanzo.ai is a site on the Sites plane

`.hanzo/workflows/deploy.yml` builds `dist/` and publishes it with slug `ide`
through `hanzoai/ci`'s `site@v1` action (deploy key read from KMS; the plane
hands back a prefix-scoped upload grant). The host is `ide-static` +
`ide-hanzo-ai` in `hanzoai/universe` `charts/app/values/hanzo/static-sites.yaml`,
reading `s3://hanzo-sites/hanzo/ide`. That workflow runs on the FORGE
(git.hanzo.ai, runners `hanzo-build-linux-amd64`), against a forge repo that
pull-mirrors this GitHub repo — so the lane needs `hanzoai/ide` mirrored there
with Actions on and the org's `KMS_CLIENT_ID`/`KMS_CLIENT_SECRET` secrets.
There was a GitHub Pages workflow once; Pages was never enabled and it failed on
every run. Do not bring it back — it is the third pipeline hanzo.ai's notes
describe retiring.

## One chat, two hosts

`src/hanzo/chat/index.ts` exports `build(container)`: the whole chat — topbar,
messages, composer — built into any element, returning the topbar's `actions`
slot and a `dispose`. A host adds only its window control there.
`src/hanzo/chat/view.ts` is the workbench host: it registers the auxiliary-bar
view and appends Detach; `workbench.ts` names the view in `defaultLayout.views`
so the chat is open the first time the workbench lays itself out.
`chat.html` → `src/chat-main.ts` is the window host: it hydrates the handoff
snapshot, calls `build`, and appends Reattach. Neither host draws a control of
its own — the `.hanzo-chat-container` class carries every `--hanzo-chat-*`
token and the typeface, so the stylesheet is the only description of the chat.

`index.html` → `src/main.ts` and `chat.html` are both Vite inputs
(`vite.config.ts`) and both import `src/styles/tokens.css`, which is why the
Zen `@font-face` import lives THERE and not in `global.css`. The window host
also imports monaco's `codicon.css` — the workbench injects it itself.

## The shell has one boundary: `src/hanzo/tauri.ts`

Every Tauri API reaches for `window.__TAURI_INTERNALS__`, and in a plain
browser that is undefined — `listen()` throws before it returns a promise. So
`listen` and `emit` are imported from `src/hanzo/tauri.ts`, never from
`@tauri-apps/api/event`: inside the shell they subscribe, outside it they are
no-ops, and no module asks where it is running. `invoke` is NOT wrapped — a
command that cannot run should throw so its caller takes the other path
(`send.ts` falls back to the cloud on that throw). `tauri()` is the predicate
for those forks in behaviour, and it is the only spelling of the question.

## Identity is IAM's

Inside the shell the Rust side runs the CLI's OIDC flow (`auth_login`,
`auth_status`, `~/.hanzo`). Outside it, `src/hanzo/iam.ts` configures
`@hanzo/iam` once — client `hanzo-ide`, PKCE against hanzo.id, returning to
`/` because a static site has no file at `/auth/callback` — and each entry
calls `finish()` on load to complete a returning sign-in. The bearer for the
cloud chat is `token()` from that module. There is no other token store and no
other login path; the previous hand-rolled redirect wrote nothing on return.

The client is declared in `hanzoai/universe` `infra/k8s/iam/provision.yaml`
(`app: ide`, type `spa`, hosts `ide.hanzo.ai`, callback `/`, plus the portless
`http://127.0.0.1/` that IAM wildcards for any local port). It exists on a live
IAM only after `iam provision` has been run against that document.

## Gates

`npx tsc --noEmit` (0 errors), `npm run build` (ext-host + tsc + vite),
`npx playwright test` (`e2e/chrome.spec.ts`: no seams, neutral ramp, Zen
typeface, no yellow; `e2e/chat.spec.ts`: both chat hosts build, the window
host streams from the stubbed cloud — against `vite --port 5180`). There is no eslint.

## Fonts

`--hanzo-font-ui` and `--hanzo-font-mono` in `tokens.css` are the only
spellings of the typeface. A commit once inlined the mono stack in their place
and its replace ate the closing quotes at six sites; HEAD did not compile.
Reference the variable.

## Release and Distribution

Hanzo IDE builds native installer bundles and updater archives across all tier-1 desktop targets:
- **macOS Universal**: `universal-apple-darwin` producing `.dmg` (Apple Silicon + Intel universal binary) and `.app.tar.gz`
- **Linux amd64**: `x86_64-unknown-linux-gnu` producing `.AppImage` and `.deb` (signed with Cosign keyless OIDC)
- **Linux arm64**: `aarch64-unknown-linux-gnu` producing `.AppImage` and `.deb` (signed with Cosign keyless OIDC)
- **Windows x64**: `x86_64-pc-windows-msvc` producing NSIS `*-setup.exe` and `.msi` (signed with GCP KMS EV code signing)

Workflows:
- `.github/workflows/desktop-release.yml`: Runs on GitHub Actions on version tags (`v*`) or manual `workflow_dispatch`.
- `.hanzo/workflows/desktop-release.yml`: Runs on the Forge (`git.hanzo.ai`).

Distribution Planes:
- Canonical CDN: Cloudflare R2 bucket `hanzo-download` staged under `hanzo-ide/`:
  - Versioned: `https://download.hanzo.ai/hanzo-ide/binaries/production/${arch}/${version}.${run_number}/`
  - Stable aliases: `https://download.hanzo.ai/hanzo-ide/latest/` (`hanzo-ide-macos.dmg`, `hanzo-ide-linux.AppImage`, `hanzo-ide-windows.exe`, etc.)
  - Auto-updater manifest: `https://download.hanzo.ai/hanzo-ide/binaries/production/updates.json`
- Canonical Release: GitHub Releases (`https://github.com/hanzoai/ide/releases/tag/v*`) with all platform installers attached.
- Web IDE plane: `ide.hanzo.ai` deployed via `.hanzo/workflows/deploy.yml` from `dist/` to `s3://hanzo-sites/hanzo/ide`.

Local Bundle Commands:
- `npm run build` (builds `node-extension-host` + `tsc` + `vite`)
- `npm run tauri:build` or `npx tauri build --ignore-version-mismatches` (builds release binary and platform bundle)

