import React, { useCallback, useRef, useEffect } from 'react'
import MonacoEditor from '@monaco-editor/react'
import { initVimMode } from 'monaco-vim'
import { activatePlugins } from '../lib/pluginLoader.js'
import { REACT_MODULE_TYPES, REACT_JSX_GLOBALS } from '../lib/reactTypes.js'
import { registerAllProviders } from '../lib/completionProviders.js'

// Lazy-loaded only when the user triggers completions in a JSX/TSX file
let _twClasses = null
let _twPromise = null
function getTwClasses() {
  if (_twClasses) return Promise.resolve(_twClasses)
  if (!_twPromise) _twPromise = import('../lib/tailwindClasses.js').then(m => { _twClasses = m.default; return _twClasses })
  return _twPromise
}

const MONACO_LANG = { jsx: 'javascript', tsx: 'typescript' }
const MODEL_EXT  = { jsx: 'jsx', tsx: 'tsx', javascript: 'js', typescript: 'ts', python: 'py' }

export default function Editor({ path, value, language = 'javascript', onChange, onEditorMount, onSave, onRun, vimMode = false }) {
  const monacoLang = MONACO_LANG[language] ?? language
  // Uri with the right extension so the TS worker activates JSX intellisense
  const modelPath = `${path}.${MODEL_EXT[language] ?? language}`

  const editorRef    = useRef(null)
  const valueRef     = useRef(value)
  const vimRef       = useRef(null)
  const statusbarRef = useRef(null)
  const vimModeRef   = useRef(vimMode)
  const onRunRef     = useRef(onRun)
  valueRef.current = value
  vimModeRef.current = vimMode
  onRunRef.current = onRun

  // When language changes, the model path changes and Monaco may restore a stale
  // cached model. Force-sync the content so the editor always shows activeTab.code.
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    const model = editor.getModel()
    if (model && model.getValue() !== valueRef.current) {
      model.setValue(valueRef.current)
    }
  }, [modelPath])

  // Activate / deactivate vim mode + sync cursor style
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !statusbarRef.current) return
    if (vimMode) {
      if (!vimRef.current) vimRef.current = initVimMode(editor, statusbarRef.current)
      editor.updateOptions({ cursorStyle: 'block' })
    } else {
      vimRef.current?.dispose()
      vimRef.current = null
      editor.updateOptions({ cursorStyle: 'line' })
    }
  }, [vimMode])

  // Cleanup on unmount
  useEffect(() => () => { vimRef.current?.dispose(); vimRef.current = null }, [])

  const handleMount = useCallback((editor, monaco) => {
    editorRef.current = editor
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => onSave?.())
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => onRunRef.current?.())

    const ts = monaco.languages.typescript
    const jsxEmit = ts.JsxEmit.ReactJSX  // automatic JSX transform

    const sharedCompilerOptions = {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      allowNonTsExtensions: true,
      jsx: jsxEmit,
      jsxImportSource: 'react',
      allowJs: true,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      // Strict checks — show real TS errors in the editor
      strict: true,
      noImplicitAny: true,
      noImplicitReturns: false,  // too noisy in a playground
      strictNullChecks: true,
      strictFunctionTypes: true,
    }

    ts.javascriptDefaults.setCompilerOptions({ ...sharedCompilerOptions, strict: false, noImplicitAny: false, strictNullChecks: false })
    ts.typescriptDefaults.setCompilerOptions(sharedCompilerOptions)

    // Ensure diagnostics are enabled (explicit beats implicit)
    const diagOpts = { noSemanticValidation: false, noSyntaxValidation: false, onlyVisible: false }
    ts.javascriptDefaults.setDiagnosticsOptions(diagOpts)
    ts.typescriptDefaults.setDiagnosticsOptions(diagOpts)

    // React module — named/default imports from 'react'
    ts.javascriptDefaults.addExtraLib(REACT_MODULE_TYPES, 'file:///node_modules/@types/react/index.d.ts')
    ts.typescriptDefaults.addExtraLib(REACT_MODULE_TYPES, 'file:///node_modules/@types/react/index.d.ts')
    // Global JSX namespace — script-scope file so IntrinsicElements is truly global
    ts.javascriptDefaults.addExtraLib(REACT_JSX_GLOBALS, 'file:///node_modules/@types/react/jsx-globals.d.ts')
    ts.typescriptDefaults.addExtraLib(REACT_JSX_GLOBALS, 'file:///node_modules/@types/react/jsx-globals.d.ts')

    // ── Tailwind CSS completions ───────────────────────────────────────────────
    // Trigger in className / cn / clsx / cva contexts in JSX and TSX files.
    const twProvider = (lang) => monaco.languages.registerCompletionItemProvider(lang, {
      triggerCharacters: ['"', "'", '`', ' ', '-'],
      async provideCompletionItems(model, position) {
        // Only for .jsx / .tsx models (URI ends with those extensions)
        const uri = model.uri.path
        if (!uri.endsWith('.jsx') && !uri.endsWith('.tsx')) return null

        const line   = model.getLineContent(position.lineNumber)
        const before = line.slice(0, position.column - 1)

        // Must be inside an unclosed string AND line has a class-like attribute or helper
        const inString = /['"`][^'"`]*$/.test(before)
        if (!inString) return null
        const hasClass = /\bclass(?:Name)?\b|\bcn\s*[({]|\bclsx\s*[({]|\bcva\s*[({]|\btw\s*[`(]/.test(line)
        if (!hasClass) return null

        const twClasses = await getTwClasses()
        const word  = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
          startColumn: word.startColumn,        endColumn:   word.endColumn,
        }
        const prefix = word.word
        const matches = prefix
          ? twClasses.filter(c => c.startsWith(prefix))
          : twClasses

        return {
          suggestions: matches.map(cls => ({
            label: cls,
            kind: monaco.languages.CompletionItemKind.Value,
            insertText: cls,
            range,
            sortText: cls,
          })),
          incomplete: false,
        }
      },
    })
    twProvider('javascript')
    twProvider('typescript')

    // ── Snippet / completion providers ───────────────────────────────────────
    registerAllProviders(monaco)

    // ── User plugins ──────────────────────────────────────────────────────────
    activatePlugins(monaco, editor)

    // Init vim if already enabled when editor mounts (use ref to avoid stale closure)
    if (vimModeRef.current && statusbarRef.current && !vimRef.current) {
      vimRef.current = initVimMode(editor, statusbarRef.current)
    }

    onEditorMount?.(editor, monaco)
  }, [onEditorMount, onSave])

  return (
    <div className={`editor-wrap${vimMode ? ' vim-active' : ''}`}>
      <MonacoEditor
        height="100%"
        wrapperProps={{ className: 'monaco-wrapper' }}
        path={modelPath}
        language={monacoLang}
        defaultValue={value}
        onChange={onChange}
        theme="vs-dark"
        options={{
          // ── Tipografía ──────────────────────────────────────────────────────
          fontSize: 14,
          fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
          fontLigatures: true,
          letterSpacing: 0,
          lineHeight: 22,

          // ── Layout ──────────────────────────────────────────────────────────
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          lineNumbersMinChars: 3,
          renderLineHighlight: 'line',
          wordWrap: 'on',
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
          folding: true,
          foldingStrategy: 'indentation',
          showFoldingControls: 'mouseover',
          glyphMargin: true,          // necesario para markers de error en gutter
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,

          // ── Cursor (al estilo nvim) ──────────────────────────────────────────
          cursorStyle: vimMode ? 'block' : 'line',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          cursorWidth: 2,

          // ── Scroll ──────────────────────────────────────────────────────────
          smoothScrolling: true,
          scrollbar: {
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6,
            useShadows: false,
          },

          // ── Indentación ─────────────────────────────────────────────────────
          tabSize: 2,
          insertSpaces: true,
          autoIndent: 'full',
          detectIndentation: true,

          // ── Brackets / pares ────────────────────────────────────────────────
          bracketPairColorization: { enabled: true },
          autoClosingBrackets: 'always',
          autoClosingQuotes: 'always',
          autoSurround: 'languageDefined',
          matchBrackets: 'always',

          // ── Completado (al estilo nvim-cmp) ─────────────────────────────────
          quickSuggestions: { other: true, comments: false, strings: true },
          quickSuggestionsDelay: 80,
          suggestOnTriggerCharacters: true,
          wordBasedSuggestions: 'off',         // sin ruido de palabras aleatorias
          tabCompletion: 'on',                 // Tab confirma sugerencia
          acceptSuggestionOnEnter: 'on',
          acceptSuggestionOnCommitCharacter: true,
          inlineSuggest: { enabled: true },    // ghost text al estilo cmp preview
          suggest: {
            showSnippets: true,
            showKeywords: true,
            showClasses: true,
            showFunctions: true,
            showVariables: true,
            showMethods: true,
            showProperties: true,
            showModules: true,
            showConstructors: true,
            showFields: true,
            showInterfaces: true,
            showEnums: true,
            showTypeParameters: true,
            localityBonus: true,
            insertMode: 'replace',             // reemplaza la palabra entera
            filterGraceful: true,
            preview: true,                     // preview inline del item seleccionado
            previewMode: 'prefix',
          },

          // ── Hints / firmas ──────────────────────────────────────────────────
          parameterHints: { enabled: true, cycle: true },
          hover: { enabled: true, delay: 300, sticky: true },

          // ── Formato ─────────────────────────────────────────────────────────
          formatOnPaste: true,
          formatOnType: false,

          // ── Otros ───────────────────────────────────────────────────────────
          renderWhitespace: 'none',
          guides: { indentation: true, bracketPairs: true },
          occurrencesHighlight: 'singleFile',
          selectionHighlight: true,
          codeLens: false,
          lightbulb: { enabled: 'off' },
        }}
        onMount={handleMount}
      />
      <div ref={statusbarRef} className="vim-statusbar" />
    </div>
  )
}
