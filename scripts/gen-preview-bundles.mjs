#!/usr/bin/env node
// Generates static JS string exports for React and Tailwind bundles.
// Run before vite build so PreviewPane.jsx can import them as plain modules —
// no IPC, no runtime esbuild, no react/react-dom in packaged node_modules.

import { buildSync } from 'esbuild'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const _require   = createRequire(import.meta.url)
const ROOT       = path.join(__dirname, '..')
const ASSETS     = path.join(ROOT, 'src', 'assets')

mkdirSync(ASSETS, { recursive: true })

// ── React IIFE ────────────────────────────────────────────────────────────────
process.stdout.write('gen-preview-bundles: React… ')
const reactResult = buildSync({
  stdin: {
    contents: `
      import * as React from 'react';
      import * as ReactDOMClient from 'react-dom/client';
      import * as ReactJSXRuntime from 'react/jsx-runtime';
      globalThis.React = React;
      globalThis.ReactDOM = ReactDOMClient;
      globalThis['react/jsx-runtime'] = ReactJSXRuntime;
    `,
    resolveDir: ROOT,
  },
  bundle: true,
  format: 'iife',
  platform: 'browser',
  minify: true,
  write: false,
  logLevel: 'silent',
})
const reactCode = reactResult.outputFiles[0].text
writeFileSync(
  path.join(ASSETS, 'react-bundle.js'),
  `const reactBundle = ${JSON.stringify(reactCode)}\nexport default reactBundle\n`
)
process.stdout.write('ok\n')

// ── Tailwind IIFE ─────────────────────────────────────────────────────────────
process.stdout.write('gen-preview-bundles: Tailwind… ')
let tailwindCode = ''
try {
  let bundlePath
  try {
    bundlePath = _require.resolve('@tailwindcss/browser')
  } catch {
    const pkgRoot = path.dirname(_require.resolve('@tailwindcss/browser/package.json'))
    bundlePath    = path.join(pkgRoot, 'dist', 'index.global.js')
  }
  tailwindCode = readFileSync(bundlePath, 'utf-8')
  process.stdout.write('ok\n')
} catch {
  process.stdout.write('not found, preview runs without Tailwind\n')
}
writeFileSync(
  path.join(ASSETS, 'tailwind-bundle.js'),
  `const tailwindBundle = ${JSON.stringify(tailwindCode)}\nexport default tailwindBundle\n`
)

console.log('gen-preview-bundles: done → src/assets/')
