import React, { useState, useRef, useEffect } from 'react'
import ThemeSelector from './ThemeSelector'
import './TitleBar.css'

function useClickOutside(ref, onClose) {
  useEffect(() => {
    const handle = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [ref, onClose])
}

const LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', abbr: 'JS',  cls: 'lang-js' },
  { id: 'typescript', label: 'TypeScript', abbr: 'TS',  cls: 'lang-ts' },
  { id: 'jsx',        label: 'JSX',        abbr: 'JSX', cls: 'lang-jsx' },
  { id: 'tsx',        label: 'TSX',        abbr: 'TSX', cls: 'lang-tsx' },
  { id: 'python',     label: 'Python',     abbr: 'PY',  cls: 'lang-py' },
]

function LangDropdown({ language, onSelect }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useClickOutside(ref, () => setOpen(false))
  const cur = LANGUAGES.find(l => l.id === language) ?? LANGUAGES[0]
  return (
    <div ref={ref} className="lang-dropdown">
      <button
        className={`lang-toggle ${cur.cls}`}
        onClick={() => setOpen(o => !o)}
        title="Cambiar lenguaje"
      >
        {cur.abbr}
        <svg width="7" height="4" viewBox="0 0 7 4" fill="currentColor" style={{ opacity: 0.6 }}>
          <path d="M0 0l3.5 4L7 0z" />
        </svg>
      </button>
      {open && (
        <div className="lang-popup">
          {LANGUAGES.map(l => (
            <button
              key={l.id}
              className={`lang-option${l.id === language ? ' lang-option-active' : ''}`}
              onClick={() => { onSelect(l.id); setOpen(false) }}
            >
              <span className={`lang-badge ${l.cls}`}>{l.abbr}</span>
              <span>{l.label}</span>
              {l.id === language && <span className="lang-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function FileMenu({ onNew, onNewTab, onOpen, onSave, onSaveAs, onCloseTab, onOpenPluginsDir }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useClickOutside(ref, () => setOpen(false))
  const run = (fn) => () => { fn?.(); setOpen(false) }

  const items = [
    { label: 'Nuevo archivo',  shortcut: 'Ctrl+N', onClick: run(onNew) },
    { label: 'Nueva pestaña',  shortcut: 'Ctrl+T', onClick: run(onNewTab) },
    null,
    { label: 'Abrir…',         shortcut: 'Ctrl+O', onClick: run(onOpen) },
    null,
    { label: 'Guardar',        shortcut: 'Ctrl+S', onClick: run(onSave) },
    { label: 'Guardar como…',                       onClick: run(onSaveAs) },
    null,
    { label: 'Cerrar pestaña', shortcut: 'Ctrl+W', onClick: run(onCloseTab) },
    null,
    { label: 'Carpeta de plugins…', onClick: run(onOpenPluginsDir) },
  ]

  return (
    <div ref={ref} className="file-menu">
      <button
        className={`file-menu-btn${open ? ' file-menu-btn-open' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        Archivo
      </button>
      {open && (
        <div className="file-menu-popup">
          {items.map((item, i) =>
            item === null ? (
              <div key={i} className="menu-sep" />
            ) : (
              <button key={i} className="menu-item" onClick={item.onClick}>
                <span className="menu-item-label">{item.label}</span>
                {item.shortcut && <span className="menu-item-shortcut">{item.shortcut}</span>}
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

// ── Layout selector ──────────────────────────────────────────────────────────
// Each icon is two rectangles representing editor (E) and output (O) panels.
const LAYOUTS = [
  {
    id: 'row',
    title: 'Editor izquierda · Output derecha',
    icon: (
      <svg width="18" height="14" viewBox="0 0 18 14" fill="currentColor">
        <rect x="0" y="0" width="10" height="14" rx="1.5" opacity="0.9" />
        <rect x="12" y="0" width="6"  height="14" rx="1.5" opacity="0.5" />
      </svg>
    ),
  },
  {
    id: 'row-reverse',
    title: 'Output izquierda · Editor derecha',
    icon: (
      <svg width="18" height="14" viewBox="0 0 18 14" fill="currentColor">
        <rect x="0"  y="0" width="6"  height="14" rx="1.5" opacity="0.5" />
        <rect x="8"  y="0" width="10" height="14" rx="1.5" opacity="0.9" />
      </svg>
    ),
  },
  {
    id: 'col',
    title: 'Editor arriba · Output abajo',
    icon: (
      <svg width="18" height="14" viewBox="0 0 18 14" fill="currentColor">
        <rect x="0" y="0"  width="18" height="8"  rx="1.5" opacity="0.9" />
        <rect x="0" y="10" width="18" height="4"  rx="1.5" opacity="0.5" />
      </svg>
    ),
  },
  {
    id: 'col-reverse',
    title: 'Output arriba · Editor abajo',
    icon: (
      <svg width="18" height="14" viewBox="0 0 18 14" fill="currentColor">
        <rect x="0" y="0"  width="18" height="4"  rx="1.5" opacity="0.5" />
        <rect x="0" y="6"  width="18" height="8"  rx="1.5" opacity="0.9" />
      </svg>
    ),
  },
]

function LayoutSelector({ layout, onLayoutChange }) {
  return (
    <div className="layout-selector">
      {LAYOUTS.map(l => (
        <button
          key={l.id}
          className={`layout-btn${layout === l.id ? ' layout-btn-active' : ''}`}
          title={l.title}
          onClick={() => onLayoutChange(l.id)}
        >
          {l.icon}
        </button>
      ))}
    </div>
  )
}

function VimToggle({ active, onToggle }) {
  return (
    <button
      className={`vim-toggle${active ? ' vim-toggle-active' : ''}`}
      onClick={onToggle}
      title={active ? 'Desactivar modo Vim' : 'Activar modo Vim'}
    >
      VIM
    </button>
  )
}

export default function TitleBar({
  fileName, isDirty, language, currentTheme, layout, vimMode,
  onNew, onNewTab, onOpen, onSave, onSaveAs, onCloseTab, onSetLanguage, onThemeChange, onLayoutChange, onToggleVim,
}) {
  return (
    <div className="titlebar">
      <span className="titlebar-logo">XP</span>

      <FileMenu
        onNew={onNew}
        onNewTab={onNewTab}
        onOpen={onOpen}
        onSave={onSave}
        onSaveAs={onSaveAs}
        onCloseTab={onCloseTab}
        onOpenPluginsDir={() => window.xp.openPluginsDir()}
      />

      <div className="titlebar-sep" />

      <LangDropdown language={language} onSelect={onSetLanguage} />

      <div className="titlebar-sep" />

      <ThemeSelector currentTheme={currentTheme} onThemeChange={onThemeChange} />

      <div className="titlebar-sep" />

      <LayoutSelector layout={layout} onLayoutChange={onLayoutChange} />

      <div className="titlebar-sep" />

      <VimToggle active={vimMode} onToggle={onToggleVim} />

      <div className="titlebar-drag">
        <span className="titlebar-filename">
          {fileName}
          {isDirty && <span className="titlebar-dirty" title="Sin guardar" />}
        </span>
      </div>

      <div className="titlebar-controls">
        <button className="wm-btn wm-minimize" onClick={() => window.xp.minimize()} title="Minimizar" />
        <button className="wm-btn wm-maximize" onClick={() => window.xp.maximize()} title="Maximizar" />
        <button className="wm-btn wm-close"    onClick={() => window.xp.close()}    title="Cerrar" />
      </div>
    </div>
  )
}
