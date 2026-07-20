import React, { useRef, useEffect } from 'react'
import './PreviewPane.css'
import reactBundle from '../assets/react-bundle.js'
import tailwindBundle from '../assets/tailwind-bundle.js'

// Data-URI shims that re-export from the globals the React IIFE sets up.
// Referenced by the import map so bare specifiers in the user's ESM resolve
// without any network request.
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

function buildSrcdoc(transformedCode) {
  const twScript  = tailwindBundle ? `<script>${tailwindBundle}</script>` : ''
  const codeJson  = JSON.stringify(transformedCode)
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
const blob = new Blob([${codeJson}], {type:'text/javascript'})
const url = URL.createObjectURL(blob)
try {
  const mod = await import(url)
  URL.revokeObjectURL(url)
  const Comp = mod.default
  if (Comp && typeof Comp === 'function') {
    window.ReactDOM.createRoot(document.getElementById('root')).render(
      window.React.createElement(Comp)
    )
  } else {
    document.getElementById('root').innerHTML =
      '<p style="color:#888;padding:8px;font-size:12px;font-family:monospace">export default tu componente para previsualizarlo</p>'
  }
} catch(e) {
  URL.revokeObjectURL(url)
  document.getElementById('root').innerHTML =
    '<pre style="color:#d33;padding:12px;white-space:pre-wrap;font-size:12px;font-family:monospace">' + e.message + '</pre>'
}
</script>
</body>
</html>`
}

export default function PreviewPane({ transformedCode }) {
  const iframeRef = useRef(null)

  useEffect(() => {
    if (!iframeRef.current) return
    if (transformedCode == null) {
      iframeRef.current.srcdoc = ''
      return
    }
    iframeRef.current.srcdoc = buildSrcdoc(transformedCode)
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
