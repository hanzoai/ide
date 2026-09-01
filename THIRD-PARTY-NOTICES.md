# Third-party notices

Hanzo is distributed under the Apache License 2.0 (see `LICENSE`). It also
redistributes the third-party software listed here, each under its own licence.

## Visual Studio Code

Hanzo runs the VS Code workbench. It is not a fork of VS Code: the workbench
arrives as a dependency, `@codingame/monaco-vscode-api`, which repackages the
Code – OSS sources. Those sources ship inside the application bundle.

    Copyright (c) Microsoft Corporation. All rights reserved.

    Licensed under the MIT License. Permission is hereby granted, free of
    charge, to any person obtaining a copy of this software and associated
    documentation files (the "Software"), to deal in the Software without
    restriction, including without limitation the rights to use, copy, modify,
    merge, publish, distribute, sublicense, and/or sell copies of the Software,
    and to permit persons to whom the Software is furnished to do so, subject to
    the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
    FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
    DEALINGS IN THE SOFTWARE.

The Code – OSS sources are at https://github.com/microsoft/vscode. Note that
the MIT licence covers those sources, not the Microsoft-branded Visual Studio
Code product, and not the Visual Studio Marketplace. Hanzo installs extensions
from Open VSX.

## jschardet

jschardet is licensed under the LGPL 2.1 or later and is redistributed in the
application bundle. Its source is at https://github.com/aadsm/jschardet, and a
user may replace the bundled copy with a modified version: the bundle is a
plain JavaScript asset and the file can be substituted in place.

## Licence summary

| Licence | Packages |
|---|---:|
| MIT | 203 |
| Apache-2.0 | 10 |
| MIT OR Apache-2.0 | 6 |
| ISC | 4 |
| Apache-2.0 OR MIT | 3 |
| BSD-3-Clause | 3 |
| MPL-2.0 | 2 |
| SIL OPEN FONT LICENSE | 1 |
| LGPL-3.0-or-later | 1 |
| CC-BY-4.0 | 1 |
| (MPL-2.0 OR Apache-2.0) | 1 |
| LGPL-2.1+ | 1 |
| 0BSD | 1 |

## Packages

| Package | Version | Licence |
|---|---|---|
| `@codingame/monaco-vscode-accessibility-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-all-default-extensions` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-api` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-authentication-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-base-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-bat-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-bulk-edit-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-chat-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-clojure-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-coffeescript-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-comments-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-configuration-editing-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-configuration-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-cpp-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-csharp-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-css-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-css-language-features-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-dart-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-debug-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-dialogs-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-diff-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-docker-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-dotenv-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-edit-sessions-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-editor-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-emmet-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-emmet-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-environment-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-explorer-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-extension-editing-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-extension-gallery-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-extensions-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-files-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-fsharp-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-git-base-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-github-authentication-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-go-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-groovy-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-handlebars-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-hlsl-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-host-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-html-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-html-language-features-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-ini-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-interactive-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-ipynb-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-java-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-javascript-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-json-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-json-language-features-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-julia-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-katex-common` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-keybindings-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-language-detection-worker-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-languages-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-latex-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-layout-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-less-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-lifecycle-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-localization-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-log-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-log-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-lua-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-make-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-markdown-basics-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-markdown-language-features-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-markdown-math-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-markers-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-media-preview-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-merge-conflict-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-mermaid-chat-features-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-model-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-multi-diff-editor-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-notebook-renderers-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-notebook-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-notifications-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-npm-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-objective-c-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-outline-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-output-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-performance-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-perl-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-php-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-powershell-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-preferences-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-prompt-basics-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-pug-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-python-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-quickaccess-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-r-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-razor-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-references-view-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-relauncher-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-remote-agent-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-restructuredtext-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-ruby-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-rust-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-scm-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-scss-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-search-result-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-search-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-secret-storage-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-shaderlab-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-shellscript-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-simple-browser-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-snippets-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-speech-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-sql-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-storage-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-swift-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-task-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-telemetry-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-terminal-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-testing-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-textmate-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-theme-2026-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-theme-abyss-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-theme-defaults-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-theme-kimbie-dark-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-theme-monokai-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-theme-monokai-dimmed-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-theme-quietlight-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-theme-red-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-theme-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-theme-seti-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-theme-solarized-dark-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-theme-solarized-light-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-theme-tomorrow-night-blue-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-timeline-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-typescript-basics-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-typescript-language-features-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-update-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-user-data-profile-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-user-data-sync-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-vb-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-view-banner-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-view-common-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-view-status-bar-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-view-title-bar-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-views-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-welcome-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-workbench-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-working-copy-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-workspace-trust-service-override` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-xml-default-extension` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-xterm-addons-common` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-xterm-common` | 28.0.1 | MIT |
| `@codingame/monaco-vscode-yaml-default-extension` | 28.0.1 | MIT |
| `@codingame/vscode-languagedetection` | 1.0.23 | MIT |
| `@dimforge/rapier3d-compat` | 0.12.0 | Apache-2.0 |
| `@hanzo/font` | 1.9.3 | SIL OPEN FONT LICENSE |
| `@img/colour` | 1.1.0 | MIT |
| `@img/sharp-darwin-arm64` | 0.35.4 | Apache-2.0 |
| `@img/sharp-libvips-darwin-arm64` | 1.3.3 | LGPL-3.0-or-later |
| `@microsoft/1ds-core-js` | 3.2.18 | MIT |
| `@microsoft/1ds-post-js` | 3.2.18 | MIT |
| `@microsoft/applicationinsights-core-js` | 2.8.18 | MIT |
| `@microsoft/applicationinsights-shims` | 2.0.2 | MIT |
| `@microsoft/dynamicproto-js` | 1.1.11 | MIT |
| `@next/env` | 16.3.4 | MIT |
| `@next/swc-darwin-arm64` | 16.3.4 | MIT |
| `@oxc-project/runtime` | 0.115.0 | MIT |
| `@oxc-project/types` | 0.115.0 | MIT |
| `@playwright/test` | 1.61.1 | Apache-2.0 |
| `@rolldown/binding-darwin-arm64` | 1.0.0-rc.9 | MIT |
| `@rolldown/pluginutils` | 1.0.0-rc.9 | MIT |
| `@swc/helpers` | 0.5.23 | Apache-2.0 |
| `@tauri-apps/api` | 2.10.1 | Apache-2.0 OR MIT |
| `@tauri-apps/cli` | 2.10.1 | Apache-2.0 OR MIT |
| `@tauri-apps/cli-darwin-arm64` | 2.10.1 | Apache-2.0 OR MIT |
| `@tauri-apps/plugin-dialog` | 2.6.0 | MIT OR Apache-2.0 |
| `@tauri-apps/plugin-fs` | 2.4.5 | MIT OR Apache-2.0 |
| `@tauri-apps/plugin-process` | 2.3.1 | MIT OR Apache-2.0 |
| `@tauri-apps/plugin-shell` | 2.3.5 | MIT OR Apache-2.0 |
| `@tauri-apps/plugin-sql` | 2.3.2 | MIT OR Apache-2.0 |
| `@tauri-apps/plugin-updater` | 2.10.0 | MIT OR Apache-2.0 |
| `@tweenjs/tween.js` | 23.1.3 | MIT |
| `@types/node` | 26.4.0 | MIT |
| `@types/pngjs` | 6.0.5 | MIT |
| `@types/stats.js` | 0.17.4 | MIT |
| `@types/three` | 0.183.1 | MIT |
| `@types/trusted-types` | 2.0.7 | MIT |
| `@types/webxr` | 0.5.24 | MIT |
| `@vscode/iconv-lite-umd` | 0.7.1 | MIT |
| `@webgpu/types` | 0.1.69 | BSD-3-Clause |
| `@xterm/addon-clipboard` | 0.3.0-beta.168 | MIT |
| `@xterm/addon-image` | 0.10.0-beta.168 | MIT |
| `@xterm/addon-ligatures` | 0.11.0-beta.168 | MIT |
| `@xterm/addon-progress` | 0.3.0-beta.168 | MIT |
| `@xterm/addon-search` | 0.17.0-beta.168 | MIT |
| `@xterm/addon-serialize` | 0.15.0-beta.168 | MIT |
| `@xterm/addon-unicode11` | 0.10.0-beta.168 | MIT |
| `@xterm/addon-webgl` | 0.20.0-beta.167 | MIT |
| `@xterm/xterm` | 6.1.0-beta.195 | MIT |
| `animejs` | 4.3.6 | MIT |
| `baseline-browser-mapping` | 2.11.20 | Apache-2.0 |
| `caniuse-lite` | 1.0.30001810 | CC-BY-4.0 |
| `client-only` | 0.0.1 | MIT |
| `commander` | 8.3.0 | MIT |
| `detect-libc` | 2.1.2 | Apache-2.0 |
| `dompurify` | 3.3.2 | (MPL-2.0 OR Apache-2.0) |
| `fdir` | 6.5.0 | MIT |
| `fflate` | 0.8.2 | MIT |
| `fsevents` | 2.3.3 | MIT |
| `js-base64` | 3.7.8 | BSD-3-Clause |
| `jschardet` | 3.1.4 | LGPL-2.1+ |
| `katex` | 0.16.27 | MIT |
| `lightningcss` | 1.32.0 | MPL-2.0 |
| `lightningcss-darwin-arm64` | 1.32.0 | MPL-2.0 |
| `lru-cache` | 6.0.0 | ISC |
| `marked` | 15.0.12 | MIT |
| `meshoptimizer` | 1.0.1 | MIT |
| `nanoid` | 3.3.18 | MIT |
| `next` | 16.3.4 | MIT |
| `opentype.js` | 0.8.0 | MIT |
| `picocolors` | 1.1.1 | ISC |
| `picomatch` | 4.0.3 | MIT |
| `playwright` | 1.61.1 | Apache-2.0 |
| `playwright-core` | 1.61.1 | Apache-2.0 |
| `pngjs` | 7.0.0 | MIT |
| `postcss` | 8.5.23 | MIT |
| `react` | 19.2.8 | MIT |
| `react-dom` | 19.2.8 | MIT |
| `rolldown` | 1.0.0-rc.9 | MIT |
| `scheduler` | 0.27.0 | MIT |
| `semver` | 7.8.5 | ISC |
| `sharp` | 0.35.4 | Apache-2.0 |
| `source-map-js` | 1.2.1 | BSD-3-Clause |
| `styled-jsx` | 5.1.6 | MIT |
| `three` | 0.183.2 | MIT |
| `tiny-inflate` | 1.0.3 | MIT |
| `tinyglobby` | 0.2.15 | MIT |
| `tslib` | 2.8.1 | 0BSD |
| `typescript` | 5.9.3 | Apache-2.0 |
| `undici-types` | 8.3.0 | MIT |
| `vite` | 8.0.0 | MIT |
| `yallist` | 4.0.0 | ISC |
