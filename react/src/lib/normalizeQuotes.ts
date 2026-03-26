/**
 * Converts single-quoted strings in JSON-like input to double-quoted strings
 * so that standard JSON.parse can handle them.
 *
 * Handles:
 * - Escaped-quote delimiters: \" used as structural quotes → "
 * - Single-quoted keys and values  →  double-quoted
 * - Escaped single quote \'        →  literal ' (no escape needed in JSON)
 * - Bare " inside single-quoted    →  escaped \"
 * - Already double-quoted strings  →  passed through unchanged
 */
export function normalizeQuotes(raw: string): string {
  // Pre-pass: if ALL double-quotes in the input are escaped as \"
  // (i.e. no bare " remains after removing every \") then the whole
  // payload has been escaped — strip the backslashes before the quotes.
  let input = raw
  const hasBareDquote = raw.replace(/\\"/g, '').includes('"')
  if (!hasBareDquote && raw.includes('\\"')) {
    input = raw.replace(/\\"/g, '"')
  }

  const result: string[] = []
  let i = 0
  while (i < input.length) {
    const c = input[i]
    if (c === '"') {
      // Double-quoted string — copy verbatim
      result.push(c); i++
      while (i < input.length) {
        const ch = input[i]
        result.push(ch)
        if (ch === '\\') { i++; if (i < input.length) result.push(input[i]) }
        else if (ch === '"') break
        i++
      }
      i++
    } else if (c === "'") {
      // Single-quoted string — convert to double-quoted
      result.push('"'); i++
      while (i < input.length) {
        const ch = input[i]
        if (ch === '\\' && i + 1 < input.length && input[i + 1] === "'") {
          result.push("'"); i += 2
        } else if (ch === '\\') {
          result.push(ch); i++
          if (i < input.length) { result.push(input[i]); i++ }
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
