/**
 * Converts single-quoted strings in JSON-like input to double-quoted strings
 * so that standard JSON.parse can handle them.
 *
 * Handles:
 * - Single-quoted keys and values  →  double-quoted
 * - Escaped single quote \'        →  literal ' (no escape needed in JSON)
 * - Bare " inside single-quoted    →  escaped \"
 * - Already double-quoted strings  →  passed through unchanged
 */
export function normalizeQuotes(raw: string): string {
  const result: string[] = []
  let i = 0
  while (i < raw.length) {
    const c = raw[i]
    if (c === '"') {
      // Double-quoted string — copy verbatim
      result.push(c); i++
      while (i < raw.length) {
        const ch = raw[i]
        result.push(ch)
        if (ch === '\\') { i++; if (i < raw.length) result.push(raw[i]) }
        else if (ch === '"') break
        i++
      }
      i++
    } else if (c === "'") {
      // Single-quoted string — convert to double-quoted
      result.push('"'); i++
      while (i < raw.length) {
        const ch = raw[i]
        if (ch === '\\' && i + 1 < raw.length && raw[i + 1] === "'") {
          result.push("'"); i += 2
        } else if (ch === '\\') {
          result.push(ch); i++
          if (i < raw.length) { result.push(raw[i]); i++ }
        } else if (ch === '"') {
          result.push('\\"'); i++
        } else if (ch === "'") {
          result.push('"'); i++; break
        } else {
          result.push(ch); i++
        }
      }
    } else {
      result.push(c); i++
    }
  }
  return result.join('')
}
