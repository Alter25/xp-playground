---
tags: [xp, plugins, manual]
---

# XP Plugin System

Los plugins de XP son archivos JavaScript que extienden el editor Monaco con nuevas funcionalidades: autocompletado, hover info, snippets, validación personalizada, y más.

## Dónde van los plugins

Coloca tus plugins en:

```
~/.config/xp/plugins/
```

Puedes abrir esta carpeta directamente desde la app: **Archivo → Carpeta de plugins…**

Cada archivo `.js` en esa carpeta se carga automáticamente al iniciar la app.

---

## Estructura de un plugin

Un plugin es un módulo ES que exporta un objeto `default` con la forma:

```js
export default {
  name: 'nombre-del-plugin',     // string — identificador único
  version: '1.0.0',              // string — semver
  description: 'Descripción',   // string — texto libre

  activate({ monaco, editor, onDispose }) {
    // Aquí registras tus extensiones de Monaco.
    // monaco  → la instancia del namespace de Monaco (tipos, lenguajes, etc.)
    // editor  → la instancia del editor activa en el momento del montaje
    // onDispose(fn) → registra un callback de limpieza (se llama si el plugin se desactiva)
  },
}
```

> [!info] ES Modules
> Los plugins usan `export default` (ESM moderno). No uses `module.exports`.

---

## API disponible en `activate`

### `monaco`

El namespace completo de Monaco Editor. Las APIs más usadas:

| API | Qué hace |
|-----|----------|
| `monaco.languages.registerCompletionItemProvider(lang, provider)` | Añade autocompletado |
| `monaco.languages.registerHoverProvider(lang, provider)` | Añade tooltips al pasar el cursor |
| `monaco.languages.registerCodeActionProvider(lang, provider)` | Añade acciones rápidas (bombilla) |
| `monaco.languages.setMonarchTokensProvider(lang, rules)` | Colorea sintaxis personalizada |
| `monaco.languages.register({ id })` | Registra un nuevo lenguaje |
| `monaco.editor.addEditorAction(action)` | Añade comandos a la paleta de acciones |
| `monaco.editor.defineTheme(id, def)` | Define un tema personalizado |

### `editor`

La instancia actual de `IStandaloneCodeEditor`. Útil para:

```js
const model   = editor.getModel()        // modelo actual (archivo)
const pos     = editor.getPosition()     // posición del cursor
const text    = model.getValue()         // texto completo del editor
const lineN   = model.getLineCount()     // número de líneas
```

### `onDispose(fn)`

Registra una función de limpieza que se ejecuta cuando el plugin se desactiva:

```js
activate({ monaco, onDispose }) {
  const d = monaco.languages.registerCompletionItemProvider(...)
  onDispose(() => d.dispose())
}
```

---

## Ejemplo 1 — Autocompletado básico

Muestra sugerencias de CSS custom properties al escribir `--`.

```js
// ~/.config/xp/plugins/css-vars.js

export default {
  name: 'css-vars',
  version: '1.0.0',
  description: 'Autocompleta variables CSS personalizadas en JSX/TSX',

  activate({ monaco, onDispose }) {
    const MY_VARS = [
      '--color-primary',
      '--color-secondary',
      '--spacing-sm',
      '--spacing-md',
      '--spacing-lg',
      '--font-heading',
      '--font-body',
    ]

    const d = monaco.languages.registerCompletionItemProvider('javascript', {
      triggerCharacters: ['-'],
      provideCompletionItems(model, position) {
        const line   = model.getLineContent(position.lineNumber)
        const before = line.slice(0, position.column - 1)

        // Solo activar cuando el texto anterior termina en "--"
        if (!before.endsWith('--')) return null

        const word  = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
          startColumn: word.startColumn - 2,    endColumn: word.endColumn,
        }

        return {
          suggestions: MY_VARS.map(v => ({
            label: v,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: v,
            documentation: `Variable CSS: ${v}`,
            range,
          })),
        }
      },
    })

    onDispose(() => d.dispose())
  },
}
```

---

## Ejemplo 2 — Hover informativo

Muestra documentación al pasar el cursor sobre una función.

```js
// ~/.config/xp/plugins/hover-docs.js

const DOCS = {
  useState:   '`useState(initialValue)` → `[state, setState]`\nHook para estado local en componentes funcionales.',
  useEffect:  '`useEffect(fn, deps?)` → `void`\nEjecuta efectos secundarios después del render.',
  useRef:     '`useRef(initial?)` → `{ current: T }`\nCrea una referencia mutable que persiste entre renders.',
  useCallback:'`useCallback(fn, deps)` → `fn`\nMemoiza una función para evitar recrearla en cada render.',
  useMemo:    '`useMemo(() => value, deps)` → `T`\nMemoiza un valor calculado.',
}

export default {
  name: 'hover-docs',
  version: '1.0.0',
  description: 'Documentación de hooks de React al pasar el cursor',

  activate({ monaco, onDispose }) {
    const register = (lang) => monaco.languages.registerHoverProvider(lang, {
      provideHover(model, position) {
        const word = model.getWordAtPosition(position)
        if (!word) return null
        const doc = DOCS[word.word]
        if (!doc) return null
        return {
          range: new monaco.Range(
            position.lineNumber, word.startColumn,
            position.lineNumber, word.endColumn,
          ),
          contents: [{ value: doc }],
        }
      },
    })

    const d1 = register('javascript')
    const d2 = register('typescript')
    onDispose(() => { d1.dispose(); d2.dispose() })
  },
}
```

---

## Ejemplo 3 — Snippets

Añade snippets de código propios.

```js
// ~/.config/xp/plugins/my-snippets.js

export default {
  name: 'my-snippets',
  version: '1.0.0',
  description: 'Snippets personalizados para React',

  activate({ monaco, onDispose }) {
    const SNIPPETS = [
      {
        label: 'usc',
        detail: 'useState con setter tipado',
        insertText: 'const [${1:value}, set${2:Value}] = useState${3:<${4:Type}>}(${5:initial})',
        documentation: 'Inserta un useState con nombre de setter capitalizado.',
      },
      {
        label: 'comp',
        detail: 'Componente funcional básico',
        insertText: [
          'export default function ${1:MyComponent}() {',
          '  return (',
          '    <div>',
          '      ${2:contenido}',
          '    </div>',
          '  )',
          '}',
        ].join('\n'),
        documentation: 'Componente React funcional con export default.',
      },
    ]

    const register = (lang) => monaco.languages.registerCompletionItemProvider(lang, {
      provideCompletionItems(model, position) {
        const word  = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
          startColumn: word.startColumn,        endColumn: word.endColumn,
        }
        return {
          suggestions: SNIPPETS.map(s => ({
            ...s,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          })),
        }
      },
    })

    const d1 = register('javascript')
    const d2 = register('typescript')
    onDispose(() => { d1.dispose(); d2.dispose() })
  },
}
```

> [!tip] Sintaxis de snippet
> XP usa la sintaxis de snippet de VS Code:
> - `${1:placeholder}` — tabstop con texto por defecto
> - `${1|opcion1,opcion2|}` — selección múltiple
> - `$0` — posición final del cursor

---

## Ejemplo 4 — Nuevo lenguaje (sintaxis simple)

Registra un lenguaje ficticio con coloreo básico.

```js
// ~/.config/xp/plugins/lang-formula.js

export default {
  name: 'lang-formula',
  version: '1.0.0',
  description: 'Soporte de sintaxis para fórmulas personalizadas',

  activate({ monaco, onDispose }) {
    // 1. Registrar el ID del lenguaje
    monaco.languages.register({ id: 'formula' })

    // 2. Coloreo de tokens
    monaco.languages.setMonarchTokensProvider('formula', {
      tokenizer: {
        root: [
          [/[A-Z][A-Z0-9_]*/, 'keyword'],       // funciones en MAYÚSCULAS
          [/\d+(\.\d+)?/, 'number'],             // números
          [/"[^"]*"/, 'string'],                 // strings
          [/[+\-*/=<>!&|]/, 'operator'],         // operadores
          [/[()[\]{},;]/, 'delimiter'],          // delimitadores
          [/\/\/.*/, 'comment'],                 // comentarios //
        ],
      },
    })

    // 3. Autocompletado básico
    const d = monaco.languages.registerCompletionItemProvider('formula', {
      provideCompletionItems(model, position) {
        const word  = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
          startColumn: word.startColumn,        endColumn: word.endColumn,
        }
        return {
          suggestions: ['SUM', 'AVG', 'MAX', 'MIN', 'IF', 'AND', 'OR', 'NOT'].map(fn => ({
            label: fn,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: `${fn}($0)`,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          })),
        }
      },
    })

    onDispose(() => d.dispose())
  },
}
```

---

## Referencia de `CompletionItemKind`

| Constante | Ícono visual |
|-----------|-------------|
| `Text` | texto plano |
| `Method` | función/método |
| `Function` | función |
| `Variable` | variable |
| `Class` | clase |
| `Interface` | interfaz |
| `Module` | módulo |
| `Property` | propiedad |
| `Keyword` | palabra clave |
| `Snippet` | snippet (estrella) |
| `Color` | muestra de color |
| `Value` | valor genérico |
| `Enum` | enumeración |
| `EnumMember` | miembro de enum |
| `File` | archivo |
| `Reference` | referencia |

Accede a ellos como `monaco.languages.CompletionItemKind.Method`, etc.

---

## Preguntas frecuentes

**¿Cómo recargo un plugin sin reiniciar la app?**
Por ahora, los plugins se cargan una vez al montar el editor. Reinicia la app para ver cambios.

**¿Puedo usar `import` dentro de un plugin?**
Sí, puedes usar `import()` dinámico para cargar módulos accesibles desde el contexto del navegador (CDN, data URIs). Los módulos de Node.js no están disponibles en el renderer.

**¿Los plugins tienen acceso al sistema de archivos?**
No directamente. El renderer no tiene `nodeIntegration`. Para necesidades avanzadas, considera extender el protocolo IPC desde `main.js`.

**¿Qué lenguajes (`lang`) puedo usar en los providers?**
XP usa los identificadores estándar de Monaco:
- `'javascript'` — para archivos `.js` y `.jsx`
- `'typescript'` — para archivos `.ts` y `.tsx`
- `'python'` — para archivos `.py`
- Cualquier ID que hayas registrado con `monaco.languages.register()`

**¿Cómo restrinjo mi provider solo a JSX/TSX?**
Comprueba la URI del modelo dentro del provider:
```js
provideCompletionItems(model, position) {
  const path = model.uri.path
  if (!path.endsWith('.jsx') && !path.endsWith('.tsx')) return null
  // ...
}
```

---

## Plantilla mínima para copiar

```js
// ~/.config/xp/plugins/mi-plugin.js

export default {
  name: 'mi-plugin',
  version: '1.0.0',
  description: 'Descripción breve',

  activate({ monaco, editor, onDispose }) {
    // Tu código aquí
  },
}
```
