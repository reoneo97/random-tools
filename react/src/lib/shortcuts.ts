export interface Shortcut {
  keys: string[]   // e.g. ['Ctrl', 'Enter'] or ['?']
  description: string
}

export interface ShortcutGroup {
  tool: string
  shortcuts: Shortcut[]
}

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    tool: 'Global',
    shortcuts: [
      { keys: ['?'],        description: 'Open this shortcuts reference' },
      { keys: ['Esc'],      description: 'Close this shortcuts reference' },
    ],
  },
  {
    tool: 'JSON Formatter',
    shortcuts: [
      { keys: ['Ctrl', 'Enter'], description: 'Format JSON' },
    ],
  },
  {
    tool: 'LLM Output Parser',
    shortcuts: [
      { keys: ['Ctrl', 'Enter'], description: 'Parse response' },
    ],
  },
]
