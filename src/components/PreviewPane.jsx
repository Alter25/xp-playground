import React, { useRef, useEffect } from 'react'
import './PreviewPane.css'
import reactBundle from '../assets/react-bundle.js'
import tailwindBundle from '../assets/tailwind-bundle.js'

const REACT_SHIM =
  "data:text/javascript,const R=globalThis.React;" +
  "export default R;" +
  "export const {useState,useEffect,useRef,useCallback,useMemo,useContext," +
  "createContext,Fragment,Children,cloneElement,createElement,forwardRef," +
  "memo,useReducer,useId,useDeferredValue,useLayoutEffect,useImperativeHandle," +
  "useSyncExternalStore,useTransition,startTransition,lazy,Suspense,StrictMode," +
  "Component,PureComponent,isValidElement,createRef,version}=R;"

const REACT_DOM_SHIM =
  "data:text/javascript,const RD=globalThis.ReactDOM;" +
  "export default RD;" +
  "export const {createRoot,hydrateRoot}=RD;"

const JSX_RT_SHIM =
  "data:text/javascript,const J=globalThis['react/jsx-runtime'];" +
  "export const {jsx,jsxs,Fragment}=J;export default J;"

const IMPORT_MAP = JSON.stringify({
  imports: {
    "react":                 REACT_SHIM,
    "react-dom":             REACT_DOM_SHIM,
    "react-dom/client":      REACT_DOM_SHIM,
    "react/jsx-runtime":     JSX_RT_SHIM,
    "react/jsx-dev-runtime": JSX_RT_SHIM,
  },
})

// El srcdoc se construye una sola vez al cargar el módulo.
// React y Tailwind (~700 KB) se inyectan aquí; los cambios de código llegan
// después por postMessage sin tener que reparsear estos scripts en cada keystroke.
const INIT_SRCDOC = (() => {
  const twScript = tailwindBundle ? `<script>${tailwindBundle}</script>` : ''
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script type="importmap">${IMPORT_MAP}</script>
${twScript}
<style>
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:#fff;color:#111}
body{padding:1rem;overflow:auto;font-family:system-ui,sans-serif;font-size:14px}
</style>
</head>
<body>
<div id="root"></div>
<script>${reactBundle}</script>
<script type="module">
let _root = null

window.addEventListener('message', async (e) => {
  const code = e.data
  if (typeof code !== 'string' && code !== null) return

  // Desmontar componente anterior
  if (_root) { try { _root.unmount() } catch {} _root = null }

  if (code === null) {
    document.getElementById('root').innerHTML = ''
    return
  }

  const blob = new Blob([code], { type: 'text/javascript' })
  const url  = URL.createObjectURL(blob)
  try {
    const mod  = await import(url)
    URL.revokeObjectURL(url)
    const Comp = mod.default
    if (Comp && typeof Comp === 'function') {
      _root = window.ReactDOM.createRoot(document.getElementById('root'))
      _root.render(window.React.createElement(Comp))
    } else {
      document.getElementById('root').innerHTML =
        '<p style="color:#888;padding:8px;font-size:12px;font-family:monospace">export default tu componente para previsualizarlo</p>'
    }
  } catch (err) {
    URL.revokeObjectURL(url)
    document.getElementById('root').innerHTML =
      '<pre style="color:#d33;padding:12px;white-space:pre-wrap;font-size:12px;font-family:monospace">' + err.message + '</pre>'
  }
})

// Avisar al padre que el iframe está listo para recibir código
window.parent.postMessage('__xp_ready__', '*')
</script>
</body>
</html>`
})()

export default function PreviewPane({ transformedCode }) {
  const iframeRef = useRef(null)
  const readyRef  = useRef(false)
  // Siempre apunta al código más reciente, sin causar re-renders
  const codeRef   = useRef(transformedCode)
  codeRef.current = transformedCode

  // Inicializar el iframe una sola vez: inyectar React + Tailwind + el listener
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    const onMsg = (e) => {
      if (e.source !== iframe.contentWindow) return
      if (e.data !== '__xp_ready__') return
      readyRef.current = true
      // Enviar el código que ya esté disponible en el momento del ready
      iframe.contentWindow.postMessage(codeRef.current ?? null, '*')
    }

    window.addEventListener('message', onMsg)
    readyRef.current = false
    iframe.srcdoc = INIT_SRCDOC

    return () => window.removeEventListener('message', onMsg)
  }, [])

  // Actualizar el componente cuando cambia el código transformado
  useEffect(() => {
    if (!readyRef.current) return // el ready handler ya enviará codeRef.current
    iframeRef.current?.contentWindow?.postMessage(transformedCode ?? null, '*')
  }, [transformedCode])

  return (
    <div className="preview-pane">
      <div className="preview-header">
        <span>Preview</span>
      </div>
      <iframe
        ref={iframeRef}
        className="preview-iframe"
        title="Preview"
        sandbox="allow-scripts allow-forms allow-modals"
      />
    </div>
  )
}
