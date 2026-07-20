import React, { useEffect, useRef } from 'react'
import './Output.css'

const TYPE_COLORS = {
  log:    'var(--text)',
  info:   'var(--blue)',
  warn:   'var(--yellow)',
  error:  'var(--red)',
  throw:  'var(--red)',
  return: 'var(--green)',
  table:  'var(--text)',
}

const VALUE_COLORS = {
  string:    'var(--orange)',
  number:    'var(--blue)',
  boolean:   'var(--purple)',
  null:      'var(--text-muted)',
  undefined: 'var(--text-muted)',
  function:  'var(--purple)',
  error:     'var(--red)',
}

const ICON = {
  log: '', info: 'ℹ', warn: '⚠', error: '✕', throw: '✕', return: '←', table: '⊞',
}

function Value({ val }) {
  if (!val) return null
  return <span style={{ color: VALUE_COLORS[val.type] || 'var(--text)' }}>{val.display}</span>
}

function Entry({ entry, index, onHoverLine, onClearHover }) {
  const color    = TYPE_COLORS[entry.type] || 'var(--text)'
  const hasLine  = entry.line != null
  const icon     = ICON[entry.type] || ''

  return (
    <div
      className={`entry entry-${entry.type}${hasLine ? ' entry-hoverable' : ''}`}
      style={{ color }}
      onMouseEnter={hasLine ? () => onHoverLine(entry.line) : undefined}
      onMouseLeave={hasLine ? onClearHover : undefined}
    >
      <span className="entry-n">{index + 1}</span>
      {icon && <span className="entry-icon">{icon}</span>}
      <span className="entry-values">
        {entry.values.map((v, i) => (
          <React.Fragment key={i}>
            {i > 0 && ' '}
            <Value val={v} />
          </React.Fragment>
        ))}
      </span>
      {hasLine && <span className="entry-srcline">:{entry.line}</span>}
      {entry.stack && (
        <details className="entry-stack">
          <summary>stack trace</summary>
          <pre>{entry.stack}</pre>
        </details>
      )}
    </div>
  )
}

export default function Output({ entries, running, execTime, onHoverLine, onClearHover }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries])

  return (
    <div className="output">
      <div className="output-header">
        <span>Output</span>
        {running  && <span className="running-dot" />}
        {!running && execTime != null && <span className="exec-time">{execTime.toFixed(1)}ms</span>}
      </div>
      <div className="output-body">
        {entries.length === 0 && !running && (
          <div className="output-empty">Escribe código para ver los resultados</div>
        )}
        {entries.map((entry, i) => (
          <Entry
            key={entry.id ?? i}
            index={i}
            entry={entry}
            onHoverLine={onHoverLine}
            onClearHover={onClearHover}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
