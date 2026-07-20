import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import Editor from './components/Editor'
import ErrorBoundary from './components/ErrorBoundary'
import Output from './components/Output'
import PreviewPane from './components/PreviewPane'
import TitleBar from './components/TitleBar'
import TabBar from './components/TabBar'
import useTabs from './hooks/useTabs'
import useLayout from './hooks/useLayout'
import useCodeRunner from './hooks/useCodeRunner'
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

export default function App() {
  // ── Hooks ──────────────────────────────────────────────────────────────────
  const {
    tabs, activeTab, activeTabId, setActiveTabId,
    updateTab, addTab, closeTab, replaceTab,
  } = useTabs(DEFAULT_CODE, 'tsx', 'Palette.tsx')

  const {
    layout, outputStyle, mainDivClass, isVertical, consoleHeight,
    handleLayoutChange, onMainDividerDown, onConsoleDividerDown,
  } = useLayout()

  const { runningTabId, runNowRef } = useCodeRunner(activeTab, updateTab)

  // ── Monaco / theme ─────────────────────────────────────────────────────────
  const [theme, setTheme] = useState(
    () => localStorage.getItem('xp-theme') ?? DEFAULT_THEME
  )
  const [vimMode, setVimMode] = useState(
    () => localStorage.getItem('xp-vim') === 'true'
  )

  const editorRef     = useRef(null)
  const monacoRef     = useRef(null)
  const decorationRef = useRef(null)

  useEffect(() => {
    const t = THEMES[theme] ?? THEMES[DEFAULT_THEME]
    applyThemeVars(t.vars)
    localStorage.setItem('xp-theme', theme)
    if (monacoRef.current) monacoRef.current.editor.setTheme(t.monacoId)
  }, [theme])

  // ── File operations ────────────────────────────────────────────────────────
  const handleNew = useCallback(() => addTab(), [addTab])

  const handleOpen = useCallback(async () => {
    const file = await window.xp.openFile()
    if (!file) return
    const existing = tabs.find(t => t.filePath === file.path)
    if (existing) { setActiveTabId(existing.id); return }

    const lang = file.path.endsWith('.tsx') ? 'tsx'
               : file.path.endsWith('.jsx') ? 'jsx'
               : file.path.endsWith('.ts')  ? 'typescript'
               : file.path.endsWith('.py')  ? 'python'
               : 'javascript'
    const fileName = file.path.split('/').pop()
    const tabData  = { code: file.content, filePath: file.path, fileName, language: lang, isDirty: false }

    const isClean = activeTab && !activeTab.isDirty && !activeTab.filePath && activeTab.code === ''
    if (isClean) replaceTab(activeTabId, tabData)
    else addTab(tabData)
  }, [tabs, activeTab, activeTabId, setActiveTabId, addTab, replaceTab])

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

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (!e.ctrlKey && !e.metaKey) return
      if (e.key === 'n') { e.preventDefault(); handleNew() }
      if (e.key === 'o') { e.preventDefault(); handleOpen() }
      if (e.key === 't') { e.preventDefault(); addTab() }
      if (e.key === 'w') { e.preventDefault(); closeTab(activeTabId) }
      if (e.key === 'Enter') { e.preventDefault(); runNowRef.current?.() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleNew, handleOpen, addTab, closeTab, activeTabId, runNowRef])

  // ── Monaco setup ───────────────────────────────────────────────────────────
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

    for (const t of Object.values(THEMES)) {
      if (t.definition) monaco.editor.defineTheme(t.monacoId, t.definition)
    }
    const current = THEMES[theme] ?? THEMES[DEFAULT_THEME]
    monaco.editor.setTheme(current.monacoId)
    applyThemeVars(current.vars)
  }, [theme])

  // Reflect runtime/compile errors as Monaco markers in the editor
  useEffect(() => {
    const editor = editorRef.current
    const monaco = monacoRef.current
    if (!editor || !monaco || !activeTab) return
    const model = editor.getModel()
    if (!model) return
    const errors = (activeTab.output ?? []).filter(e => e.type === 'throw' && e.line != null)
    monaco.editor.setModelMarkers(model, 'xp-runtime', errors.map(e => ({
      severity: monaco.MarkerSeverity.Error,
      message: e.values?.[0]?.display ?? 'Error',
      startLineNumber: e.line,
      endLineNumber: e.line,
      startColumn: 1,
      endColumn: model.getLineMaxColumn(e.line),
    })))
  }, [activeTab?.output, activeTabId])

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
          <ErrorBoundary>
            <Editor
              path={activeTab.id}
              value={activeTab.code}
              language={activeTab.language}
              onChange={handleCodeChange}
              onEditorMount={handleEditorMount}
              onSave={handleSave}
              onRun={() => runNowRef.current?.()}
              vimMode={vimMode}
            />
          </ErrorBoundary>
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
