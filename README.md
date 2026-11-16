# XP Playground

A desktop code playground for macOS built with Electron, React, and Monaco Editor — the same engine that powers VS Code. Write JavaScript, TypeScript, JSX, TSX, or Python and see the results instantly, with full IntelliSense and a live component preview for JSX/TSX.

---

## Features

- **Live execution** — code runs automatically as you type (debounced). No run button needed.
- **JSX/TSX live preview** — React components render in a sandboxed iframe with Tailwind v4 support.
- **Five languages** — JavaScript, TypeScript, JSX, TSX, and Python.
- **Monaco Editor** — VS Code's editing engine with full IntelliSense, bracket colorization, font ligatures, and TypeScript/React type definitions built in.
- **Vim mode** — toggle a full Vim keybinding layer (powered by `monaco-vim`) with a single click. Statusbar shows the current mode (`NORMAL`, `INSERT`, `VISUAL`).
- **Multiple tabs** — each tab keeps its own code, output, and language independently.
- **Resizable panels** — drag the divider between editor and output. Four layout presets: editor left/right, top/bottom.
- **Seven themes** — Dark, Light, Monokai, Dracula, One Dark, Nord, Solarized Dark.
- **File system** — open and save files via native OS dialogs. Supports `.js`, `.ts`, `.jsx`, `.tsx`, `.py`.
- **Plugin system** — extend Monaco with custom completions, hover docs, snippets, or new languages. Drop a `.js` file in `~/Library/Application Support/XP Playground/plugins/` and it loads on startup.
- **Tailwind autocomplete** — class suggestions fire inside `className`, `cn()`, `clsx()`, and `cva()` attributes.
- **Line tracking** — every `console.log` entry shows its source line number. Hover an output entry to highlight the corresponding line in the editor.
- **Native macOS window** — hidden-inset titlebar with native traffic lights, an opaque window, and a native application menu with `⌘` shortcuts.

---

## Installation

### Build and install locally

Requires macOS on Apple Silicon, Node.js 20+, and optionally Python 3.

```bash
git clone https://github.com/Alter25/xp-playground.git
cd xp-playground
npm ci
npm run electron:build
bash install-macos.sh
```

`electron:build` creates an unsigned `arm64` DMG and ZIP in `release/`. `install-macos.sh` copies `XP Playground.app` to `~/Applications`.

Because the build is unsigned, macOS Gatekeeper may require right-click → **Open** the first time. You can also remove the quarantine attribute manually:

```bash
xattr -dr com.apple.quarantine "$HOME/Applications/XP Playground.app"
```

### Development mode

```bash
npm install
npm run electron:dev
```

Vite starts a dev server and Electron loads from it with hot reload.

---

## How it works

### JavaScript and TypeScript

Code runs inside a `node:vm` sandbox in the Electron main process. A custom `console` object captures every `log`, `warn`, `error`, and `table` call along with its source line number (extracted from the stack trace). TypeScript is transpiled on the fly with `esbuild` before entering the sandbox. Execution has a 10-second timeout.

```
Editor (renderer) → IPC → node:vm sandbox (main) → serialized output → IPC → Output panel (renderer)
```

### Python

Python code is written to a temporary file and executed as a child process. The app resolves Python from `/opt/homebrew/bin/python3`, `/usr/local/bin/python3`, then `/usr/bin/python3`; set `XP_PYTHON` to override the executable. A small runner script injected at startup replaces the built-in `print` with a version that records each call's line number and returns all output as JSON over stdout.

### JSX / TSX live preview

Transformation and rendering involve three stages:

1. **Transform** — `esbuild` (in the main process) converts JSX/TSX to ESM with `jsx: 'automatic'`, externalizing React.
2. **Bundle** — React 19 ships no UMD builds, so at startup the app bundles React, ReactDOM, and `react/jsx-runtime` as IIFE globals using `esbuild`.
3. **Iframe** — the transformed component is loaded into a sandboxed `<iframe>` via a Blob URL and `import()`. An import map resolves `"react"` and `"react/jsx-runtime"` to data URIs that re-export from the IIFE globals. `@tailwindcss/browser` is injected into the iframe and uses `MutationObserver` to generate Tailwind styles in real time.

```
Editor → esbuild (main) → ESM blob → iframe import() → ReactDOM.createRoot → live preview
```

### Vim mode

Clicking the **VIM** button in the titlebar calls `initVimMode(editor, statusbarNode)` from `monaco-vim`. The statusbar below the editor shows the current mode. The cursor turns cyan (`#00ffff`) to match a standard Neovim cursor style. The preference persists in `localStorage`.

---

## Stack

| Layer | Technology |
|---|---|
| Shell | Electron 35 |
| UI | React 19 |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| JS/TS transform | esbuild |
| JS sandbox | `node:vm` |
| Python runner | `child_process.spawn` |
| Preview styles | `@tailwindcss/browser` v4 |
| Vim bindings | `monaco-vim` |
| Build tool | Vite 6 |
| Packaging | electron-builder (DMG + ZIP, arm64) |

---

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `⌘S` | Save file |
| `⌘⇧S` | Save as… |
| `⌘N` | New file |
| `⌘T` | New tab |
| `⌘W` | Close tab |
| `⌘⇧W` | Close window |
| `⌘O` | Open file |
| `⌘↩` | Run code |

---

## Themes

| Theme | Base |
|---|---|
| Dark | VS Code Dark |
| Light | VS Code Light |
| Monokai | Custom |
| Dracula | Custom |
| One Dark | Custom |
| Nord | Custom |
| Solarized Dark | Custom |

---

## Plugin system

Drop any `.js` file in `~/Library/Application Support/XP Playground/plugins/` and it will be loaded when the editor mounts. Open the folder from inside the app via **Archivo → Carpeta de plugins…**

A plugin exports a default object with an `activate` function that receives the Monaco namespace, the editor instance, and a disposal callback:

```js
// ~/Library/Application Support/XP Playground/plugins/my-plugin.js

export default {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'What this does',

  activate({ monaco, editor, onDispose }) {
    const disposable = monaco.languages.registerCompletionItemProvider('javascript', {
      provideCompletionItems(model, position) {
        // return suggestions
      },
    })
    onDispose(() => disposable.dispose())
  },
}
```

Plugins can register completion providers, hover providers, code actions, Monarch tokenizers, custom themes, and editor commands. See [PLUGINS.md](PLUGINS.md) for the full API reference and four worked examples.

---

## Project structure

```
xp/
├── electron/
│   ├── main.js          # Main process: window, IPC handlers, Python resolver, esbuild transforms
│   ├── menu.js          # Native macOS application menu and shortcuts
│   └── preload.js       # Context bridge exposing window.xp to the renderer
├── src/
│   ├── components/
│   │   ├── Editor.jsx   # Monaco wrapper with Vim mode, Tailwind completions, plugin loader
│   │   ├── Output.jsx   # Console output panel with line highlighting
│   │   ├── PreviewPane.jsx  # Sandboxed iframe renderer for JSX/TSX
│   │   ├── TabBar.jsx   # Multi-tab bar
│   │   ├── TitleBar.jsx # Hidden-inset titlebar (file menu, lang, theme, layout, vim toggle)
│   │   └── ThemeSelector.jsx
│   ├── lib/
│   │   ├── pluginLoader.js   # Loads plugins from Application Support at editor mount
│   │   └── tailwindClasses.js  # Full Tailwind class list for completions
│   ├── assets/
│   │   ├── react-bundle.js    # Pre-bundled React IIFE for iframe injection
│   │   └── tailwind-bundle.js # Pre-bundled @tailwindcss/browser for iframe injection
│   ├── App.jsx          # Root component: tabs, state, layout, keybindings
│   └── themes.js        # Theme definitions (CSS vars + Monaco token rules)
├── scripts/
│   └── gen-preview-bundles.mjs  # Build step: bundles React and Tailwind for the iframe
├── install-macos.sh     # Copies the built .app to ~/Applications
└── vite.config.js
```

---

## Building

```bash
npm run electron:build
```

Runs in sequence:
1. `gen-preview-bundles.mjs` — bundles React and Tailwind into `src/assets/` for offline iframe use
2. `vite build` — compiles the renderer and Electron entry points
3. `electron-builder` — packages an unsigned `arm64` DMG and ZIP

Outputs:

```
release/XP Playground-1.0.0-arm64.dmg
release/XP Playground-1.0.0-arm64.zip
release/mac-arm64/XP Playground.app
```

---

## License

MIT
