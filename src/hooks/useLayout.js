import { useState, useCallback, useRef } from 'react'

export default function useLayout() {
  const [layout,        setLayout]        = useState('row')
  const [outputSize,    setOutputSize]    = useState(400)
  const [consoleHeight, setConsoleHeight] = useState(170)

  const outputSizeRef    = useRef(400)
  const consoleHeightRef = useRef(170)

  const handleLayoutChange = useCallback((newLayout) => {
    const wasVert  = layout === 'col' || layout === 'col-reverse'
    const willVert = newLayout === 'col' || newLayout === 'col-reverse'
    if (wasVert !== willVert) {
      const def = willVert ? 280 : 400
      outputSizeRef.current = def
      setOutputSize(def)
    }
    setLayout(newLayout)
  }, [layout])

  const onMainDividerDown = useCallback((e) => {
    e.preventDefault()
    const isVert = layout === 'col' || layout === 'col-reverse'
    const start  = isVert ? e.clientY : e.clientX
    const startS = outputSizeRef.current
    const onMove = (e) => {
      const cur   = isVert ? e.clientY : e.clientX
      const delta = layout === 'row' || layout === 'col'
        ? start - cur
        : cur - start
      const max   = isVert ? window.innerHeight - 100 : window.innerWidth - 240
      outputSizeRef.current = Math.max(120, Math.min(startS + delta, max))
      setOutputSize(outputSizeRef.current)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [layout])

  const onConsoleDividerDown = useCallback((e) => {
    e.preventDefault()
    const startY = e.clientY
    const startH = consoleHeightRef.current
    const onMove = (e) => {
      const h = Math.max(60, Math.min(startH + (e.clientY - startY), window.innerHeight - 160))
      consoleHeightRef.current = h
      setConsoleHeight(h)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  const isVertical   = layout === 'col' || layout === 'col-reverse'
  const outputStyle  = isVertical ? { width: '100%', height: outputSize } : { width: outputSize }
  const mainDivClass = isVertical ? 'divider-h' : 'divider-v'

  return {
    layout, outputSize, consoleHeight,
    isVertical, outputStyle, mainDivClass,
    handleLayoutChange, onMainDividerDown, onConsoleDividerDown,
  }
}
