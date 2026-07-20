// Cada tema define:
//   label       — nombre visible
//   monacoId    — ID a pasar a monaco.editor.setTheme / defineTheme
//   swatch      — color representativo para el selector
//   vars        — CSS custom properties aplicadas a :root
//   definition  — objeto para monaco.editor.defineTheme (null = usar built-in)

export const THEMES = {
  dark: {
    label: 'Dark',
    monacoId: 'vs-dark',
    swatch: '#1e1e1e',
    definition: null,
    vars: {
      '--bg': '#1e1e1e', '--surface': '#252526', '--surface2': '#2d2d30',
      '--border': '#3e3e42', '--text': '#d4d4d4', '--text-muted': '#6a6a6a',
      '--accent': '#0078d4', '--accent-hover': '#1084d8',
      '--green': '#4ec9b0', '--yellow': '#dcdcaa', '--red': '#f44747',
      '--orange': '#ce9178', '--blue': '#9cdcfe', '--purple': '#c586c0',
    },
  },

  light: {
    label: 'Light',
    monacoId: 'vs',
    swatch: '#ffffff',
    definition: null,
    vars: {
      '--bg': '#ffffff', '--surface': '#f3f3f3', '--surface2': '#e8e8e8',
      '--border': '#d0d0d0', '--text': '#1f1f1f', '--text-muted': '#8a8a8a',
      '--accent': '#0066b8', '--accent-hover': '#0078d4',
      '--green': '#267f99', '--yellow': '#795e26', '--red': '#cd3131',
      '--orange': '#a31515', '--blue': '#0070c1', '--purple': '#af00db',
    },
  },

  monokai: {
    label: 'Monokai',
    monacoId: 'xp-monokai',
    swatch: '#272822',
    definition: {
      base: 'vs-dark', inherit: true,
      rules: [
        { token: 'keyword',           foreground: 'f92672' },
        { token: 'keyword.operator',  foreground: 'f92672' },
        { token: 'string',            foreground: 'e6db74' },
        { token: 'number',            foreground: 'ae81ff' },
        { token: 'comment',           foreground: '75715e', fontStyle: 'italic' },
        { token: 'type',              foreground: '66d9ef', fontStyle: 'italic' },
        { token: 'class',             foreground: 'a6e22e' },
        { token: 'identifier',        foreground: 'f8f8f2' },
        { token: 'delimiter',         foreground: 'f8f8f2' },
        { token: 'regexp',            foreground: 'e6db74' },
      ],
      colors: {
        'editor.background':                '#272822',
        'editor.foreground':                '#f8f8f2',
        'editor.lineHighlightBackground':   '#3e3d32',
        'editor.selectionBackground':       '#49483e',
        'editorLineNumber.foreground':      '#90908a',
        'editorLineNumber.activeForeground':'#c2c2bf',
        'editorCursor.foreground':          '#f8f8f0',
        'editorGutter.background':          '#272822',
        'editorBracketMatch.background':    '#3d3d3d',
        'editorIndentGuide.background':     '#3b3a32',
      },
    },
    vars: {
      '--bg': '#272822', '--surface': '#2f302b', '--surface2': '#3a3b35',
      '--border': '#49483e', '--text': '#f8f8f2', '--text-muted': '#75715e',
      '--accent': '#a6e22e', '--accent-hover': '#baf560',
      '--green': '#a6e22e', '--yellow': '#e6db74', '--red': '#f92672',
      '--orange': '#fd971f', '--blue': '#66d9ef', '--purple': '#ae81ff',
    },
  },

  dracula: {
    label: 'Dracula',
    monacoId: 'xp-dracula',
    swatch: '#282a36',
    definition: {
      base: 'vs-dark', inherit: true,
      rules: [
        { token: 'keyword',           foreground: 'ff79c6' },
        { token: 'keyword.operator',  foreground: 'ff79c6' },
        { token: 'string',            foreground: 'f1fa8c' },
        { token: 'number',            foreground: 'bd93f9' },
        { token: 'comment',           foreground: '6272a4', fontStyle: 'italic' },
        { token: 'type',              foreground: '8be9fd', fontStyle: 'italic' },
        { token: 'class',             foreground: '50fa7b' },
        { token: 'identifier',        foreground: 'f8f8f2' },
        { token: 'regexp',            foreground: 'f1fa8c' },
        { token: 'delimiter',         foreground: 'f8f8f2' },
      ],
      colors: {
        'editor.background':                '#282a36',
        'editor.foreground':                '#f8f8f2',
        'editor.lineHighlightBackground':   '#44475a',
        'editor.selectionBackground':       '#44475a',
        'editorLineNumber.foreground':      '#6272a4',
        'editorLineNumber.activeForeground':'#f8f8f2',
        'editorCursor.foreground':          '#f8f8f2',
        'editorGutter.background':          '#282a36',
        'editorBracketMatch.background':    '#44475a',
        'editorIndentGuide.background':     '#44475a',
      },
    },
    vars: {
      '--bg': '#282a36', '--surface': '#21222c', '--surface2': '#44475a',
      '--border': '#44475a', '--text': '#f8f8f2', '--text-muted': '#6272a4',
      '--accent': '#bd93f9', '--accent-hover': '#caa7ff',
      '--green': '#50fa7b', '--yellow': '#f1fa8c', '--red': '#ff5555',
      '--orange': '#ffb86c', '--blue': '#8be9fd', '--purple': '#bd93f9',
    },
  },

  oneDark: {
    label: 'One Dark',
    monacoId: 'xp-one-dark',
    swatch: '#282c34',
    definition: {
      base: 'vs-dark', inherit: true,
      rules: [
        { token: 'keyword',           foreground: 'c678dd' },
        { token: 'keyword.operator',  foreground: '56b6c2' },
        { token: 'string',            foreground: '98c379' },
        { token: 'number',            foreground: 'd19a66' },
        { token: 'comment',           foreground: '5c6370', fontStyle: 'italic' },
        { token: 'type',              foreground: 'e5c07b', fontStyle: 'italic' },
        { token: 'class',             foreground: 'e5c07b' },
        { token: 'identifier',        foreground: 'abb2bf' },
        { token: 'regexp',            foreground: '98c379' },
        { token: 'delimiter',         foreground: 'abb2bf' },
      ],
      colors: {
        'editor.background':                '#282c34',
        'editor.foreground':                '#abb2bf',
        'editor.lineHighlightBackground':   '#2c313a',
        'editor.selectionBackground':       '#3e4451',
        'editorLineNumber.foreground':      '#4b5263',
        'editorLineNumber.activeForeground':'#abb2bf',
        'editorCursor.foreground':          '#528bff',
        'editorGutter.background':          '#282c34',
        'editorBracketMatch.background':    '#3a3f4b',
        'editorIndentGuide.background':     '#3b4048',
      },
    },
    vars: {
      '--bg': '#282c34', '--surface': '#21252b', '--surface2': '#2c313a',
      '--border': '#3b4048', '--text': '#abb2bf', '--text-muted': '#5c6370',
      '--accent': '#61afef', '--accent-hover': '#7bbef5',
      '--green': '#98c379', '--yellow': '#e5c07b', '--red': '#e06c75',
      '--orange': '#d19a66', '--blue': '#61afef', '--purple': '#c678dd',
    },
  },

  nord: {
    label: 'Nord',
    monacoId: 'xp-nord',
    swatch: '#2e3440',
    definition: {
      base: 'vs-dark', inherit: true,
      rules: [
        { token: 'keyword',           foreground: '81a1c1' },
        { token: 'keyword.operator',  foreground: '81a1c1' },
        { token: 'string',            foreground: 'a3be8c' },
        { token: 'number',            foreground: 'b48ead' },
        { token: 'comment',           foreground: '4c566a', fontStyle: 'italic' },
        { token: 'type',              foreground: '8fbcbb', fontStyle: 'italic' },
        { token: 'class',             foreground: '8fbcbb' },
        { token: 'identifier',        foreground: 'd8dee9' },
        { token: 'regexp',            foreground: 'ebcb8b' },
        { token: 'delimiter',         foreground: 'eceff4' },
      ],
      colors: {
        'editor.background':                '#2e3440',
        'editor.foreground':                '#d8dee9',
        'editor.lineHighlightBackground':   '#3b4252',
        'editor.selectionBackground':       '#434c5e',
        'editorLineNumber.foreground':      '#4c566a',
        'editorLineNumber.activeForeground':'#d8dee9',
        'editorCursor.foreground':          '#d8dee9',
        'editorGutter.background':          '#2e3440',
        'editorBracketMatch.background':    '#434c5e',
        'editorIndentGuide.background':     '#3b4252',
      },
    },
    vars: {
      '--bg': '#2e3440', '--surface': '#3b4252', '--surface2': '#434c5e',
      '--border': '#4c566a', '--text': '#d8dee9', '--text-muted': '#677691',
      '--accent': '#88c0d0', '--accent-hover': '#9ecfdd',
      '--green': '#a3be8c', '--yellow': '#ebcb8b', '--red': '#bf616a',
      '--orange': '#d08770', '--blue': '#88c0d0', '--purple': '#b48ead',
    },
  },

  solarized: {
    label: 'Solarized Dark',
    monacoId: 'xp-solarized',
    swatch: '#002b36',
    definition: {
      base: 'vs-dark', inherit: true,
      rules: [
        { token: 'keyword',           foreground: '859900' },
        { token: 'keyword.operator',  foreground: '2aa198' },
        { token: 'string',            foreground: '2aa198' },
        { token: 'number',            foreground: 'd33682' },
        { token: 'comment',           foreground: '586e75', fontStyle: 'italic' },
        { token: 'type',              foreground: 'b58900', fontStyle: 'italic' },
        { token: 'class',             foreground: 'cb4b16' },
        { token: 'identifier',        foreground: '839496' },
        { token: 'regexp',            foreground: '2aa198' },
        { token: 'delimiter',         foreground: '93a1a1' },
      ],
      colors: {
        'editor.background':                '#002b36',
        'editor.foreground':                '#839496',
        'editor.lineHighlightBackground':   '#073642',
        'editor.selectionBackground':       '#094652',
        'editorLineNumber.foreground':      '#586e75',
        'editorLineNumber.activeForeground':'#839496',
        'editorCursor.foreground':          '#839496',
        'editorGutter.background':          '#002b36',
        'editorBracketMatch.background':    '#073642',
        'editorIndentGuide.background':     '#073642',
      },
    },
    vars: {
      '--bg': '#002b36', '--surface': '#073642', '--surface2': '#0d4555',
      '--border': '#1a5260', '--text': '#839496', '--text-muted': '#586e75',
      '--accent': '#268bd2', '--accent-hover': '#3ca0e0',
      '--green': '#859900', '--yellow': '#b58900', '--red': '#dc322f',
      '--orange': '#cb4b16', '--blue': '#268bd2', '--purple': '#6c71c4',
    },
  },
}

export const DEFAULT_THEME = 'dark'

export function applyThemeVars(vars) {
  const root = document.documentElement
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value)
  }
}
