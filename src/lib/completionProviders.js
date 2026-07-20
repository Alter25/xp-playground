// ─── Helpers ──────────────────────────────────────────────────────────────────
const Snippet = (monaco) => monaco.languages.CompletionItemKind.Snippet
const Keyword = (monaco) => monaco.languages.CompletionItemKind.Keyword
const Func    = (monaco) => monaco.languages.CompletionItemKind.Function
const Cls     = (monaco) => monaco.languages.CompletionItemKind.Class
const Mod     = (monaco) => monaco.languages.CompletionItemKind.Module
const Prop    = (monaco) => monaco.languages.CompletionItemKind.Property
const InsertSnippet = (monaco) => monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet

function range(model, position) {
  const w = model.getWordUntilPosition(position)
  return {
    startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
    startColumn: w.startColumn,          endColumn: w.endColumn,
  }
}

// ─── React / JSX snippets ─────────────────────────────────────────────────────
export function registerReactSnippets(monaco) {
  monaco.languages.registerCompletionItemProvider('javascript', reactProvider(monaco))
  monaco.languages.registerCompletionItemProvider('typescript', reactProvider(monaco))
}

function reactProvider(monaco) {
  return {
    triggerCharacters: [],
    provideCompletionItems(model, position) {
      const uri = model.uri.path
      const isJSX = uri.endsWith('.jsx') || uri.endsWith('.tsx')
      const r = range(model, position)
      const S = InsertSnippet(monaco)

      const base = [
        // ── Imports ──────────────────────────────────────────────────────────
        {
          label: 'imr', kind: Snippet(monaco), insertTextRules: S,
          insertText: "import React from 'react'",
          documentation: 'import React',
          range: r,
        },
        {
          label: 'imrh', kind: Snippet(monaco), insertTextRules: S,
          insertText: "import { ${1:useState} } from 'react'",
          documentation: 'import React hooks',
          range: r,
        },
        // ── Components ───────────────────────────────────────────────────────
        {
          label: 'rfc', kind: Snippet(monaco), insertTextRules: S,
          detail: 'React functional component',
          insertText: [
            'function ${1:Component}(${2}) {',
            '\treturn (',
            '\t\t<div>',
            '\t\t\t${3}',
            '\t\t</div>',
            '\t)',
            '}',
            '',
            'export default ${1:Component}',
          ].join('\n'),
          range: r,
        },
        {
          label: 'rafce', kind: Snippet(monaco), insertTextRules: S,
          detail: 'Arrow function component (export default)',
          insertText: [
            'const ${1:Component} = (${2}) => {',
            '\treturn (',
            '\t\t<div>',
            '\t\t\t${3}',
            '\t\t</div>',
            '\t)',
            '}',
            '',
            'export default ${1:Component}',
          ].join('\n'),
          range: r,
        },
        {
          label: 'rfce', kind: Snippet(monaco), insertTextRules: S,
          detail: 'React function component (named export)',
          insertText: [
            'export function ${1:Component}(${2}) {',
            '\treturn (',
            '\t\t<div>',
            '\t\t\t${3}',
            '\t\t</div>',
            '\t)',
            '}',
          ].join('\n'),
          range: r,
        },
        // ── Hooks ────────────────────────────────────────────────────────────
        {
          label: 'us', kind: Snippet(monaco), insertTextRules: S,
          detail: 'useState hook',
          insertText: 'const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState(${2:null})',
          range: r,
        },
        {
          label: 'ue', kind: Snippet(monaco), insertTextRules: S,
          detail: 'useEffect hook',
          insertText: [
            'useEffect(() => {',
            '\t${1}',
            '\treturn () => {',
            '\t\t${2}',
            '\t}',
            '}, [${3}])',
          ].join('\n'),
          range: r,
        },
        {
          label: 'uef', kind: Snippet(monaco), insertTextRules: S,
          detail: 'useEffect (on mount only)',
          insertText: [
            'useEffect(() => {',
            '\t${1}',
            '}, [])',
          ].join('\n'),
          range: r,
        },
        {
          label: 'ucb', kind: Snippet(monaco), insertTextRules: S,
          detail: 'useCallback hook',
          insertText: [
            'const ${1:handler} = useCallback((${2}) => {',
            '\t${3}',
            '}, [${4}])',
          ].join('\n'),
          range: r,
        },
        {
          label: 'um', kind: Snippet(monaco), insertTextRules: S,
          detail: 'useMemo hook',
          insertText: 'const ${1:value} = useMemo(() => ${2}, [${3}])',
          range: r,
        },
        {
          label: 'ur', kind: Snippet(monaco), insertTextRules: S,
          detail: 'useRef hook',
          insertText: 'const ${1:ref} = useRef(${2:null})',
          range: r,
        },
        {
          label: 'uc', kind: Snippet(monaco), insertTextRules: S,
          detail: 'useContext hook',
          insertText: 'const ${1:value} = useContext(${2:Context})',
          range: r,
        },
        {
          label: 'urd', kind: Snippet(monaco), insertTextRules: S,
          detail: 'useReducer hook',
          insertText: [
            'const [${1:state}, dispatch] = useReducer((state, action) => {',
            '\tswitch (action.type) {',
            '\t\tcase \'${2:ACTION}\':',
            '\t\t\treturn { ...state, ${3} }',
            '\t\tdefault:',
            '\t\t\treturn state',
            '\t}',
            '}, ${4:initialState})',
          ].join('\n'),
          range: r,
        },
        {
          label: 'uctx', kind: Snippet(monaco), insertTextRules: S,
          detail: 'createContext',
          insertText: [
            'const ${1:Context} = createContext(${2:null})',
            '',
            'export function ${1:Context}Provider({ children }) {',
            '\tconst [${3:state}, set${3/(.*)/${1:/capitalize}/}] = useState(${4:null})',
            '\treturn (',
            '\t\t<${1:Context}.Provider value={{ ${3}, set${3/(.*)/${1:/capitalize}/} }}>',
            '\t\t\t{children}',
            '\t\t</${1:Context}.Provider>',
            '\t)',
            '}',
          ].join('\n'),
          range: r,
        },
      ]

      // JSX-only snippets
      const jsxOnly = isJSX ? [
        {
          label: 'frag', kind: Snippet(monaco), insertTextRules: S,
          detail: 'React Fragment',
          insertText: '<>\n\t${1}\n</>',
          range: r,
        },
        {
          label: 'map', kind: Snippet(monaco), insertTextRules: S,
          detail: 'Array.map in JSX',
          insertText: '{${1:items}.map((${2:item}) => (\n\t<${3:div} key={${2:item}.${4:id}}>\n\t\t${5}\n\t</${3:div}>\n))}',
          range: r,
        },
        {
          label: 'cond', kind: Snippet(monaco), insertTextRules: S,
          detail: 'Conditional render',
          insertText: '{${1:condition} && (\n\t${2}\n)}',
          range: r,
        },
        {
          label: 'tern', kind: Snippet(monaco), insertTextRules: S,
          detail: 'Ternary render',
          insertText: '{${1:condition} ? (\n\t${2}\n) : (\n\t${3}\n)}',
          range: r,
        },
      ] : []

      return { suggestions: [...base, ...jsxOnly] }
    },
  }
}

// ─── JSX Emmet-style tag snippets ─────────────────────────────────────────────
export function registerJSXEmmet(monaco) {
  for (const lang of ['javascript', 'typescript']) {
    monaco.languages.registerCompletionItemProvider(lang, {
      triggerCharacters: ['.', '#', '>'],
      provideCompletionItems(model, position) {
        const uri = model.uri.path
        if (!uri.endsWith('.jsx') && !uri.endsWith('.tsx') && !uri.endsWith('.html')) return null

        const line   = model.getLineContent(position.lineNumber)
        const before = line.slice(0, position.column - 1).trimStart()
        const r      = range(model, position)
        const S      = InsertSnippet(monaco)

        // Match patterns like "div", "div.cls", "div#id", "button.cls"
        const m = before.match(/^([a-z][a-z0-9]*)(\.[\w-]+)?(#[\w-]+)?$/)
        if (!m) return null

        const tag = m[1], cls = m[2]?.slice(1), id = m[3]?.slice(1)
        const classAttr = cls ? ` className="${cls}"` : ''
        const idAttr    = id  ? ` id="${id}"` : ''

        // Self-closing void elements
        const voids = new Set(['img', 'input', 'br', 'hr', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'])

        const suggest = (label, text) => ({ label, kind: Snippet(monaco), insertTextRules: S, insertText: text, range: r })

        if (voids.has(tag)) {
          const extras = {
            img:   ` src="\${1}" alt="\${2}"`,
            input: ` type="\${1:text}" value={\${2}} onChange={\${3}}`,
          }
          return { suggestions: [suggest(
            `${tag}${cls ? `.${cls}` : ''}`,
            `<${tag}${classAttr}${idAttr}${extras[tag] ?? ''} />`,
          )] }
        }

        const wrap = (inner) => `<${tag}${classAttr}${idAttr}${inner}</${tag}>`

        return {
          suggestions: [
            suggest(`${tag}${cls ? `.${cls}` : ''}${id ? `#${id}` : ''}`, wrap('>\n\t${1}\n')),
          ],
        }
      },
    })
  }
}

// ─── Python completions ───────────────────────────────────────────────────────
const PYTHON_BUILTINS = [
  // I/O
  'print', 'input',
  // Type constructors
  'int', 'float', 'str', 'bool', 'bytes', 'bytearray', 'complex',
  'list', 'tuple', 'dict', 'set', 'frozenset',
  // Itertools-like builtins
  'range', 'enumerate', 'zip', 'map', 'filter', 'reversed', 'sorted',
  'iter', 'next', 'slice',
  // Math
  'abs', 'round', 'min', 'max', 'sum', 'pow', 'divmod',
  // Object inspection
  'type', 'isinstance', 'issubclass', 'id', 'hash', 'repr', 'callable',
  'dir', 'vars', 'getattr', 'setattr', 'hasattr', 'delattr',
  // Class helpers
  'super', 'object', 'property', 'staticmethod', 'classmethod',
  // Misc
  'len', 'open', 'format', 'chr', 'ord', 'hex', 'oct', 'bin',
  'any', 'all', 'bool', 'eval', 'exec', 'compile',
  'globals', 'locals', 'help', 'breakpoint',
  'NotImplemented', 'Ellipsis', '__name__', '__file__',
]

const PYTHON_EXCEPTIONS = [
  'Exception', 'ValueError', 'TypeError', 'KeyError', 'IndexError',
  'AttributeError', 'RuntimeError', 'StopIteration', 'GeneratorExit',
  'ArithmeticError', 'ZeroDivisionError', 'OverflowError',
  'ImportError', 'ModuleNotFoundError', 'FileNotFoundError',
  'IOError', 'OSError', 'PermissionError', 'TimeoutError',
  'NotImplementedError', 'RecursionError', 'MemoryError',
  'AssertionError', 'NameError', 'UnboundLocalError',
]

const PYTHON_STDLIB_IMPORTS = [
  ['os', 'os.path, os.getcwd(), os.listdir()'],
  ['sys', 'sys.argv, sys.path, sys.exit()'],
  ['json', 'json.dumps(), json.loads()'],
  ['re', 're.match(), re.search(), re.findall()'],
  ['math', 'math.sqrt(), math.pi, math.floor()'],
  ['random', 'random.random(), random.randint()'],
  ['datetime', 'datetime.datetime.now()'],
  ['pathlib', 'pathlib.Path'],
  ['collections', 'Counter, defaultdict, namedtuple, deque'],
  ['itertools', 'chain, product, combinations, permutations'],
  ['functools', 'reduce, partial, lru_cache, wraps'],
  ['typing', 'List, Dict, Optional, Union, Tuple, Any, Callable'],
  ['dataclasses', 'dataclass, field'],
  ['asyncio', 'asyncio.run(), asyncio.gather()'],
  ['logging', 'logging.basicConfig(), logging.getLogger()'],
  ['argparse', 'argparse.ArgumentParser()'],
  ['subprocess', 'subprocess.run(), subprocess.Popen()'],
  ['threading', 'threading.Thread'],
  ['time', 'time.time(), time.sleep()'],
  ['copy', 'copy.copy(), copy.deepcopy()'],
  ['io', 'io.StringIO(), io.BytesIO()'],
  ['hashlib', 'hashlib.md5(), hashlib.sha256()'],
  ['urllib', 'urllib.request, urllib.parse'],
  ['http', 'http.client, http.server'],
  ['socket', 'socket.socket()'],
  ['struct', 'struct.pack(), struct.unpack()'],
  ['csv', 'csv.reader(), csv.writer()'],
  ['xml', 'xml.etree.ElementTree'],
  ['sqlite3', 'sqlite3.connect()'],
  ['unittest', 'unittest.TestCase'],
  ['contextlib', 'contextlib.contextmanager'],
  ['abc', 'abc.ABC, abc.abstractmethod'],
  ['enum', 'enum.Enum, enum.auto()'],
  ['pprint', 'pprint.pprint()'],
]

export function registerPythonCompletions(monaco) {
  monaco.languages.registerCompletionItemProvider('python', {
    triggerCharacters: ['.', ' ', '\n', 'i'],
    provideCompletionItems(model, position) {
      const r   = range(model, position)
      const S   = InsertSnippet(monaco)
      const line = model.getLineContent(position.lineNumber)
      const before = line.slice(0, position.column - 1)

      const suggestions = []

      // ── Builtins ────────────────────────────────────────────────────────────
      for (const b of PYTHON_BUILTINS) {
        suggestions.push({ label: b, kind: Func(monaco), insertText: b, range: r })
      }
      for (const e of PYTHON_EXCEPTIONS) {
        suggestions.push({ label: e, kind: Cls(monaco), insertText: e, range: r })
      }

      // ── Stdlib import suggestions ────────────────────────────────────────────
      for (const [mod, detail] of PYTHON_STDLIB_IMPORTS) {
        suggestions.push({
          label: `import ${mod}`, kind: Mod(monaco),
          insertText: `import ${mod}`,
          detail, range: r,
        })
      }
      // typing imports
      suggestions.push({
        label: 'from typing import',
        kind: Mod(monaco), insertTextRules: S,
        insertText: 'from typing import ${1:Optional, List, Dict, Union, Any}',
        range: r,
      })
      suggestions.push({
        label: 'from dataclasses import dataclass',
        kind: Mod(monaco),
        insertText: 'from dataclasses import dataclass, field',
        range: r,
      })
      suggestions.push({
        label: 'from pathlib import Path',
        kind: Mod(monaco),
        insertText: 'from pathlib import Path',
        range: r,
      })
      suggestions.push({
        label: 'from collections import',
        kind: Mod(monaco), insertTextRules: S,
        insertText: 'from collections import ${1:Counter, defaultdict, deque}',
        range: r,
      })

      // ── Snippets ────────────────────────────────────────────────────────────
      const snips = [
        {
          label: 'def', detail: 'function definition',
          insertText: 'def ${1:name}(${2}) -> ${3:None}:\n\t${4:pass}',
        },
        {
          label: 'defi', detail: 'function with docstring',
          insertText: 'def ${1:name}(${2}) -> ${3:None}:\n\t"""${4:Docstring}"""\n\t${5:pass}',
        },
        {
          label: 'class', detail: 'class definition',
          insertText: 'class ${1:Name}:\n\tdef __init__(self${2}) -> None:\n\t\t${3:pass}',
        },
        {
          label: 'dc', detail: '@dataclass',
          insertText: '@dataclass\nclass ${1:Name}:\n\t${2:field}: ${3:str} = ${4:""}',
        },
        {
          label: 'main', detail: 'if __name__ == "__main__"',
          insertText: 'if __name__ == "__main__":\n\t${1:main()}',
        },
        {
          label: 'lc', detail: 'list comprehension',
          insertText: '[${1:expr} for ${2:x} in ${3:iterable}${4: if ${5:condition}}]',
        },
        {
          label: 'dc2', detail: 'dict comprehension',
          insertText: '{${1:k}: ${2:v} for ${3:k}, ${4:v} in ${5:iterable}.items()}',
        },
        {
          label: 'sc', detail: 'set comprehension',
          insertText: '{${1:expr} for ${2:x} in ${3:iterable}}',
        },
        {
          label: 'gen', detail: 'generator expression',
          insertText: '(${1:expr} for ${2:x} in ${3:iterable})',
        },
        {
          label: 'tryexc', detail: 'try / except',
          insertText: 'try:\n\t${1:pass}\nexcept ${2:Exception} as e:\n\t${3:raise}',
        },
        {
          label: 'tryef', detail: 'try / except / finally',
          insertText: 'try:\n\t${1:pass}\nexcept ${2:Exception} as e:\n\t${3:pass}\nfinally:\n\t${4:pass}',
        },
        {
          label: 'withopen', detail: 'with open(...)',
          insertText: 'with open(${1:"file.txt"}, ${2:"r"}) as ${3:f}:\n\t${4:data = f.read()}',
        },
        {
          label: 'prop', detail: '@property',
          insertText: '@property\ndef ${1:name}(self):\n\treturn self._${1:name}\n\n@${1:name}.setter\ndef ${1:name}(self, value):\n\tself._${1:name} = value',
        },
        {
          label: 'adef', detail: 'async function',
          insertText: 'async def ${1:name}(${2}) -> ${3:None}:\n\t${4:pass}',
        },
        {
          label: 'await', detail: 'await expression',
          insertText: '${1:result} = await ${2:coroutine()}',
        },
        {
          label: 'pprint', detail: 'pprint',
          insertText: 'from pprint import pprint\npprint(${1:obj})',
        },
        {
          label: 'lambda', detail: 'lambda expression',
          insertText: 'lambda ${1:x}: ${2:x}',
        },
        {
          label: 'dunder', detail: '__init__ + __repr__ + __str__',
          insertText: [
            'def __init__(self${1}) -> None:',
            '\t${2}',
            '',
            'def __repr__(self) -> str:',
            '\treturn f"${3:{type(self).__name__}(${4})}}"',
            '',
            'def __str__(self) -> str:',
            '\treturn ${5:self.__repr__()}',
          ].join('\n'),
        },
        {
          label: 'enumerate', detail: 'for i, x in enumerate(...)',
          insertText: 'for ${1:i}, ${2:item} in enumerate(${3:items}):\n\t${4:pass}',
        },
        {
          label: 'items', detail: 'for k, v in dict.items()',
          insertText: 'for ${1:key}, ${2:value} in ${3:data}.items():\n\t${4:pass}',
        },
        {
          label: 'zip', detail: 'for x, y in zip(...)',
          insertText: 'for ${1:a}, ${2:b} in zip(${3:xs}, ${4:ys}):\n\t${5:pass}',
        },
        {
          label: 'fstr', detail: 'f-string',
          insertText: 'f"${1:{${2:var}}}"',
        },
      ]

      for (const s of snips) {
        suggestions.push({
          label: s.label, kind: Snippet(monaco),
          detail: s.detail, insertTextRules: S,
          insertText: s.insertText, range: r,
        })
      }

      // ── Dunder methods (for class bodies) ────────────────────────────────────
      const dunders = [
        '__init__', '__repr__', '__str__', '__len__', '__getitem__',
        '__setitem__', '__delitem__', '__contains__', '__iter__',
        '__next__', '__enter__', '__exit__', '__call__', '__eq__',
        '__lt__', '__le__', '__gt__', '__ge__', '__hash__',
        '__add__', '__sub__', '__mul__', '__truediv__', '__floordiv__',
        '__mod__', '__pow__', '__bool__', '__int__', '__float__',
      ]
      for (const d of dunders) {
        suggestions.push({ label: d, kind: Func(monaco), insertText: d, range: r })
      }

      return { suggestions }
    },
  })
}

// ─── Entry point ──────────────────────────────────────────────────────────────
export function registerAllProviders(monaco) {
  registerReactSnippets(monaco)
  registerJSXEmmet(monaco)
  registerPythonCompletions(monaco)
}
