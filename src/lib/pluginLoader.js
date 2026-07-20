// Loads user plugins from ~/.config/xp/plugins/ via IPC.
// Each plugin is an ES module that exports a default object with an activate() function.

let _activated = false
const _disposables = []

export async function activatePlugins(monaco, editor) {
  if (_activated) return
  _activated = true

  let plugins
  try {
    plugins = await window.xp.getPlugins()
  } catch {
    return
  }

  for (const { name, code, error } of plugins) {
    if (error || !code) {
      console.warn(`[xp] Plugin ${name}: ${error}`)
      continue
    }
    try {
      const blob = new Blob([code], { type: 'text/javascript' })
      const url  = URL.createObjectURL(blob)
      const mod  = await import(url)
      URL.revokeObjectURL(url)

      const plugin = mod.default ?? mod
      if (typeof plugin?.activate !== 'function') continue

      plugin.activate({
        monaco,
        editor,
        onDispose: (fn) => _disposables.push(fn),
      })
      console.log(`[xp] Plugin activated: ${plugin.name ?? name}`)
    } catch (e) {
      console.warn(`[xp] Plugin ${name} error:`, e.message)
    }
  }
}

export function disposePlugins() {
  for (const fn of _disposables) { try { fn() } catch {} }
  _disposables.length = 0
  _activated = false
}
