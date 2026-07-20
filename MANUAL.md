---
title: XP Playground — Manual de Construcción
tags:
  - electron
  - react
  - monaco
  - esbuild
  - tutorial
created: 2026-05-11
---

# XP Playground · Manual paso a paso

> [!info] ¿Qué vas a construir?
> Un playground de código de escritorio para Linux, similar a RunJS. El usuario escribe código (JS, TS, JSX, TSX, Python) y ve los resultados en tiempo real. Los componentes JSX/TSX se visualizan en un panel preview con Tailwind v4.

---

## Índice

1. [[#Capítulo 1 · Configuración del proyecto]]
2. [[#Capítulo 2 · Ventana Electron sin bordes]]
3. [[#Capítulo 3 · TitleBar y controles de ventana]]
4. [[#Capítulo 4 · Editor Monaco]]
5. [[#Capítulo 5 · Ejecución de código JavaScript y TypeScript]]
6. [[#Capítulo 6 · Ejecución de Python]]
7. [[#Capítulo 7 · Panel Output]]
8. [[#Capítulo 8 · Sistema de pestañas]]
9. [[#Capítulo 9 · Preview de JSX y TSX]]
10. [[#Capítulo 10 · Tailwind v4 en el preview]]
11. [[#Capítulo 11 · Autocompletado con tipos de React]]
12. [[#Capítulo 12 · Paneles redimensionables]]
13. [[#Capítulo 13 · Selector de layout]]
14. [[#Capítulo 14 · Apertura y guardado de archivos]]
15. [[#Capítulo 15 · Sistema de temas]]

---

## Capítulo 1 · Configuración del proyecto

### Tecnologías involucradas

| Tecnología | Rol |
|---|---|
| **Electron** | Shell de escritorio nativo (ventana, IPC, acceso al SO) |
| **Vite** | Bundler del frontend React |
| **React 19** | UI del playground |
| **Monaco Editor** | Editor de código (el mismo motor de VS Code) |
| **esbuild** | Transformación JSX/TSX ultrarrápida |
| **@tailwindcss/browser** | Tailwind v4 en el iframe de preview |

### 1.1 Inicializar el proyecto

```bash
mkdir xp && cd xp
npm init -y
```

### 1.2 Instalar dependencias

```bash
# Tiempo de ejecución
npm install react react-dom @monaco-editor/react esbuild @tailwindcss/browser

# Desarrollo
npm install -D electron vite @vitejs/plugin-react \
  vite-plugin-electron vite-plugin-electron-renderer \
  electron-builder concurrently wait-on
```

### 1.3 Estructura de carpetas

```
xp/
├── electron/
│   ├── main.js        ← proceso principal Electron
│   └── preload.js     ← puente seguro renderer ↔ main
├── src/
│   ├── components/
│   │   ├── Editor.jsx
│   │   ├── Output.jsx
│   │   ├── PreviewPane.jsx
│   │   ├── TabBar.jsx
│   │   ├── TitleBar.jsx
│   │   └── ThemeSelector.jsx
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   ├── main.jsx       ← entrada React
│   └── themes.js
├── index.html
├── vite.config.js
└── package.json
```

### 1.4 Configurar Vite

```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'

export default defineConfig({
  plugins: [
    react(),
    electron([{
      entry: 'electron/main.js',
      vite: { build: { rollupOptions: { external: ['esbuild'] } } },
    }, {
      entry: 'electron/preload.js',
      onstart(args) { args.reload() },
    }]),
    renderer(),
  ],
})
```

### 1.5 Scripts en package.json

```json
"scripts": {
  "dev":            "vite",
  "electron:dev":   "concurrently \"vite\" \"wait-on http://localhost:5173 && electron .\"",
  "electron:build": "vite build && electron-builder"
}
```

> [!tip] Para desarrollar
> Ejecuta `npm run electron:dev`. Vite arranca el dev server y Electron espera a que esté listo antes de abrir la ventana.

---

## Capítulo 2 · Ventana Electron sin bordes

### Concepto clave

Electron tiene dos procesos:
- **Main process** (`electron/main.js`): acceso a Node.js, crea ventanas, maneja IPC.
- **Renderer process** (`src/`): UI React, igual que un navegador.

Se comunican mediante **IPC** (Inter-Process Communication).

### 2.1 main.js básico

```js
// electron/main.js
import { app, BrowserWindow } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 750,
    transparent: true,        // ← permite esquinas redondeadas reales
    titleBarStyle: 'hidden',  // ← oculta la barra de título del SO
    frame: false,             // ← ventana sin decoraciones nativas
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,   // seguridad: aísla renderer del main
      nodeIntegration: false,   // seguridad: renderer no tiene Node.js
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())
```

> [!warning] `transparent: true`
> Requiere que el compositor del sistema lo soporte. En Linux necesitas un compositor como Picom, Mutter o KWin. En Windows/macOS funciona siempre.

### 2.2 Fondo transparente en React

```css
/* src/index.css */
html, body, #root {
  height: 100%;
  overflow: hidden;
  background: transparent; /* ← sin esto, la ventana es negra */
}
```

```css
/* src/App.css */
.app {
  border-radius: 10px;  /* ← forma real de la ventana, no solo CSS */
  overflow: hidden;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
}
```

---

## Capítulo 3 · TitleBar y controles de ventana

### Concepto clave

Sin barra de título nativa, necesitamos recrear los botones de minimizar/maximizar/cerrar en React. La zona de arrastre se declara con la propiedad CSS `-webkit-app-region: drag`.

### 3.1 IPC para controlar la ventana

**Preload** — expone funciones seguras al renderer:

```js
// electron/preload.js
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('xp', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close:    () => ipcRenderer.send('window-close'),
})
```

**Main** — escucha los eventos:

```js
// electron/main.js
import { ipcMain, BrowserWindow } from 'electron'

ipcMain.on('window-minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize())
ipcMain.on('window-maximize', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  win?.isMaximized() ? win.unmaximize() : win.maximize()
})
ipcMain.on('window-close', (e) => BrowserWindow.fromWebContents(e.sender)?.close())
```

### 3.2 Componente TitleBar

```jsx
// src/components/TitleBar.jsx
export default function TitleBar({ fileName }) {
  return (
    <div className="titlebar">
      <span className="titlebar-logo">XP</span>

      {/* Zona de arrastre: el usuario arrastra aquí para mover la ventana */}
      <div className="titlebar-drag">
        <span>{fileName}</span>
      </div>

      {/* Botones de ventana */}
      <div className="titlebar-controls">
        <button className="wm-btn wm-minimize" onClick={() => window.xp.minimize()} />
        <button className="wm-btn wm-maximize" onClick={() => window.xp.maximize()} />
        <button className="wm-btn wm-close"    onClick={() => window.xp.close()} />
      </div>
    </div>
  )
}
```

```css
/* TitleBar.css — fragmento clave */
.titlebar-drag {
  flex: 1;
  -webkit-app-region: drag;  /* ← esta zona arrastra la ventana */
}

/* Los botones NO deben ser arrastrables */
.titlebar-controls {
  -webkit-app-region: no-drag;
}

.wm-close    { background: #ff5f57; border-radius: 50%; width: 12px; height: 12px; }
.wm-minimize { background: #ffbd2e; border-radius: 50%; width: 12px; height: 12px; }
.wm-maximize { background: #28c840; border-radius: 50%; width: 12px; height: 12px; }
```

---

## Capítulo 4 · Editor Monaco

### Concepto clave

Monaco Editor es el motor de edición de VS Code. El paquete `@monaco-editor/react` lo integra con React. Cada archivo abierto en Monaco es un **modelo** identificado por una URI.

> [!important] URI del modelo y extensión de archivo
> El servicio TypeScript de Monaco determina si un archivo es JSX/TSX por la **extensión de la URI del modelo**, no por el prop `language`. Un modelo con URI `uuid` sin extensión no recibe IntelliSense de JSX aunque `language="javascript"`.

### 4.1 Componente Editor básico

```jsx
// src/components/Editor.jsx
import MonacoEditor from '@monaco-editor/react'

// Mapa lenguaje-app → lenguaje Monaco
const MONACO_LANG = { jsx: 'javascript', tsx: 'typescript' }
// Extensión de archivo para la URI del modelo
const MODEL_EXT  = { jsx: 'jsx', tsx: 'tsx', javascript: 'js', typescript: 'ts', python: 'py' }

export default function Editor({ path, value, language = 'javascript', onChange, onEditorMount, onSave }) {
  // La URI incluye la extensión para que el worker TS active IntelliSense JSX
  const modelPath = `${path}.${MODEL_EXT[language] ?? language}`

  const handleMount = (editor, monaco) => {
    // Ctrl+S para guardar
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => onSave?.())
    onEditorMount?.(editor, monaco)
  }

  return (
    <MonacoEditor
      height="100%"
      path={modelPath}
      language={MONACO_LANG[language] ?? language}
      defaultValue={value}
      onChange={onChange}
      onMount={handleMount}
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        wordWrap: 'on',
        tabSize: 2,
        bracketPairColorization: { enabled: true },
      }}
    />
  )
}
```

### 4.2 Habilitar JSX en el compilador TypeScript de Monaco

```js
// Dentro de handleMount:
const ts = monaco.languages.typescript
const sharedOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  jsx: ts.JsxEmit.ReactJSX,    // transforma JSX automáticamente
  jsxImportSource: 'react',
  allowJs: true,
  allowSyntheticDefaultImports: true,
  esModuleInterop: true,
}
ts.javascriptDefaults.setCompilerOptions(sharedOptions)
ts.typescriptDefaults.setCompilerOptions(sharedOptions)
```

> [!tip] `JsxEmit.ReactJSX` vs `JsxEmit.React`
> - `React` (clásico): requiere `import React from 'react'` en cada archivo.
> - `ReactJSX` (automático): inyecta el import de `react/jsx-runtime` automáticamente. El usuario no necesita importar React.

### 4.3 Sincronizar contenido al cambiar de lenguaje

Cuando el usuario cambia de `jsx` a `tsx`, la URI del modelo cambia. Monaco restaura el modelo antiguo. Para forzar el contenido correcto:

```js
// En el componente Editor
const editorRef = useRef(null)
const valueRef  = useRef(value)
valueRef.current = value  // siempre el valor más reciente

useEffect(() => {
  const model = editorRef.current?.getModel()
  if (model && model.getValue() !== valueRef.current) {
    model.setValue(valueRef.current)
  }
}, [modelPath])  // solo cuando cambia la extensión (= cambio de lenguaje)
```

---

## Capítulo 5 · Ejecución de código JavaScript y TypeScript

### Concepto clave

Usamos `node:vm` del proceso main para ejecutar código en un sandbox. El sandbox tiene un `console` personalizado que captura los logs con número de línea.

### 5.1 ¿Por qué node:vm?

- El código del usuario corre **aislado** de la app.
- Podemos capturar `console.log`, `console.error`, etc.
- Podemos leer el número de línea desde el stack trace.

### 5.2 Detectar número de línea desde el stack

```js
// electron/main.js
const VM_FILENAME = 'playground.js'

function vmLine(stack) {
  const m = (stack || '').match(/playground\.js:(\d+)/)
  return m ? parseInt(m[1], 10) : null
}
```

esbuild envuelve el código en `(async () => { ... })()`, lo que añade una línea. Ajustamos restando 1.

### 5.3 Runner de JavaScript

```js
async function runJS(code, language) {
  const logs = []

  // 1. Transpilar TypeScript si es necesario
  let jsCode = code
  if (language === 'typescript') {
    jsCode = transformSync(code, {
      loader: 'ts', target: 'esnext', format: 'esm'
    }).code
  }

  // 2. Crear sandbox con console personalizado
  const sandbox = {
    console: {
      log:  (...args) => logs.push({ type: 'log',  values: args.map(serialize), line: vmLine(new Error().stack) }),
      warn: (...args) => logs.push({ type: 'warn', values: args.map(serialize), line: vmLine(new Error().stack) }),
      // ...
    },
    Promise, JSON, Math, Date, Array, Object, /* ... globales seguros */
    fetch: globalThis.fetch,
  }
  vm.createContext(sandbox)

  // 3. Ejecutar con timeout
  try {
    const wrapped = `(async () => {\n${jsCode}\n})()`
    const script  = new vm.Script(wrapped, { filename: VM_FILENAME })
    const result  = await script.runInContext(sandbox, { timeout: 10000 })
    return { logs, result: result !== undefined ? serialize(result) : undefined, error: null }
  } catch (err) {
    const line = vmLine(err.stack)
    return { logs, result: undefined, error: { message: err.message, line: line != null ? line - 1 : null } }
  }
}
```

### 5.4 Serializar valores JavaScript

Los valores del sandbox no pueden enviarse directamente por IPC (no son JSON puro). Los serializamos a objetos planos:

```js
function serialize(val) {
  if (val === null)             return { type: 'null',      display: 'null' }
  if (val === undefined)        return { type: 'undefined', display: 'undefined' }
  if (typeof val === 'function') return { type: 'function',  display: `[Function: ${val.name || 'anonymous'}]` }
  if (typeof val === 'number')   return { type: 'number',    display: String(val) }
  if (typeof val === 'string')   return { type: 'string',    display: JSON.stringify(val) }
  if (val instanceof Error)      return { type: 'error',     display: `${val.name}: ${val.message}` }
  try {
    return { type: typeof val, display: JSON.stringify(val, null, 2) }
  } catch {
    return { type: typeof val, display: String(val) }
  }
}
```

### 5.5 Exponer por IPC

```js
// electron/main.js
ipcMain.handle('run-code', async (_event, { code, language }) => {
  if (language === 'python') return runPython(code)
  return runJS(code, language)
})
```

```js
// electron/preload.js
contextBridge.exposeInMainWorld('xp', {
  runCode: (code, language) => ipcRenderer.invoke('run-code', { code, language }),
})
```

```js
// src/App.jsx — llamada desde React
const result = await window.xp.runCode(code, language)
```

---

## Capítulo 6 · Ejecución de Python

### Concepto clave

Python se ejecuta como proceso hijo (`child_process.spawn`). Creamos un script runner temporal en `/tmp` que captura `print()` con número de línea y devuelve los resultados como JSON por stdout.

### 6.1 El script runner

```python
# Se escribe en /tmp/xp_runner.py al iniciar la app
import sys, json, builtins, inspect, traceback

_logs = []

def _print(*args, sep=' ', end='\n', file=None, flush=False):
    frame = inspect.currentframe()
    line = frame.f_back.f_lineno if frame and frame.f_back else None
    _logs.append({'type': 'log', 'line': line, 'value': sep.join(str(a) for a in args)})

builtins.print = _print  # ← reemplaza el print global

with open(sys.argv[1], encoding='utf-8') as f:
    _code = f.read()

try:
    exec(compile(_code, 'playground.py', 'exec'), {'__name__': '__main__'})
except Exception as e:
    tb   = traceback.extract_tb(sys.exc_info()[2])
    line = tb[-1].lineno if tb else None
    _logs.append({'type': 'error', 'line': line, 'value': str(e), 'stack': traceback.format_exc()})

sys.stdout.write(json.dumps({'logs': _logs}))
```

> [!tip] ¿Por qué `compile(..., 'playground.py', 'exec')`?
> El segundo argumento es el nombre del archivo que aparece en los tracebacks. Así los números de línea se refieren al código del usuario, no al runner.

### 6.2 Ejecutar el runner desde Node.js

```js
async function runPython(code) {
  // Escribir el código del usuario en un archivo temporal
  const codeFile = path.join(tmpdir(), `xp_${Date.now()}.py`)
  fs.writeFileSync(codeFile, code, 'utf-8')

  return new Promise((resolve) => {
    const cmd  = process.platform === 'win32' ? 'python' : 'python3'
    const proc = spawn(cmd, [RUNNER_PATH, codeFile])

    let stdout = '', stderr = ''
    const timer = setTimeout(() => {
      proc.kill()
      resolve({ logs: [], error: { message: 'Timeout (>10s)', line: null } })
    }, 10000)

    proc.stdout.on('data', d => { stdout += d })
    proc.stderr.on('data', d => { stderr += d })

    proc.on('close', () => {
      clearTimeout(timer)
      fs.unlinkSync(codeFile)
      try {
        const data = JSON.parse(stdout)
        const logs = data.logs.map(e => ({
          type:   e.type === 'error' ? 'throw' : 'log',
          line:   e.line ?? null,
          values: [{ type: 'raw', display: e.value }],
          ...(e.stack ? { stack: e.stack } : {}),
        }))
        resolve({ logs, error: null })
      } catch {
        resolve({ logs: [], error: { message: stderr.trim() || 'Error desconocido', line: null } })
      }
    })
  })
}
```

---

## Capítulo 7 · Panel Output

### Concepto clave

El Output muestra una lista de entradas (`entries`). Cada entrada tiene un `type` (log, warn, error, throw, return) y un array de `values` serializados. Los colores, iconos y número de línea lo hacen visual e informativo.

### 7.1 Estructura de una entrada

```js
// Ejemplo de entry generado por el sandbox
{
  type:   'log',           // 'log' | 'warn' | 'error' | 'throw' | 'return'
  line:   5,               // número de línea en el código fuente (puede ser null)
  values: [                // array de valores serializados
    { type: 'number',  display: '42' },
    { type: 'string',  display: '"hola"' },
    { type: 'object',  display: '{\n  "x": 1\n}' },
  ],
  stack: '...',            // solo en 'throw'
}
```

### 7.2 Componente Output

```jsx
export default function Output({ entries, running, execTime, onHoverLine, onClearHover }) {
  return (
    <div className="output">
      <div className="output-header">
        <span>Output</span>
        {running   && <span className="running-dot" />}
        {!running  && execTime != null && <span className="exec-time">{execTime.toFixed(1)}ms</span>}
      </div>
      <div className="output-body">
        {entries.map((entry, i) => (
          <Entry key={i} index={i} entry={entry}
            onHoverLine={onHoverLine} onClearHover={onClearHover} />
        ))}
      </div>
    </div>
  )
}
```

### 7.3 Resaltar línea en el editor al hacer hover

Cuando el usuario hace hover sobre una entrada con número de línea, se resalta esa línea en Monaco:

```js
// src/App.jsx
const highlightLine = useCallback((line) => {
  decorationRef.current?.set([{
    range: new monacoRef.current.Range(line, 1, line, 1),
    options: {
      isWholeLine: true,
      className: 'editor-highlight-line',
    },
  }])
}, [])
```

### 7.4 Stack trace colapsable

El elemento `<details>` de HTML da el comportamiento expandir/colapsar sin JS extra:

```jsx
{entry.stack && (
  <details className="entry-stack">
    <summary>stack trace</summary>
    <pre>{entry.stack}</pre>
  </details>
)}
```

> [!warning] Problema de layout con `<details>` en flex
> `<details>` dentro de un contenedor flex con `flex-wrap: nowrap` aplasta el texto. Solución: añade `flex-wrap: wrap` al contenedor `.entry` y `flex: 0 0 100%` al `.entry-stack` para forzarlo a nueva línea.

---

## Capítulo 8 · Sistema de pestañas

### Concepto clave

Cada pestaña es un objeto con todo su estado: código, lenguaje, output, ruta de archivo. Las pestañas se guardan en un array en el estado de `App.jsx`.

### 8.1 Estructura de un tab

```js
const createTab = (overrides = {}) => ({
  id:          crypto.randomUUID(),   // identificador único (también URI del modelo Monaco)
  fileName:    'Untitled',
  filePath:    null,                   // null = archivo no guardado
  code:        '',
  language:    'javascript',
  isDirty:     false,                  // ¿hay cambios sin guardar?
  output:      [],                     // array de entries
  execTime:    null,
  previewCode: null,                   // código ESM transformado (solo JSX/TSX)
  ...overrides,
})
```

### 8.2 Operaciones de tabs

```js
// src/App.jsx
const [tabs, setTabs]               = useState([initialTab])
const [activeTabId, setActiveTabId] = useState(initialTab.id)

// Actualizar campos de un tab específico
const updateTab = useCallback((id, updates) => {
  setTabs(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
}, [])

// Añadir tab
const addTab = useCallback((overrides = {}) => {
  const tab = createTab(overrides)
  setTabs(prev => [...prev, tab])
  setActiveTabId(tab.id)
  return tab
}, [])

// Cerrar tab (no cierra si es la última)
const closeTab = useCallback((id) => {
  setTabs(prev => {
    if (prev.length === 1) return prev
    const next = prev.filter(t => t.id !== id)
    if (activeTabId === id) {
      const idx = prev.findIndex(t => t.id === id)
      setActiveTabId(next[Math.min(idx, next.length - 1)].id)
    }
    return next
  })
}, [activeTabId])
```

### 8.3 Auto-ejecución con debounce

El código se ejecuta automáticamente al escribir, con un pequeño retraso para no ejecutar en cada tecla:

```js
const { id: activeId, code: activeCode, language: activeLang } = activeTab ?? {}

useEffect(() => {
  if (!activeId) return
  clearTimeout(pendingRef.current)

  if (activeLang === 'jsx' || activeLang === 'tsx') {
    // JSX/TSX: transformar para preview (más rápido)
    pendingRef.current = setTimeout(() => transformJSX(activeId, activeCode, activeLang), 300)
  } else {
    // Otros: ejecutar código
    pendingRef.current = setTimeout(() => executeCode(activeId, activeCode, activeLang), 600)
  }

  return () => clearTimeout(pendingRef.current)
}, [activeId, activeCode, activeLang])
```

> [!tip] Debounce manual vs librería
> `setTimeout` + `clearTimeout` es suficiente para este caso. El `return () => clearTimeout(pendingRef.current)` del useEffect cancela el timer si el código cambia antes de que dispare.

---

## Capítulo 9 · Preview de JSX y TSX

Este es el capítulo más complejo. Involucra tres piezas que deben coordinarse:

1. **Transformación**: esbuild convierte JSX/TSX → JavaScript ESM
2. **Bundles de React**: React 19 no tiene builds UMD, hay que generarlos
3. **Iframe + Import maps**: el componente se monta en un iframe aislado

### 9.1 ¿Por qué un iframe?

El preview corre en un `<iframe sandbox="allow-scripts">`. Esto garantiza:
- El código del usuario **no puede acceder** al DOM del playground
- Los errores de React **no rompen** la app principal
- Tailwind puede usar `MutationObserver` sin interferir con Monaco

### 9.2 Transformar JSX con esbuild (proceso main)

```js
// electron/main.js
ipcMain.handle('transform-jsx', (_event, { code, language }) => {
  try {
    const result = buildSync({
      stdin: {
        contents: code,
        loader: language === 'tsx' ? 'tsx' : 'jsx',
        resolveDir: path.join(__dirname, '..'),
      },
      bundle:   true,
      format:   'esm',          // ← ESM, no CJS
      platform: 'browser',
      jsx:      'automatic',    // ← inyecta import de jsx-runtime automáticamente
      external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
      write:    false,
      logLevel: 'silent',
    })
    return { code: result.outputFiles[0].text, error: null }
  } catch (err) {
    return { code: null, error: err.message }
  }
})
```

> [!info] ¿Por qué `format: 'esm'` y no `'cjs'`?
> Con `'cjs'`, esbuild usa `__defProp` con getters para los exports, lo que es difícil de detectar en el iframe. Con `'esm'`, el output es `export { App as default }`, que `import()` resuelve correctamente como `mod.default`.

### 9.3 Bundlear React como IIFE (proceso main)

React 19 eliminó las builds UMD. Usamos esbuild para crear una build IIFE que expone React como variables globales:

```js
function bundleReactForPreview() {
  const result = buildSync({
    stdin: {
      contents: `
        import * as React from 'react';
        import * as ReactDOMClient from 'react-dom/client';
        import * as ReactJSXRuntime from 'react/jsx-runtime';
        globalThis.React = React;
        globalThis.ReactDOM = ReactDOMClient;
        globalThis['react/jsx-runtime'] = ReactJSXRuntime;
      `,
      resolveDir: path.join(__dirname, '..'),
    },
    bundle:   true,
    format:   'iife',    // ← Immediately Invoked Function Expression
    platform: 'browser',
    minify:   true,
    write:    false,
  })
  return result.outputFiles[0].text
}
```

### 9.4 Import maps en el iframe

El código transformado del usuario tiene imports como `import { useState } from "react"`. En el iframe no hay node_modules. Los **Import Maps** resuelven esto mapeando los nombres a data URIs que re-exportan desde los globales:

```js
// src/components/PreviewPane.jsx

// Data URIs que re-exportan desde window.React (seteado por el IIFE de React)
const REACT_SHIM =
  "data:text/javascript,const R=globalThis.React;" +
  "export default R;" +
  "export const {useState,useEffect,useRef,useCallback,...}=R;"

const JSX_RT_SHIM =
  "data:text/javascript,const J=globalThis['react/jsx-runtime'];" +
  "export const {jsx,jsxs,Fragment}=J;"

const IMPORT_MAP = JSON.stringify({
  imports: {
    "react":              REACT_SHIM,
    "react/jsx-runtime":  JSX_RT_SHIM,
    "react-dom/client":   "data:text/javascript,const RD=globalThis.ReactDOM;export const {createRoot}=RD;",
  }
})
```

### 9.5 Montar el componente en el iframe

```js
function buildSrcdoc({ react, tailwind }, transformedCode) {
  return `<!DOCTYPE html>
<html>
<head>
  <script type="importmap">${IMPORT_MAP}</script>  <!-- PRIMERO: resuelve imports -->
  <script>${tailwind}</script>                      <!-- SEGUNDO: Tailwind observa el DOM -->
</head>
<body>
  <div id="root"></div>
  <script>${react}</script>                         <!-- TERCERO: globaliza React -->
  <script type="module">
    // Cargar el código del usuario como módulo ESM dinámico
    const blob = new Blob([${JSON.stringify(transformedCode)}], {type:'text/javascript'})
    const url  = URL.createObjectURL(blob)
    try {
      const mod  = await import(url)                // ← import dinámico de Blob URL
      URL.revokeObjectURL(url)
      const Comp = mod.default                      // ← export default del usuario
      if (Comp && typeof Comp === 'function') {
        window.ReactDOM.createRoot(document.getElementById('root')).render(
          window.React.createElement(Comp)
        )
      }
    } catch(e) {
      document.getElementById('root').innerHTML =
        '<pre style="color:#d33">' + e.message + '</pre>'
    }
  </script>
</body>
</html>`
}
```

> [!info] ¿Por qué Blob URL y no `<script>` inline?
> Incrustar el código del usuario directamente en el HTML con template literals puede romperse si el código contiene backticks o `${`. El Blob URL evita cualquier problema de escaping porque `JSON.stringify` hace el escape correctamente.

> [!tip] Orden de los scripts en el iframe
> El orden importa: **importmap → Tailwind → React → módulo usuario**. Si Tailwind llega después de React, sus clases ya están en el DOM y no las detecta.

---

## Capítulo 10 · Tailwind v4 en el preview

### Concepto clave

`@tailwindcss/browser` es un script IIFE que incluye el compilador de Tailwind completo. Se inyecta en el iframe y usa `MutationObserver` para detectar clases CSS en el DOM y generar los estilos en tiempo real.

### 10.1 Obtener el bundle

```js
// electron/main.js
function getTailwindBundle() {
  try {
    // Resolver la ruta del paquete instalado
    const pkgRoot    = path.dirname(_require.resolve('@tailwindcss/browser/package.json'))
    const bundlePath = path.join(pkgRoot, 'dist', 'index.global.js')
    return fs.readFileSync(bundlePath, 'utf-8')  // ~300KB
  } catch {
    return ''  // Tailwind no disponible, el preview funciona sin clases
  }
}
```

> [!tip] Pre-cargar al inicio
> Llama a `getTailwindBundle()` en `app.whenReady()` para tener el bundle cacheado antes de que el usuario abra un archivo JSX.

---

## Capítulo 11 · Autocompletado con tipos de React

### Concepto clave

Monaco usa el servicio TypeScript para proporcionar autocompletado. Para que reconozca los tipos de React (hooks, FC, JSX) sin instalar `@types/react`, registramos declaraciones de tipo directamente via `addExtraLib`.

### 11.1 Dos archivos de tipos separados

Necesitamos **dos registros distintos** porque tienen alcances diferentes:

```js
// 1. Declaración del módulo 'react' — alcance de módulo
ts.typescriptDefaults.addExtraLib(
  REACT_MODULE_TYPES,
  'file:///node_modules/@types/react/index.d.ts'
)

// 2. Namespace JSX global — DEBE ser un archivo script (sin imports/exports)
//    para que JSX.IntrinsicElements sea global
ts.typescriptDefaults.addExtraLib(
  REACT_JSX_GLOBALS,
  'file:///node_modules/@types/react/jsx-globals.d.ts'
)
```

> [!warning] El problema del `declare module` y el scope global
> Un archivo `.d.ts` con `declare module 'react' { ... }` es un archivo de módulo. Cualquier `declare namespace JSX` dentro de él es **local al módulo**, no global. Para que `JSX.IntrinsicElements` sea global, debe estar en un archivo separado **sin** `declare module` al nivel superior.

### 11.2 Tipos del módulo react

```typescript
// Estructura básica de REACT_MODULE_TYPES
declare module 'react/jsx-runtime' {
  export function jsx(type: any, props: any, key?: any): any
  export function jsxs(type: any, props: any, key?: any): any
  export const Fragment: symbol
}

declare module 'react' {
  export function useState<S>(initialState: S | (() => S)): [S, (v: S | ((p: S) => S)) => void]
  export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void
  export function useRef<T>(initialValue: T): { current: T }
  export function useCallback<T extends (...args: any[]) => any>(cb: T, deps: readonly any[]): T
  export function useMemo<T>(factory: () => T, deps: readonly any[]): T
  export type FC<P = {}> = (props: P & { children?: any }) => any
  // ...
}
```

### 11.3 IntrinsicElements para completado de etiquetas

```typescript
// REACT_JSX_GLOBALS — archivo script puro (sin declare module)
declare namespace JSX {
  type P = { className?: string; style?: any; children?: any; onClick?: (e: any) => void; [k: string]: any }
  interface IntrinsicElements {
    div: P; span: P; p: P; button: P & { type?: 'button'|'submit'|'reset'; disabled?: boolean }
    input: P & { type?: string; value?: any; onChange?: (e: any) => void; placeholder?: string }
    a: P & { href?: string; target?: string }
    img: P & { src?: string; alt?: string }
    form: P & { onSubmit?: (e: any) => void }
    h1: P; h2: P; h3: P; h4: P; h5: P; h6: P
    ul: P; ol: P; li: P; table: P; tr: P; td: P; th: P
    // ... resto de elementos HTML y SVG
  }
}
```

> [!info] Por qué `[k: string]: any` no da sugerencias
> Una firma de índice como `{ [elem: string]: any }` le dice a TypeScript "cualquier string es válido" pero no enumera claves. Para que aparezcan sugerencias al escribir `<`, debes listar cada elemento **explícitamente**.

---

## Capítulo 12 · Paneles redimensionables

### Concepto clave

Los dividers son divs con un cursor de redimensionado. Al hacer `mousedown`, registramos handlers globales en `window` para seguir el movimiento aunque el cursor salga del divider.

### 12.1 El patrón de drag

```js
// src/App.jsx
const onMainDividerDown = useCallback((e) => {
  e.preventDefault()
  const start   = e.clientX                   // posición inicial del ratón
  const startSz = outputSizeRef.current       // tamaño inicial del panel

  const onMove = (e) => {
    // delta positivo = arrastrar a la derecha
    const delta   = start - e.clientX         // invertido porque output está a la derecha
    const newSize = Math.max(120, Math.min(startSz + delta, window.innerWidth - 240))
    outputSizeRef.current = newSize
    setOutputSize(newSize)
  }

  const onUp = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }

  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}, [])
```

> [!tip] ¿Por qué `window` y no el elemento?
> Si registras `mousemove` en el divider, el evento deja de llegar en cuanto el cursor se mueve más rápido que el render. Registrándolo en `window` capturas todos los movimientos del mouse sin importar dónde esté.

### 12.2 CSS del divider

```css
/* Área clicable de 5px, línea visual de 1px centrada */
.divider-v {
  width: 5px;
  cursor: col-resize;
  position: relative;
  flex-shrink: 0;
}

.divider-v::after {
  content: '';
  position: absolute;
  inset: 0;
  left: 2px;
  width: 1px;
  background: var(--border);
  transition: background 0.15s;
}

.divider-v:hover::after,
.divider-v:active::after {
  background: var(--accent);  /* azul al interactuar */
}
```

### 12.3 Ref + state para evitar stale closures

```js
// El ref guarda el valor actual sin causar re-renders
// El state dispara el re-render para actualizar el estilo
const outputSizeRef = useRef(400)
const [outputSize, setOutputSize] = useState(400)

// En el handler: escribir al ref (sin re-render)
outputSizeRef.current = newSize
// Luego actualizar el state (dispara re-render)
setOutputSize(newSize)
```

> [!info] ¿Por qué necesitamos el ref?
> `onMove` es una closure que captura `outputSizeRef` pero no `outputSize` (sería el valor al momento del `mousedown`). El ref siempre tiene el valor actual, así los cálculos de delta son acumulativos y no saltan.

---

## Capítulo 13 · Selector de layout

### Concepto clave

El layout del workspace se controla con una sola propiedad CSS: `flex-direction`. Los cuatro layouts posibles son `row`, `row-reverse`, `column` y `column-reverse`.

### 13.1 Estado y lógica

```js
const [layout, setLayout] = useState('row')

// Al cambiar entre orientación horizontal ↔ vertical, resetear el tamaño
const handleLayoutChange = useCallback((newLayout) => {
  const wasVert  = layout === 'col' || layout === 'col-reverse'
  const willVert = newLayout === 'col' || newLayout === 'col-reverse'
  if (wasVert !== willVert) {
    outputSizeRef.current = willVert ? 280 : 400
    setOutputSize(willVert ? 280 : 400)
  }
  setLayout(newLayout)
}, [layout])
```

### 13.2 Aplicar el layout

```jsx
// El flexDirection controla todo: posición relativa de editor y output
<div className="workspace" style={{ flexDirection: layout }}>
  <div className="editor-pane">...</div>
  <div className={isVertical ? 'divider-h' : 'divider-v'} onMouseDown={onMainDividerDown} />
  <div className="output-pane" style={isVertical ? { height: outputSize } : { width: outputSize }}>
    ...
  </div>
</div>
```

### 13.3 Iconos SVG compactos

Cada botón del selector de layout usa un SVG de 18×14px con dos rectángulos que representan editor (grande) y output (pequeño):

```jsx
// Layout 'row': editor grande a la izquierda, output pequeño a la derecha
<svg width="18" height="14" viewBox="0 0 18 14" fill="currentColor">
  <rect x="0"  y="0" width="10" height="14" rx="1.5" opacity="0.9" />  {/* editor */}
  <rect x="12" y="0" width="6"  height="14" rx="1.5" opacity="0.5" />  {/* output */}
</svg>
```

---

## Capítulo 14 · Apertura y guardado de archivos

### Concepto clave

Los diálogos nativos de archivo (`showOpenDialog`, `showSaveDialog`) solo están disponibles en el proceso main. Se acceden desde React via IPC.

### 14.1 Diálogo de apertura

```js
// electron/main.js
ipcMain.handle('file-open', async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    filters: [{ name: 'Código', extensions: ['js', 'ts', 'jsx', 'tsx', 'py'] }],
    properties: ['openFile'],
  })
  if (canceled || !filePaths[0]) return null
  return {
    path:    filePaths[0],
    content: fs.readFileSync(filePaths[0], 'utf-8'),
  }
})
```

### 14.2 Detectar lenguaje por extensión

```js
// src/App.jsx
const lang = file.path.endsWith('.tsx') ? 'tsx'
           : file.path.endsWith('.jsx') ? 'jsx'
           : file.path.endsWith('.ts')  ? 'typescript'
           : file.path.endsWith('.py')  ? 'python'
           : 'javascript'
```

### 14.3 Reutilizar tabs vacías

Si el tab activo está vacío y no tiene archivo, en vez de abrir un tab nuevo se reemplaza in-place. Esto evita acumular tabs vacías:

```js
const isClean = activeTab && !activeTab.isDirty && !activeTab.filePath && activeTab.code === ''
if (isClean) {
  // Reemplazar el tab actual con el archivo abierto
  const replacement = createTab({ ...tabData, id: crypto.randomUUID() })
  setTabs(prev => prev.map(t => t.id === activeTabId ? replacement : t))
  setActiveTabId(replacement.id)
} else {
  // Abrir en un tab nuevo
  addTab(tabData)
}
```

> [!tip] Nueva ID al reemplazar
> Se crea un tab con una ID nueva (no la del tab vacío) para forzar a Monaco a crear un nuevo modelo. Si se reutilizara la misma ID, Monaco podría mostrar el contenido del modelo anterior en caché.

---

## Capítulo 15 · Sistema de temas

### Concepto clave

Los temas se definen como un objeto con dos partes:
- `vars`: variables CSS para los colores de la UI
- `monacoId` + `definition`: tema registrado en Monaco

### 15.1 Estructura de un tema

```js
// src/themes.js
export const THEMES = {
  dark: {
    monacoId: 'xp-dark',
    vars: {
      '--bg':         '#1e1e1e',
      '--surface':    '#252526',
      '--border':     '#3e3e42',
      '--text':       '#d4d4d4',
      '--text-muted': '#6a6a6a',
      '--accent':     '#0078d4',
    },
    definition: {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: { 'editor.background': '#1e1e1e' },
    },
  },
  // ...más temas
}
```

### 15.2 Aplicar el tema

```js
// src/themes.js
export function applyThemeVars(vars) {
  const root = document.documentElement
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value)
  }
}
```

```js
// src/App.jsx
useEffect(() => {
  const t = THEMES[theme] ?? THEMES[DEFAULT_THEME]
  applyThemeVars(t.vars)
  if (monacoRef.current) monacoRef.current.editor.setTheme(t.monacoId)
  localStorage.setItem('xp-theme', theme)  // persistir entre sesiones
}, [theme])
```

---

## Resumen de conceptos clave

| Concepto | Solución usada |
|---|---|
| Ventana sin bordes | `frame: false` + `titleBarStyle: 'hidden'` en Electron |
| Esquinas redondeadas reales | `transparent: true` en BrowserWindow |
| Zona de arrastre de ventana | CSS `-webkit-app-region: drag` |
| Ejecución de JS aislada | `node:vm` con sandbox personalizado |
| Capturar línea de print en Python | `inspect.currentframe().f_back.f_lineno` |
| React 19 sin builds UMD | esbuild `format: 'iife'` desde node_modules |
| JSX → ESM para el preview | esbuild `format: 'esm'` + `jsx: 'automatic'` |
| Resolver imports en iframe | `<script type="importmap">` con data URIs |
| Cargar módulo dinámico en iframe | `URL.createObjectURL` + `await import(url)` |
| IntelliSense JSX en Monaco | URI del modelo con extensión `.jsx`/`.tsx` |
| Tipos React sin `@types/react` | `addExtraLib` con declaraciones inline |
| Tags HTML en autocompletado | `JSX.IntrinsicElements` en archivo script global |
| Drag-to-resize sin lag | Handler `mousemove` en `window`, no en el elemento |
| Valor actual en closures de drag | `useRef` para lectura, `useState` para render |
| Layout flexible del workspace | `flex-direction` dinámico en el contenedor |

---

> [!success] ¡Completado!
> Con estos 15 capítulos tienes todos los bloques para construir XP Playground desde cero. Cada capítulo introduce un concepto, explica el **por qué** de las decisiones técnicas y muestra el código mínimo necesario.
