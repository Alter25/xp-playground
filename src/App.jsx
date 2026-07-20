import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import Editor from './components/Editor'
import Output from './components/Output'
import PreviewPane from './components/PreviewPane'
import TitleBar from './components/TitleBar'
import TabBar from './components/TabBar'
import { THEMES, DEFAULT_THEME, applyThemeVars } from './themes'
import './App.css'

const DEFAULT_CODE = `import { useState } from 'react'

type ColorStop = { color: string; label: string }

const STOPS: ColorStop[] = [
  { color: '#6366f1', label: 'Indigo' },
  { color: '#ec4899', label: 'Pink' },
  { color: '#f59e0b', label: 'Amber' },
  { color: '#10b981', label: 'Emerald' },
]

export default function Palette() {
  const [active, setActive] = useState(0)
  const { color, label } = STOPS[active]

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: 320 }}>
      <div style={{
        height: 120, borderRadius: 12, marginBottom: '1.5rem',
        background: color, transition: 'background 0.4s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 22, fontWeight: 700, letterSpacing: 1,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {STOPS.map((s, i) => (
          <button
            key={s.color}
            onClick={() => setActive(i)}
            style={{
              flex: 1, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: s.color, opacity: i === active ? 1 : 0.45,
              transform: i === active ? 'scale(1.12)' : 'scale(1)',
              transition: 'opacity 0.2s, transform 0.2s',
            }}
          />
        ))}
      </div>
    </div>
  )
}
`

const createTab = (overrides = {}) => ({
  id: crypto.randomUUID(),
  fileName: 'Untitled',
  filePath: null,
  code: '',
  language: 'javascript',
  isDirty: false,
  output: [],
  execTime: null,
  previewCode: null,
  ...overrides,
})

export default function App() {
  const initialTab = useMemo(() => createTab({ code: DEFAULT_CODE, language: 'tsx', fileName: 'Palette.tsx' }), [])
  const [tabs, setTabs]               = useState([initialTab])
  const [activeTabId, setActiveTabId] = useState(initialTab.id)
  const [runningTabId, setRunningTabId] = useState(null)
  const [theme, setTheme] = useState(
    () => localStorage.getItem('xp-theme') ?? DEFAULT_THEME
  )

  const runningRef    = useRef(false)
  const pendingRef    = useRef(null)
  const editorRef     = useRef(null)
  const monacoRef     = useRef(null)
  const decorationRef = useRef(null)

  const [layout,        setLayout]        = useState('row')
  const [outputSize,    setOutputSize]    = useState(400)
  const [consoleHeight, setConsoleHeight] = useState(170)
  const [vimMode,       setVimMode]       = useState(
    () => localStorage.getItem('xp-vim') === 'true'
  )
  const outputSizeRef    = useRef(400)
  const consoleHeightRef = useRef(170)

  const handleLayoutChange = useCallback((newLayout) => {
    const wasVert = layout === 'col' || layout === 'col-reverse'
    const willVert = newLayout === 'col' || newLayout === 'col-reverse'
    if (wasVert !== willVert) {
      const def = willVert ? 280 : 400
      outputSizeRef.current = def
      setOutputSize(def)
    }
    setLayout(newLayout)
  }, [layout])

  const onMainDividerDown = useCallback((e) => {
    e.preventDefault()
    const isVert = layout === 'col' || layout === 'col-reverse'
    const start  = isVert ? e.clientY : e.clientX
    const startS = outputSizeRef.current
    const onMove = (e) => {
      const cur   = isVert ? e.clientY : e.clientX
      const delta = layout === 'row' || layout === 'col'
        ? start - cur   // output on right/bottom: drag toward editor = grows output
        : cur - start   // output on left/top:    drag away from editor = grows output
      const max   = isVert ? window.innerHeight - 100 : window.innerWidth - 240
      outputSizeRef.current = Math.max(120, Math.min(startS + delta, max))
      setOutputSize(outputSizeRef.current)
    }
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [layout])

  const onConsoleDividerDown = useCallback((e) => {
    e.preventDefault()
    const startY = e.clientY
    const startH = consoleHeightRef.current
    const onMove = (e) => {
      const h = Math.max(60, Math.min(startH + (e.clientY - startY), window.innerHeight - 160))
      consoleHeightRef.current = h
      setConsoleHeight(h)
    }
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  // Aplicar tema: CSS vars + Monaco
  useEffect(() => {
    const t = THEMES[theme] ?? THEMES[DEFAULT_THEME]
    applyThemeVars(t.vars)
    localStorage.setItem('xp-theme', theme)
    if (monacoRef.current) monacoRef.current.editor.setTheme(t.monacoId)
  }, [theme])

  const activeTab = useMemo(
    () => tabs.find(t => t.id === activeTabId) ?? tabs[0],
    [tabs, activeTabId]
  )

  // ── Helpers ──────────────────────────────────────────────────────────────
  const updateTab = useCallback((id, updates) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }, [])

  const addTab = useCallback((overrides = {}) => {
    const tab = createTab(overrides)
    setTabs(prev => [...prev, tab])
    setActiveTabId(tab.id)
    return tab
  }, [])

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

  // ── Ejecución JS / TS / PY ────────────────────────────────────────────────
  const executeCode = useCallback(async (tabId, src, lang) => {
    if (runningRef.current) return
    runningRef.current = true
    setRunningTabId(tabId)
    const start = performance.now()
    try {
      const result = await window.xp.runCode(src, lang)
      const elapsed = performance.now() - start
      const entries = [...result.logs]
      if (result.error) {
        entries.push({ type: 'throw', values: [{ type: 'error', display: result.error.message }], stack: result.error.stack, line: result.error.line })
      } else if (result.result !== undefined) {
        entries.push({ type: 'return', values: [result.result] })
      }
      updateTab(tabId, { output: entries, execTime: elapsed })
    } finally {
      runningRef.current = false
      setRunningTabId(null)
    }
  }, [updateTab])

  // ── Transformación JSX / TSX ───────────────────────────────────────────────
  const transformJSX = useCallback(async (tabId, src, lang) => {
    try {
      const result = await window.xp.transformJSX(src, lang)
      if (result.error) {
        updateTab(tabId, {
          previewCode: null,
          output: [{ type: 'throw', values: [{ type: 'error', display: result.error }], line: null }],
        })
      } else {
        updateTab(tabId, { previewCode: result.code, output: [] })
      }
    } catch (err) {
      updateTab(tabId, {
        previewCode: null,
        output: [{ type: 'throw', values: [{ type: 'error', display: err.message }], line: null }],
      })
    }
  }, [updateTab])

  // Auto-run con debounce al cambiar código/lenguaje del tab activo
  const { id: activeId, code: activeCode, language: activeLang } = activeTab ?? {}
  useEffect(() => {
    if (!activeId) return
    clearTimeout(pendingRef.current)
    if (activeLang === 'jsx' || activeLang === 'tsx') {
      pendingRef.current = setTimeout(() => transformJSX(activeId, activeCode, activeLang), 300)
    } else {
      pendingRef.current = setTimeout(() => executeCode(activeId, activeCode, activeLang), 600)
    }
    return () => clearTimeout(pendingRef.current)
  }, [activeId, activeCode, activeLang, executeCode, transformJSX])

  // ── Operaciones de archivo ────────────────────────────────────────────────
  const handleNew = useCallback(() => {
    addTab()
  }, [addTab])

  const handleOpen = useCallback(async () => {
    const file = await window.xp.openFile()
    if (!file) return
    // Si el archivo ya está abierto en otra tab, activarla
    const existing = tabs.find(t => t.filePath === file.path)
    if (existing) { setActiveTabId(existing.id); return }

    const lang     = file.path.endsWith('.tsx') ? 'tsx'
                   : file.path.endsWith('.jsx') ? 'jsx'
                   : file.path.endsWith('.ts')  ? 'typescript'
                   : file.path.endsWith('.py')  ? 'python'
                   : 'javascript'
    const fileName = file.path.split('/').pop()
    const tabData  = { code: file.content, filePath: file.path, fileName, language: lang, isDirty: false }

    // Si el tab activo está limpio, reemplazarlo in-place (nueva ID = nuevo modelo Monaco)
    const isClean = activeTab && !activeTab.isDirty && !activeTab.filePath && activeTab.code === ''
    if (isClean) {
      const replacement = createTab(tabData)
      setTabs(prev => prev.map(t => t.id === activeTabId ? replacement : t))
      setActiveTabId(replacement.id)
    } else {
      addTab(tabData)
    }
  }, [tabs, activeTab, activeTabId, updateTab, addTab])

  const handleSave = useCallback(async () => {
    if (!activeTab) return
    if (!activeTab.filePath) return handleSaveAs()
    await window.xp.saveFile(activeTab.filePath, activeTab.code)
    updateTab(activeTabId, { isDirty: false })
  }, [activeTab, activeTabId, updateTab])

  const handleSaveAs = useCallback(async () => {
    if (!activeTab) return
    const newPath = await window.xp.saveFileAs(activeTab.code, activeTab.language)
    if (!newPath) return
    updateTab(activeTabId, { filePath: newPath, fileName: newPath.split('/').pop(), isDirty: false })
  }, [activeTab, activeTabId, updateTab])

  const handleCodeChange = useCallback((val) => {
    updateTab(activeTabId, { code: val ?? '', isDirty: true })
  }, [activeTabId, updateTab])

  const setLanguage = useCallback((lang) => {
    if (!activeTab) return
    const updates = { language: lang, output: [] }
    if (lang !== 'jsx' && lang !== 'tsx') updates.previewCode = null
    updateTab(activeTabId, updates)
  }, [activeTab, activeTabId, updateTab])

  // ── Atajos de teclado ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (!e.ctrlKey && !e.metaKey) return
      if (e.key === 'n') { e.preventDefault(); handleNew() }
      if (e.key === 'o') { e.preventDefault(); handleOpen() }
      if (e.key === 't') { e.preventDefault(); addTab() }
      if (e.key === 'w') { e.preventDefault(); closeTab(activeTabId) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleNew, handleOpen, addTab, closeTab, activeTabId])

  // ── Monaco ────────────────────────────────────────────────────────────────
  const handleThemeChange = useCallback((id) => setTheme(id), [])

  const handleToggleVim = useCallback(() => {
    setVimMode(prev => {
      const next = !prev
      localStorage.setItem('xp-vim', String(next))
      return next
    })
  }, [])

  const handleEditorMount = useCallback((editor, monaco) => {
    editorRef.current     = editor
    monacoRef.current     = monaco
    decorationRef.current = editor.createDecorationsCollection([])

    // Registrar todos los temas custom en Monaco
    for (const t of Object.values(THEMES)) {
      if (t.definition) monaco.editor.defineTheme(t.monacoId, t.definition)
    }
    // Aplicar el tema actual (CSS vars ya están, solo falta Monaco)
    const current = THEMES[theme] ?? THEMES[DEFAULT_THEME]
    monaco.editor.setTheme(current.monacoId)
    // Aplicar vars por si es el primer render
    applyThemeVars(current.vars)
  }, [theme])

  const highlightLine = useCallback((line) => {
    if (!decorationRef.current || !monacoRef.current || !line) return
    decorationRef.current.set([{
      range: new monacoRef.current.Range(line, 1, line, 1),
      options: { isWholeLine: true, className: 'editor-highlight-line', linesDecorationsClassName: 'editor-highlight-gutter' },
    }])
  }, [])

  const clearHighlight = useCallback(() => decorationRef.current?.clear(), [])

  if (!activeTab) return null

  const isPreview = activeTab.language === 'jsx' || activeTab.language === 'tsx'
  const isVertical = layout === 'col' || layout === 'col-reverse'
  const mainDivClass = isVertical ? 'divider-h' : 'divider-v'
  const outputStyle  = isVertical
    ? { width: '100%', height: outputSize }
    : { width: outputSize }

  return (
    <div className="app">
      <TitleBar
        fileName={activeTab.fileName}
        isDirty={activeTab.isDirty}
        language={activeTab.language}
        currentTheme={theme}
        layout={layout}
        vimMode={vimMode}
        onNew={handleNew}
        onNewTab={() => addTab()}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onCloseTab={() => closeTab(activeTabId)}
        onSetLanguage={setLanguage}
        onThemeChange={handleThemeChange}
        onLayoutChange={handleLayoutChange}
        onToggleVim={handleToggleVim}
      />
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        runningTabId={runningTabId}
        onTabClick={setActiveTabId}
        onTabClose={closeTab}
        onNewTab={addTab}
      />
      <div className="workspace" style={{ flexDirection: layout }}>
        <div className="editor-pane">
          <Editor
            path={activeTab.id}
            value={activeTab.code}
            language={activeTab.language}
            onChange={handleCodeChange}
            onEditorMount={handleEditorMount}
            onSave={handleSave}
            vimMode={vimMode}
          />
        </div>
        <div className={mainDivClass} onMouseDown={onMainDividerDown} />
        <div
          className={`output-pane${isPreview ? ' output-pane-split' : ''}`}
          style={outputStyle}
        >
          {isPreview ? (
            <>
              <PreviewPane transformedCode={activeTab.previewCode} />
              <div className="divider-h" onMouseDown={onConsoleDividerDown} />
              <div className="console-wrap" style={{ height: consoleHeight }}>
                <Output
                  entries={activeTab.output}
                  running={runningTabId === activeTabId}
                  execTime={activeTab.execTime}
                  onHoverLine={highlightLine}
                  onClearHover={clearHighlight}
                />
              </div>
            </>
          ) : (
            <Output
              entries={activeTab.output}
              running={runningTabId === activeTabId}
              execTime={activeTab.execTime}
              onHoverLine={highlightLine}
              onClearHover={clearHighlight}
            />
          )}
        </div>
      </div>
    </div>
  )
}
