import { useState, useCallback, useEffect, useRef } from 'react'

export default function useCodeRunner(activeTab, updateTab) {
  const [runningTabId, setRunningTabId] = useState(null)
  const runningRef = useRef(false)
  const pendingRef = useRef(null)

  const executeCode = useCallback(async (tabId, src, lang) => {
    if (runningRef.current) return
    runningRef.current = true
    setRunningTabId(tabId)
    const start = performance.now()
    try {
      const result  = await window.xp.runCode(src, lang)
      const elapsed = performance.now() - start
      const entries = result.logs.map(e => ({ ...e, id: crypto.randomUUID() }))
      if (result.error) {
        entries.push({ id: crypto.randomUUID(), type: 'throw', values: [{ type: 'error', display: result.error.message }], stack: result.error.stack, line: result.error.line })
      } else if (result.result !== undefined) {
        entries.push({ id: crypto.randomUUID(), type: 'return', values: [result.result] })
      }
      updateTab(tabId, { output: entries, execTime: elapsed })
    } finally {
      runningRef.current = false
      setRunningTabId(null)
    }
  }, [updateTab])

  const transformJSX = useCallback(async (tabId, src, lang) => {
    try {
      const result = await window.xp.transformJSX(src, lang)
      if (result.error) {
        updateTab(tabId, {
          previewCode: null,
          output: [{ id: crypto.randomUUID(), type: 'throw', values: [{ type: 'error', display: result.error }], line: result.line ?? null }],
        })
      } else {
        updateTab(tabId, { previewCode: result.code, output: [] })
      }
    } catch (err) {
      updateTab(tabId, {
        previewCode: null,
        output: [{ id: crypto.randomUUID(), type: 'throw', values: [{ type: 'error', display: err.message }], line: null }],
      })
    }
  }, [updateTab])

  const { id: activeId, code: activeCode, language: activeLang } = activeTab ?? {}

  // Ref updated every render so Ctrl+Enter always has fresh values without deps
  const runNowRef = useRef(null)
  runNowRef.current = () => {
    clearTimeout(pendingRef.current)
    if (!activeId) return
    if (activeLang === 'jsx' || activeLang === 'tsx') transformJSX(activeId, activeCode, activeLang)
    else executeCode(activeId, activeCode, activeLang)
  }

  // Auto-run with debounce on code/language change
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

  return { runningTabId, executeCode, transformJSX, runNowRef }
}
