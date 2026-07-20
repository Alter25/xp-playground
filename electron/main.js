import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'

// SUID sandbox not available on Linux X11 without root — must be set before app ready
app.commandLine.appendSwitch('no-sandbox')
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import vm from 'node:vm'
import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'

const _require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── esbuild ───────────────────────────────────────────────────────────────────
// ESM `import` is hoisted and evaluated before any code here runs.
// esbuild captures ESBUILD_BINARY_PATH at module-load time, so we CANNOT set it
// via a top-level import and then hope to override it. Instead we use createRequire
// to lazy-load esbuild after setting the env var to the known unpacked path.
let _esbuild = null
function getEsbuild() {
  if (_esbuild) return _esbuild
  if (!process.env.VITE_DEV_SERVER_URL) {
    // Packaged app: asar patches require.resolve inconsistently for native binaries.
    // Point directly at the unpacked binary so esbuild doesn't try to resolve through asar.
    const bin = path.join(
      process.resourcesPath,
      'app.asar.unpacked', 'node_modules',
      `@esbuild/${process.platform}-${process.arch}`,
      'bin', 'esbuild'
    )
    if (fs.existsSync(bin)) process.env.ESBUILD_BINARY_PATH = bin
  }
  _esbuild = _require('esbuild')
  return _esbuild
}

// ── Ventana ───────────────────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 750,
    minWidth: 700,
    minHeight: 500,
    transparent: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: false,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// ── Runner Python ─────────────────────────────────────────────────────────────
// Se escribe a /tmp una sola vez al arrancar la app.
// Captura print() con número de línea via inspect.currentframe().
// El código de usuario se compila con filename='playground.py' para que los
// tracebacks muestren el número de línea relativo al código del usuario.
const PYTHON_RUNNER = `\
import sys, json, builtins, inspect, traceback

_logs = []

def _print(*args, sep=' ', end='\\n', file=None, flush=False):
    frame = inspect.currentframe()
    line = frame.f_back.f_lineno if frame and frame.f_back else None
    _logs.append({'type': 'log', 'line': line, 'value': sep.join(str(a) for a in args)})

builtins.print = _print

with open(sys.argv[1], encoding='utf-8') as _f:
    _code = _f.read()

try:
    exec(compile(_code, 'playground.py', 'exec'), {'__name__': '__main__'})
except SystemExit:
    pass
except Exception as _e:
    _tb = traceback.extract_tb(sys.exc_info()[2])
    _line = _tb[-1].lineno if _tb else None
    _logs.append({'type': 'error', 'line': _line, 'value': str(_e), 'stack': traceback.format_exc()})

sys.stdout.write(json.dumps({'logs': _logs}))
`

const RUNNER_PATH = path.join(tmpdir(), 'xp_runner.py')

// ── Ejecución Python ──────────────────────────────────────────────────────────
async function runPython(code) {
  const codeFile = path.join(tmpdir(), `xp_${Date.now()}.py`)
  fs.writeFileSync(codeFile, code, 'utf-8')

  return new Promise((resolve) => {
    // Intentar python3, luego python
    const cmd = process.platform === 'win32' ? 'python' : 'python3'
    const proc = spawn(cmd, [RUNNER_PATH, codeFile])

    let stdout = ''
    let stderr = ''

    const timer = setTimeout(() => {
      proc.kill()
      cleanup()
      resolve({ logs: [], result: undefined, error: { message: 'Timeout: ejecución cancelada (>10s)', line: null } })
    }, 10000)

    proc.stdout.on('data', d => { stdout += d })
    proc.stderr.on('data', d => { stderr += d })

    function cleanup() {
      clearTimeout(timer)
      try { fs.unlinkSync(codeFile) } catch {}
    }

    proc.on('close', () => {
      cleanup()
      try {
        const data = JSON.parse(stdout)
        const logs = data.logs.map(entry => ({
          type: entry.type === 'error' ? 'throw' : 'log',
          line: entry.line ?? null,
          values: [{ type: 'raw', display: entry.value }],
          ...(entry.stack ? { stack: entry.stack } : {}),
        }))
        resolve({ logs, result: undefined, error: null })
      } catch {
        const msg = stderr.trim() || stdout.trim() || 'Error desconocido'
        resolve({ logs: [], result: undefined, error: { message: msg, line: null } })
      }
    })

    proc.on('error', (err) => {
      cleanup()
      const msg = err.code === 'ENOENT'
        ? `Python no encontrado. Asegúrate de tener python3 instalado (comando: ${cmd})`
        : err.message
      resolve({ logs: [], result: undefined, error: { message: msg, line: null } })
    })
  })
}

// ── Ejecución JS / TS ─────────────────────────────────────────────────────────
const VM_FILENAME = 'playground.js'

function vmLine(stack) {
  const m = (stack || '').match(/playground\.js:(\d+)/)
  return m ? parseInt(m[1], 10) : null
}

async function runJS(code, language) {
  const logs = []

  let jsCode = code
  if (language === 'typescript') {
    try {
      jsCode = getEsbuild().transformSync(code, { loader: 'ts', target: 'esnext', format: 'esm' }).code
    } catch (err) {
      return { logs, result: undefined, error: { message: err.message, stack: err.stack, line: null } }
    }
  }

  const sandbox = {
    console: {
      log:   (...args) => { const line = vmLine(new Error().stack); logs.push({ type: 'log',   values: args.map(serialize), line }) },
      error: (...args) => { const line = vmLine(new Error().stack); logs.push({ type: 'error', values: args.map(serialize), line }) },
      warn:  (...args) => { const line = vmLine(new Error().stack); logs.push({ type: 'warn',  values: args.map(serialize), line }) },
      info:  (...args) => { const line = vmLine(new Error().stack); logs.push({ type: 'info',  values: args.map(serialize), line }) },
      table: (data)    => { const line = vmLine(new Error().stack); logs.push({ type: 'table', values: [serialize(data)], line }) },
    },
    setTimeout, clearTimeout, setInterval, clearInterval,
    Promise, JSON, Math, Date,
    Array, Object, String, Number, Boolean, RegExp, Map, Set,
    Error, TypeError, RangeError,
    fetch: globalThis.fetch,
  }

  vm.createContext(sandbox)

  try {
    const wrapped = `(async () => {\n${jsCode}\n})()`
    const script = new vm.Script(wrapped, { filename: VM_FILENAME })
    const result = await script.runInContext(sandbox, { timeout: 10000 })
    return { logs, result: result !== undefined ? serialize(result) : undefined, error: null }
  } catch (err) {
    const rawLine = vmLine(err.stack)
    const line = rawLine != null ? rawLine - 1 : null
    return { logs, result: undefined, error: { message: err.message, stack: err.stack, line } }
  }
}

ipcMain.handle('run-code', async (_event, { code, language }) => {
  if (language === 'python') return runPython(code)
  return runJS(code, language)
})

ipcMain.handle('transform-jsx', (_event, { code, language }) => {
  try {
    const result = getEsbuild().buildSync({
      stdin: {
        contents: code,
        loader: language === 'tsx' ? 'tsx' : 'jsx',
        resolveDir: path.join(__dirname, '..'),
      },
      bundle: true,
      format: 'esm',
      platform: 'browser',
      jsx: 'automatic',
      external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
      write: false,
      logLevel: 'silent',
    })
    return { code: result.outputFiles[0].text, error: null }
  } catch (err) {
    return { code: null, error: err.message }
  }
})

// ── Archivos ──────────────────────────────────────────────────────────────────
ipcMain.handle('file-open', async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    filters: [
      { name: 'Código',      extensions: ['js', 'mjs', 'ts', 'jsx', 'tsx', 'py'] },
      { name: 'JavaScript',  extensions: ['js', 'mjs'] },
      { name: 'TypeScript',  extensions: ['ts'] },
      { name: 'JSX / TSX',   extensions: ['jsx', 'tsx'] },
      { name: 'Python',      extensions: ['py'] },
      { name: 'Todos',       extensions: ['*'] },
    ],
    properties: ['openFile'],
  })
  if (canceled || !filePaths[0]) return null
  const content = fs.readFileSync(filePaths[0], 'utf-8')
  return { path: filePaths[0], content }
})

ipcMain.handle('file-save', async (_e, { filePath, content }) => {
  fs.writeFileSync(filePath, content, 'utf-8')
  return true
})

ipcMain.handle('file-save-as', async (e, { content, language }) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  const FILTERS = {
    typescript: [{ name: 'TypeScript', extensions: ['ts']  }, { name: 'Todos', extensions: ['*'] }],
    python:     [{ name: 'Python',     extensions: ['py']  }, { name: 'Todos', extensions: ['*'] }],
    javascript: [{ name: 'JavaScript', extensions: ['js']  }, { name: 'Todos', extensions: ['*'] }],
    jsx:        [{ name: 'JSX',        extensions: ['jsx'] }, { name: 'Todos', extensions: ['*'] }],
    tsx:        [{ name: 'TSX',        extensions: ['tsx'] }, { name: 'Todos', extensions: ['*'] }],
  }
  const DEFAULT_NAMES = {
    typescript: 'playground.ts', python: 'playground.py', javascript: 'playground.js',
    jsx: 'Component.jsx', tsx: 'Component.tsx',
  }
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    filters: FILTERS[language] ?? FILTERS.javascript,
    defaultPath: DEFAULT_NAMES[language] ?? 'playground.js',
  })
  if (canceled || !filePath) return null
  fs.writeFileSync(filePath, content, 'utf-8')
  return filePath
})

// ── Serialización JS ──────────────────────────────────────────────────────────
function serialize(val) {
  if (val === null)      return { type: 'null',      display: 'null' }
  if (val === undefined) return { type: 'undefined', display: 'undefined' }
  if (typeof val === 'function') return { type: 'function', display: `[Function: ${val.name || 'anonymous'}]` }
  if (typeof val === 'symbol')   return { type: 'symbol',   display: val.toString() }
  if (typeof val === 'bigint')   return { type: 'bigint',   display: `${val}n` }
  if (typeof val === 'number')   return { type: 'number',   display: String(val) }
  if (typeof val === 'boolean')  return { type: 'boolean',  display: String(val) }
  if (typeof val === 'string')   return { type: 'string',   display: JSON.stringify(val) }
  if (val instanceof Error)      return { type: 'error',    display: `${val.name}: ${val.message}` }
  try { return { type: typeof val, display: JSON.stringify(val, null, 2) } }
  catch { return { type: typeof val, display: String(val) } }
}

// ── Plugins ───────────────────────────────────────────────────────────────────
ipcMain.handle('get-plugins', async () => {
  const dir = path.join(app.getPath('userData'), 'plugins')
  try { fs.mkdirSync(dir, { recursive: true }) } catch {}
  let files
  try { files = fs.readdirSync(dir).filter(f => f.endsWith('.js')) }
  catch { return [] }
  return files.map(file => {
    try { return { name: file, code: fs.readFileSync(path.join(dir, file), 'utf-8'), error: null } }
    catch (e) { return { name: file, code: null, error: e.message } }
  })
})

ipcMain.handle('open-plugins-dir', async () => {
  const dir = path.join(app.getPath('userData'), 'plugins')
  try { fs.mkdirSync(dir, { recursive: true }) } catch {}
  shell.openPath(dir)
})

// ── Ventana IPC ───────────────────────────────────────────────────────────────
ipcMain.on('window-minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize())
ipcMain.on('window-maximize', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  win?.isMaximized() ? win.unmaximize() : win.maximize()
})
ipcMain.on('window-close', (e) => BrowserWindow.fromWebContents(e.sender)?.close())

app.whenReady().then(() => {
  fs.writeFileSync(RUNNER_PATH, PYTHON_RUNNER, 'utf-8')
  createWindow()
})
app.on('window-all-closed', () => app.quit())
