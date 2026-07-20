import React, { useState, useRef, useEffect } from 'react'
import { THEMES } from '../themes'
import './ThemeSelector.css'

export default function ThemeSelector({ currentTheme, onThemeChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const theme = THEMES[currentTheme]

  return (
    <div className="theme-selector" ref={ref}>
      <button
        className="theme-btn"
        onClick={() => setOpen(o => !o)}
        title="Cambiar tema"
      >
        <span className="theme-swatch" style={{ background: theme?.swatch }} />
        <span className="theme-label">{theme?.label ?? currentTheme}</span>
        <span className="theme-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="theme-dropdown">
          {Object.entries(THEMES).map(([id, t]) => (
            <button
              key={id}
              className={`theme-option${id === currentTheme ? ' theme-option-active' : ''}`}
              onClick={() => { onThemeChange(id); setOpen(false) }}
            >
              <span className="theme-swatch" style={{ background: t.swatch }} />
              {t.label}
              {id === currentTheme && <span className="theme-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
