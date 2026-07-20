import { useState, useCallback, useMemo } from 'react'

const STORAGE_KEY = 'xp-tabs'

export const createTab = (overrides = {}) => ({
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

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw)
    if (!saved?.tabs?.length) return null
    // Restore runtime fields that aren't persisted
    return {
      tabs: saved.tabs.map(t => ({ ...t, output: [], execTime: null, previewCode: null })),
      activeTabId: saved.activeTabId,
    }
  } catch { return null }
}

function persistTabs(tabs, activeTabId) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      activeTabId,
      tabs: tabs.map(({ id, fileName, filePath, code, language, isDirty }) =>
        ({ id, fileName, filePath, code, language, isDirty })
      ),
    }))
  } catch {}
}

export default function useTabs(defaultCode, defaultLanguage, defaultFileName) {
  const fallbackTab = useMemo(
    () => createTab({ code: defaultCode, language: defaultLanguage, fileName: defaultFileName }),
    []
  )

  const saved = useMemo(loadSaved, [])

  const [tabs, setTabs] = useState(() => saved?.tabs ?? [fallbackTab])
  const [activeTabId, setActiveTabIdRaw] = useState(
    () => saved?.activeTabId ?? fallbackTab.id
  )

  const persist = useCallback((nextTabs, nextActiveId) => {
    persistTabs(nextTabs, nextActiveId)
  }, [])

  const setActiveTabId = useCallback((id) => {
    setActiveTabIdRaw(id)
    setTabs(prev => { persist(prev, id); return prev })
  }, [persist])

  const updateTab = useCallback((id, updates) => {
    setTabs(prev => {
      const next = prev.map(t => t.id === id ? { ...t, ...updates } : t)
      // Only persist non-ephemeral updates (skip output/execTime/previewCode)
      const hasCodeChange = 'code' in updates || 'language' in updates ||
        'fileName' in updates || 'filePath' in updates || 'isDirty' in updates
      if (hasCodeChange) persist(next, activeTabId)
      return next
    })
  }, [activeTabId, persist])

  const addTab = useCallback((overrides = {}) => {
    const tab = createTab(overrides)
    setTabs(prev => {
      const next = [...prev, tab]
      persist(next, tab.id)
      return next
    })
    setActiveTabIdRaw(tab.id)
    return tab
  }, [persist])

  const closeTab = useCallback((id) => {
    setTabs(prev => {
      if (prev.length === 1) return prev
      const next = prev.filter(t => t.id !== id)
      const newActiveId = id === activeTabId
        ? next[Math.min(prev.findIndex(t => t.id === id), next.length - 1)].id
        : activeTabId
      if (id === activeTabId) setActiveTabIdRaw(newActiveId)
      persist(next, newActiveId)
      return next
    })
  }, [activeTabId, persist])

  const activeTab = useMemo(
    () => tabs.find(t => t.id === activeTabId) ?? tabs[0],
    [tabs, activeTabId]
  )

  // Replace a tab in-place with a new tab (new id = new Monaco model)
  const replaceTab = useCallback((oldId, overrides = {}) => {
    const tab = createTab(overrides)
    setTabs(prev => {
      const next = prev.map(t => t.id === oldId ? tab : t)
      persist(next, tab.id)
      return next
    })
    setActiveTabIdRaw(tab.id)
    return tab
  }, [persist])

  return {
    tabs, activeTab, activeTabId,
    setActiveTabId, updateTab, addTab, closeTab, replaceTab,
  }
}
