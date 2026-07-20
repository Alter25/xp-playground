import React, { useRef, useEffect } from 'react'
import './TabBar.css'

function Tab({ tab, isActive, isRunning, onTabClick, onTabClose }) {
  const ref = useRef(null)

  // Scroll para que el tab activo sea visible
  useEffect(() => {
    if (isActive) ref.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [isActive])

  const LANG_CLASS = { typescript: 'tab-lang-ts', python: 'tab-lang-py', javascript: 'tab-lang-js', jsx: 'tab-lang-jsx', tsx: 'tab-lang-tsx' }
  const LANG_LABEL = { typescript: 'TS', python: 'PY', javascript: 'JS', jsx: 'JSX', tsx: 'TSX' }

  return (
    <div
      ref={ref}
      className={`tab${isActive ? ' tab-active' : ''}${isRunning ? ' tab-running' : ''}`}
      onClick={() => onTabClick(tab.id)}
      title={tab.filePath || tab.fileName}
    >
      <span className={`tab-lang ${LANG_CLASS[tab.language] ?? 'tab-lang-js'}`}>
        {LANG_LABEL[tab.language] ?? 'JS'}
      </span>
      <span className="tab-name">{tab.fileName}</span>
      {tab.isDirty && <span className="tab-dot" title="Sin guardar" />}
      <button
        className="tab-close"
        onClick={(e) => { e.stopPropagation(); onTabClose(tab.id) }}
        title="Cerrar (Ctrl+W)"
      >
        ×
      </button>
    </div>
  )
}

export default function TabBar({ tabs, activeTabId, runningTabId, onTabClick, onTabClose, onNewTab }) {
  return (
    <div className="tabbar">
      <div className="tabbar-list">
        {tabs.map(tab => (
          <Tab
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            isRunning={tab.id === runningTabId}
            onTabClick={onTabClick}
            onTabClose={onTabClose}
          />
        ))}
        <button className="tabbar-add" onClick={() => onNewTab()} title="Nueva pestaña (Ctrl+T)">
          +
        </button>
      </div>
    </div>
  )
}
