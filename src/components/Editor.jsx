import React, { useCallback, useRef, useEffect } from 'react'
import MonacoEditor from '@monaco-editor/react'
import { initVimMode } from 'monaco-vim'
import TAILWIND_CLASSES from '../lib/tailwindClasses.js'
import { activatePlugins } from '../lib/pluginLoader.js'

const MONACO_LANG = { jsx: 'javascript', tsx: 'typescript' }
const MODEL_EXT  = { jsx: 'jsx', tsx: 'tsx', javascript: 'js', typescript: 'ts', python: 'py' }

// React module declaration — types for 'react' named/default imports
const REACT_MODULE_TYPES = `
declare module 'react/jsx-runtime' {
  export function jsx(type: any, props: any, key?: any): any
  export function jsxs(type: any, props: any, key?: any): any
  export const Fragment: symbol
}
declare module 'react/jsx-dev-runtime' {
  export function jsxDEV(type: any, props: any, key?: any, isStatic?: boolean, source?: any): any
  export function jsxs(type: any, props: any, key?: any): any
  export const Fragment: symbol
}
declare module 'react' {
  export type Key = string | number
  export type ReactNode = ReactElement | string | number | boolean | null | undefined | ReactNode[]
  export interface ReactElement<P = any> { type: any; props: P; key: Key | null }
  export type FC<P = {}> = FunctionComponent<P>
  export interface FunctionComponent<P = {}> {
    (props: P & { children?: ReactNode }): ReactElement | null
    displayName?: string
  }
  export type ComponentType<P = {}> = FunctionComponent<P>
  export interface Context<T> { Provider: FC<{ value: T; children?: ReactNode }>; Consumer: any; displayName?: string }
  export interface RefObject<T> { readonly current: T | null }
  export type MutableRefObject<T> = { current: T }
  export type Ref<T> = RefObject<T> | ((instance: T | null) => void) | null
  export type Dispatch<A> = (value: A) => void
  export type SetStateAction<S> = S | ((prevState: S) => S)
  export function useState<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>]
  export function useState<S = undefined>(): [S | undefined, Dispatch<SetStateAction<S | undefined>>]
  export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void
  export function useLayoutEffect(effect: () => void | (() => void), deps?: readonly any[]): void
  export function useRef<T>(initialValue: T): MutableRefObject<T>
  export function useRef<T>(initialValue: T | null): RefObject<T>
  export function useRef<T = undefined>(): MutableRefObject<T | undefined>
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly any[]): T
  export function useMemo<T>(factory: () => T, deps: readonly any[]): T
  export function useContext<T>(context: Context<T>): T
  export function useReducer<S, A>(reducer: (state: S, action: A) => S, initialState: S): [S, Dispatch<A>]
  export function useId(): string
  export function useTransition(): [boolean, (callback: () => void) => void]
  export function useDeferredValue<T>(value: T): T
  export function useImperativeHandle<T>(ref: Ref<T>, init: () => T, deps?: readonly any[]): void
  export function createContext<T>(defaultValue: T): Context<T>
  export function createRef<T>(): RefObject<T>
  export function memo<T extends ComponentType<any>>(Component: T): T
  export function forwardRef<T, P = {}>(render: (props: P, ref: Ref<T>) => ReactElement | null): FC<P & { ref?: Ref<T> }>
  export function createElement(type: any, props?: any, ...children: any[]): ReactElement
  export function isValidElement(object: any): object is ReactElement
  export const Fragment: unique symbol
  export const StrictMode: FC<{ children?: ReactNode }>
  export const Suspense: FC<{ children?: ReactNode; fallback?: ReactNode }>
  export function lazy<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>): T
  export const version: string
  const _default: {
    useState: typeof useState; useEffect: typeof useEffect; useRef: typeof useRef
    useCallback: typeof useCallback; useMemo: typeof useMemo; useContext: typeof useContext
    useReducer: typeof useReducer; useId: typeof useId; createContext: typeof createContext
    memo: typeof memo; forwardRef: typeof forwardRef; createElement: typeof createElement
    Fragment: typeof Fragment; StrictMode: typeof StrictMode; Suspense: typeof Suspense; version: string
  }
  export default _default
}
`

// Global JSX namespace — MUST be a pure script file (no module-level import/export)
// so every declaration here lands in the global scope.
// JSX.IntrinsicElements lists every valid tag → Monaco shows them in <tag> completions.
const REACT_JSX_GLOBALS = `
declare namespace JSX {
  interface Element {}
  interface ElementClass { render?(): any }
  interface IntrinsicAttributes { key?: string | number }
  type P = {
    children?: any; className?: string; style?: Record<string,any>; id?: string
    tabIndex?: number; role?: string; title?: string; hidden?: boolean
    'aria-label'?: string; 'aria-hidden'?: boolean|'true'|'false'
    onClick?: (e: any) => void; onDoubleClick?: (e: any) => void
    onMouseDown?: (e: any) => void; onMouseUp?: (e: any) => void
    onMouseEnter?: (e: any) => void; onMouseLeave?: (e: any) => void
    onPointerDown?: (e: any) => void; onPointerUp?: (e: any) => void
    onFocus?: (e: any) => void; onBlur?: (e: any) => void
    onKeyDown?: (e: any) => void; onKeyUp?: (e: any) => void; onKeyPress?: (e: any) => void
    ref?: any; key?: string | number; [k: string]: any
  }
  interface IntrinsicElements {
    div: P; span: P; p: P; main: P; nav: P; header: P; footer: P; body: P; html: P
    section: P; article: P; aside: P; figure: P; figcaption: P; hgroup: P; search: P; address: P
    h1: P; h2: P; h3: P; h4: P; h5: P; h6: P
    ul: P; ol: P; li: P; dl: P; dt: P; dd: P; menu: P
    a: P & { href?: string; target?: string; rel?: string; download?: any }
    button: P & { type?: 'button'|'submit'|'reset'; disabled?: boolean; form?: string }
    input: P & { type?: string; value?: any; defaultValue?: any; checked?: boolean
      defaultChecked?: boolean; placeholder?: string; disabled?: boolean; readOnly?: boolean
      name?: string; min?: any; max?: any; step?: any; maxLength?: number; autoComplete?: string
      autoFocus?: boolean; onChange?: (e: any) => void; onInput?: (e: any) => void }
    textarea: P & { value?: any; defaultValue?: any; placeholder?: string; disabled?: boolean
      readOnly?: boolean; rows?: number; cols?: number; name?: string; maxLength?: number
      onChange?: (e: any) => void }
    select: P & { value?: any; defaultValue?: any; disabled?: boolean
      multiple?: boolean; name?: string; onChange?: (e: any) => void }
    option: P & { value?: any; selected?: boolean; disabled?: boolean }
    optgroup: P & { label?: string; disabled?: boolean }
    form: P & { action?: string; method?: string; encType?: string
      onSubmit?: (e: any) => void; onReset?: (e: any) => void }
    label: P & { htmlFor?: string }
    fieldset: P & { disabled?: boolean; form?: string }
    legend: P; datalist: P; output: P
    progress: P & { value?: number; max?: number }
    meter: P & { value?: number; min?: number; max?: number; low?: number; high?: number; optimum?: number }
    table: P; thead: P; tbody: P; tfoot: P; tr: P; caption: P; colgroup: P
    th: P & { colSpan?: number; rowSpan?: number; scope?: string; abbr?: string }
    td: P & { colSpan?: number; rowSpan?: number; headers?: string }
    col: P & { span?: number }
    img: P & { src?: string; alt?: string; width?: number|string; height?: number|string
      loading?: 'lazy'|'eager'|'auto'; decoding?: 'auto'|'sync'|'async'; srcSet?: string; sizes?: string }
    picture: P; source: P & { src?: string; srcSet?: string; type?: string; media?: string; sizes?: string }
    audio: P & { src?: string; controls?: boolean; autoPlay?: boolean; loop?: boolean; muted?: boolean; preload?: string }
    video: P & { src?: string; controls?: boolean; autoPlay?: boolean; loop?: boolean
      muted?: boolean; width?: number|string; height?: number|string; poster?: string; preload?: string }
    track: P & { src?: string; kind?: string; label?: string; srcLang?: string; default?: boolean }
    canvas: P & { width?: number; height?: number }
    iframe: P & { src?: string; sandbox?: string; allow?: string; width?: number|string; height?: number|string; title?: string }
    embed: P & { src?: string; type?: string; width?: number|string; height?: number|string }
    object: P & { data?: string; type?: string; width?: number|string; height?: number|string }
    map: P & { name?: string }
    area: P & { href?: string; alt?: string; shape?: string; coords?: string; target?: string }
    pre: P; code: P; blockquote: P & { cite?: string }; cite: P; q: P & { cite?: string }
    strong: P; em: P; b: P; i: P; u: P; s: P; small: P; mark: P; del: P; ins: P
    sub: P; sup: P; abbr: P; dfn: P; var: P; samp: P; kbd: P
    time: P & { dateTime?: string }; data: P & { value?: string }
    bdi: P; bdo: P & { dir?: string }; ruby: P; rp: P; rt: P; wbr: P; br: P; hr: P
    details: P & { open?: boolean; onToggle?: (e: any) => void }
    summary: P
    dialog: P & { open?: boolean; onClose?: (e: any) => void; onCancel?: (e: any) => void }
    script: P & { src?: string; type?: string; async?: boolean; defer?: boolean; crossOrigin?: string }
    style: P & { type?: string; media?: string }
    link: P & { href?: string; rel?: string; type?: string; media?: string; crossOrigin?: string }
    meta: P & { name?: string; content?: string; charSet?: string; httpEquiv?: string }
    noscript: P; template: P; slot: P & { name?: string }
    portal: P; head: P; title: P
    // SVG
    svg: P & { xmlns?: string; viewBox?: string; width?: any; height?: any
      fill?: string; stroke?: string; strokeWidth?: any; strokeLinecap?: string; strokeLinejoin?: string }
    g: P & { fill?: string; stroke?: string; transform?: string; opacity?: any }
    path: P & { d?: string; fill?: string; stroke?: string; strokeWidth?: any
      fillRule?: 'nonzero'|'evenodd'; clipRule?: 'nonzero'|'evenodd'; opacity?: any }
    circle: P & { cx?: any; cy?: any; r?: any; fill?: string; stroke?: string; strokeWidth?: any }
    ellipse: P & { cx?: any; cy?: any; rx?: any; ry?: any; fill?: string; stroke?: string }
    rect: P & { x?: any; y?: any; width?: any; height?: any; rx?: any; ry?: any; fill?: string; stroke?: string }
    line: P & { x1?: any; y1?: any; x2?: any; y2?: any; stroke?: string; strokeWidth?: any }
    polyline: P & { points?: string; fill?: string; stroke?: string }
    polygon: P & { points?: string; fill?: string; stroke?: string }
    text: P & { x?: any; y?: any; fill?: string; fontSize?: any; textAnchor?: string; dominantBaseline?: string }
    tspan: P & { x?: any; y?: any; dy?: any; dx?: any }
    defs: P; use: P & { href?: string; x?: any; y?: any }
    symbol: P & { viewBox?: string; preserveAspectRatio?: string }
    clipPath: P & { clipPathUnits?: string }; mask: P; pattern: P
    linearGradient: P & { x1?: any; y1?: any; x2?: any; y2?: any; gradientUnits?: string; gradientTransform?: string }
    radialGradient: P & { cx?: any; cy?: any; r?: any; fx?: any; fy?: any; gradientUnits?: string }
    stop: P & { offset?: any; stopColor?: string; stopOpacity?: any }
    animate: P; animateTransform: P; animateMotion: P; set: P
    filter: P & { x?: any; y?: any; width?: any; height?: any; filterUnits?: string }
    feBlend: P; feColorMatrix: P; feComposite: P; feFlood: P & { floodColor?: string; floodOpacity?: any }
    feGaussianBlur: P & { in?: string; stdDeviation?: any }; feOffset: P & { dx?: any; dy?: any }
    feMerge: P; feMergeNode: P & { in?: string }
    image: P & { href?: string; x?: any; y?: any; width?: any; height?: any; preserveAspectRatio?: string }
    foreignObject: P & { x?: any; y?: any; width?: any; height?: any }
    title: P; desc: P; marker: P; textPath: P & { href?: string; startOffset?: any }
  }
}
`

export default function Editor({ path, value, language = 'javascript', onChange, onEditorMount, onSave, vimMode = false }) {
  const monacoLang = MONACO_LANG[language] ?? language
  // Uri with the right extension so the TS worker activates JSX intellisense
  const modelPath = `${path}.${MODEL_EXT[language] ?? language}`

  const editorRef    = useRef(null)
  const valueRef     = useRef(value)
  const vimRef       = useRef(null)
  const statusbarRef = useRef(null)
  valueRef.current = value

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

  // Activate / deactivate vim mode when the prop or editor changes
  useEffect(() => {
    const editor = editorRef.current
    if (!editor || !statusbarRef.current) return
    if (vimMode) {
      if (!vimRef.current) vimRef.current = initVimMode(editor, statusbarRef.current)
    } else {
      vimRef.current?.dispose()
      vimRef.current = null
    }
  }, [vimMode])

  // Cleanup on unmount
  useEffect(() => () => { vimRef.current?.dispose(); vimRef.current = null }, [])

  const handleMount = useCallback((editor, monaco) => {
    editorRef.current = editor
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => onSave?.())

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
    }

    ts.javascriptDefaults.setCompilerOptions(sharedCompilerOptions)
    ts.typescriptDefaults.setCompilerOptions(sharedCompilerOptions)

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
      provideCompletionItems(model, position) {
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

        const word  = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
          startColumn: word.startColumn,        endColumn:   word.endColumn,
        }
        const prefix = word.word
        const matches = prefix
          ? TAILWIND_CLASSES.filter(c => c.startsWith(prefix))
          : TAILWIND_CLASSES

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

    // ── User plugins ──────────────────────────────────────────────────────────
    activatePlugins(monaco, editor)

    // Init vim if already enabled when editor mounts
    if (vimMode && statusbarRef.current && !vimRef.current) {
      vimRef.current = initVimMode(editor, statusbarRef.current)
    }

    onEditorMount?.(editor, monaco)
  }, [onEditorMount, onSave, vimMode])

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
          fontSize: 14,
          fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
          fontLigatures: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          renderLineHighlight: 'line',
          tabSize: 2,
          wordWrap: 'on',
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          bracketPairColorization: { enabled: true },
          suggest: { showSnippets: true, showKeywords: true },
          quickSuggestions: { other: true, comments: false, strings: false },
          acceptSuggestionOnEnter: 'smart',
        }}
        onMount={handleMount}
      />
      <div ref={statusbarRef} className="vim-statusbar" />
    </div>
  )
}
