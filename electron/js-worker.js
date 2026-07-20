import { workerData, parentPort } from 'node:worker_threads'
import vm from 'node:vm'

const VM_FILENAME = 'playground.js'

function vmLine(stack) {
  const m = (stack || '').match(/playground\.js:(\d+)/)
  return m ? parseInt(m[1], 10) : null
}

function serialize(val) {
  if (val === null)      return { type: 'null',      display: 'null' }
  if (val === undefined) return { type: 'undefined', display: 'undefined' }
  if (typeof val === 'function') return { type: 'function', display: `[Function: ${val.name || 'anonymous'}]` }
  if (typeof val === 'symbol')   return { type: 'symbol',   display: val.toString() }
  if (typeof val === 'bigint')   return { type: 'bigint',   display: `${val}n` }
  if (typeof val === 'number')   return { type: 'number',   display: String(val) }
  if (typeof val === 'boolean')  return { type: 'boolean',  display: String(val) }
  if (typeof val === 'string')   return { type: 'string',   display: JSON.stringify(val) }
  if (val instanceof Error)      return { type: 'error',    display: `${val.name}: ${val.message}` }
  try { return { type: typeof val, display: JSON.stringify(val, null, 2) } }
  catch { return { type: typeof val, display: String(val) } }
};

(async () => {
  const { code } = workerData
  const logs = []

  const sandbox = {
    console: {
      log:   (...args) => { const line = vmLine(new Error().stack); logs.push({ type: 'log',   values: args.map(serialize), line }) },
      error: (...args) => { const line = vmLine(new Error().stack); logs.push({ type: 'error', values: args.map(serialize), line }) },
      warn:  (...args) => { const line = vmLine(new Error().stack); logs.push({ type: 'warn',  values: args.map(serialize), line }) },
      info:  (...args) => { const line = vmLine(new Error().stack); logs.push({ type: 'info',  values: args.map(serialize), line }) },
      table: (data)    => { const line = vmLine(new Error().stack); logs.push({ type: 'table', values: [serialize(data)], line }) },
    },
    setTimeout, clearTimeout, setInterval, clearInterval,
    Promise, JSON, Math, Date,
    Array, Object, String, Number, Boolean, RegExp, Map, Set,
    Error, TypeError, RangeError,
    fetch: globalThis.fetch,
  }

  vm.createContext(sandbox)

  try {
    const wrapped = `(async () => {\n${code}\n})()`
    const script  = new vm.Script(wrapped, { filename: VM_FILENAME })
    const result  = await script.runInContext(sandbox, { timeout: 10000 })
    parentPort.postMessage({
      logs,
      result: result !== undefined ? serialize(result) : undefined,
      error: null,
    })
  } catch (err) {
    const rawLine = vmLine(err.stack)
    const line    = rawLine != null ? rawLine - 1 : null
    parentPort.postMessage({
      logs,
      result: undefined,
      error: { message: err.message, stack: err.stack, line },
    })
  }
})()
