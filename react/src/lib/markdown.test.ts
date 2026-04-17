import { describe, it, expect } from 'vitest'
import { renderMarkdown } from './markdown'

// ── Helpers ────────────────────────────────────────────────────────────

/** True if the rendered output contains a KaTeX span (rendered successfully) */
function hasKatex(html: string): boolean {
  return html.includes('class="katex"') || html.includes('katex-html')
}

/** True if the output is a block-level katex-block div */
function isBlock(html: string): boolean {
  return html.includes('katex-block')
}

// ── Basic markdown ─────────────────────────────────────────────────────

describe('renderMarkdown — existing markdown', () => {
  it('renders headings', () => {
    expect(renderMarkdown('# H1')).toContain('<h1>')
    expect(renderMarkdown('## H2')).toContain('<h2>')
    expect(renderMarkdown('### H3')).toContain('<h3>')
  })

  it('renders bold and italic', () => {
    const html = renderMarkdown('**bold** and *italic*')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>italic</em>')
  })

  it('renders fenced code blocks', () => {
    const html = renderMarkdown('```python\nprint("hi")\n```')
    expect(html).toContain('<pre><code>')
    // esc() escapes &<> but not quotes; double quotes are literal in element content
    expect(html).toContain('print("hi")')
  })

  it('renders unordered lists', () => {
    const html = renderMarkdown('- foo\n- bar')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>foo</li>')
  })

  it('renders ordered lists', () => {
    const html = renderMarkdown('1. first\n2. second')
    expect(html).toContain('<ol>')
    expect(html).toContain('<li>first</li>')
  })

  it('renders blockquotes', () => {
    expect(renderMarkdown('> note')).toContain('<blockquote>')
  })

  it('HTML-escapes special chars in plain text', () => {
    const html = renderMarkdown('a < b & c > d')
    expect(html).toContain('&lt;')
    expect(html).toContain('&amp;')
    expect(html).toContain('&gt;')
  })
})

// ── Inline LaTeX ───────────────────────────────────────────────────────

describe('renderMarkdown — inline LaTeX', () => {
  it('renders inline math $...$', () => {
    const html = renderMarkdown('The value is $x^2 + y^2$.')
    expect(hasKatex(html)).toBe(true)
    expect(html).not.toContain('$x^2')
  })

  it('renders inline math inside a paragraph with surrounding text', () => {
    const html = renderMarkdown('Let $n = 10$ be the input size.')
    expect(hasKatex(html)).toBe(true)
    expect(html).toContain('<p>')
  })

  it('renders multiple inline math expressions in one line', () => {
    const html = renderMarkdown('$a$ and $b$ are variables.')
    // Should render two separate katex spans
    const matches = html.match(/class="katex"/g)
    expect(matches).not.toBeNull()
    expect(matches!.length).toBeGreaterThanOrEqual(2)
  })

  it('renders fractions inline', () => {
    const html = renderMarkdown('The probability is $\\frac{1}{2}$.')
    expect(hasKatex(html)).toBe(true)
  })

  it('renders Greek letters inline', () => {
    const html = renderMarkdown('Let $\\alpha, \\beta, \\gamma$ be angles.')
    expect(hasKatex(html)).toBe(true)
  })

  it('renders subscripts and superscripts inline', () => {
    const html = renderMarkdown('Time complexity $O(n \\log n)$ and $a_i$.')
    expect(hasKatex(html)).toBe(true)
  })
})

// ── Block LaTeX ────────────────────────────────────────────────────────

describe('renderMarkdown — block LaTeX', () => {
  it('renders block math $$...$$', () => {
    const html = renderMarkdown('$$E = mc^2$$')
    expect(hasKatex(html)).toBe(true)
    expect(isBlock(html)).toBe(true)
  })

  it('renders block math on its own line', () => {
    const html = renderMarkdown('The equation:\n\n$$\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$\n\nwhere we integrate.')
    expect(isBlock(html)).toBe(true)
    expect(hasKatex(html)).toBe(true)
  })

  it('renders multi-line block math', () => {
    const html = renderMarkdown('$$\n\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}\n$$')
    expect(isBlock(html)).toBe(true)
    expect(hasKatex(html)).toBe(true)
  })

  it('renders the Master Theorem recurrence', () => {
    const html = renderMarkdown('$$T(n) = 2T\\left(\\frac{n}{2}\\right) + O(n)$$')
    expect(isBlock(html)).toBe(true)
    expect(hasKatex(html)).toBe(true)
  })

  it('renders block math with aligned equations', () => {
    const html = renderMarkdown('$$\n\\begin{aligned}\n  a &= b + c \\\\\n  d &= e - f\n\\end{aligned}\n$$')
    expect(isBlock(html)).toBe(true)
  })
})

// ── LaTeX with HTML-special characters ────────────────────────────────

describe('renderMarkdown — LaTeX with HTML-special chars', () => {
  it('does not double-escape < inside LaTeX', () => {
    const html = renderMarkdown('$a < b$')
    // Should render via KaTeX, not emit &lt; as literal text
    expect(hasKatex(html)).toBe(true)
    // The raw unescaped '<' should not appear as literal text outside KaTeX
  })

  it('does not double-escape & inside LaTeX', () => {
    // & is used in aligned environments
    const html = renderMarkdown('$$a &= b$$')
    expect(isBlock(html)).toBe(true)
  })

  it('renders set notation with < and >', () => {
    const html = renderMarkdown('The set $\\{x \\mid x < n\\}$ has $n$ elements.')
    expect(hasKatex(html)).toBe(true)
  })
})

// ── Tables ────────────────────────────────────────────────────────────

describe('renderMarkdown — tables', () => {
  it('renders a basic table', () => {
    const md = '| A | B |\n|---|---|\n| 1 | 2 |'
    const html = renderMarkdown(md)
    expect(html).toContain('<table>')
    expect(html).toContain('<thead>')
    expect(html).toContain('<tbody>')
    expect(html).toContain('<th')
    expect(html).toContain('<td')
  })

  it('renders header cells correctly', () => {
    const html = renderMarkdown('| Name | Age |\n|------|-----|\n| Bob | 30 |')
    expect(html).toContain('>Name<')
    expect(html).toContain('>Age<')
  })

  it('renders data cells correctly', () => {
    const html = renderMarkdown('| Name | Age |\n|------|-----|\n| Bob | 30 |')
    expect(html).toContain('>Bob<')
    expect(html).toContain('>30<')
  })

  it('renders multiple data rows', () => {
    const md = '| X |\n|---|\n| a |\n| b |\n| c |'
    const html = renderMarkdown(md)
    expect(html).toContain('>a<')
    expect(html).toContain('>b<')
    expect(html).toContain('>c<')
  })

  it('applies right alignment from :---:', () => {
    const html = renderMarkdown('| N |\n|--:|\n| 1 |')
    expect(html).toContain('text-align:right')
  })

  it('applies center alignment from :---:', () => {
    const html = renderMarkdown('| N |\n|:--:|\n| 1 |')
    expect(html).toContain('text-align:center')
  })

  it('renders inline markdown inside cells', () => {
    const html = renderMarkdown('| Col |\n|-----|\n| **bold** |')
    expect(html).toContain('<strong>bold</strong>')
  })

  it('renders LaTeX inside table cells', () => {
    const html = renderMarkdown('| Complexity |\n|------------|\n| $O(n \\log n)$ |')
    expect(hasKatex(html)).toBe(true)
    expect(html).toContain('<table>')
  })
})

// ── LaTeX does not render inside code blocks ───────────────────────────

describe('renderMarkdown — LaTeX inside code blocks', () => {
  it('does not render LaTeX inside fenced code blocks', () => {
    const html = renderMarkdown('```\n$x^2$\n$$E=mc^2$$\n```')
    // Code is extracted before LaTeX, so dollar signs stay literal
    expect(hasKatex(html)).toBe(false)
    expect(html).toContain('<pre><code>')
  })

  it('does not render LaTeX inside inline code', () => {
    const html = renderMarkdown('Use `$x$` to denote variables.')
    // Inline code is extracted before LaTeX; dollar signs remain literal
    expect(html).toContain('<code>$x$</code>')
  })
})

// ── Mixed LaTeX and markdown ───────────────────────────────────────────

describe('renderMarkdown — LaTeX mixed with other markdown', () => {
  it('renders LaTeX inside a heading', () => {
    const html = renderMarkdown('## Complexity $O(n^2)$')
    expect(html).toContain('<h2>')
    expect(hasKatex(html)).toBe(true)
  })

  it('renders LaTeX in a list item', () => {
    const html = renderMarkdown('- Time: $O(n \\log n)$\n- Space: $O(n)$')
    expect(html).toContain('<ul>')
    expect(hasKatex(html)).toBe(true)
  })

  it('renders a full response with both inline and block LaTeX', () => {
    const md = [
      '# Merge Sort',
      '',
      'Time complexity is $O(n \\log n)$.',
      '',
      '$$T(n) = 2T\\left(\\frac{n}{2}\\right) + n$$',
      '',
      'Space complexity: $O(n)$.',
    ].join('\n')
    const html = renderMarkdown(md)
    expect(html).toContain('<h1>')
    expect(isBlock(html)).toBe(true)
    const katexMatches = html.match(/class="katex"/g)
    expect(katexMatches).not.toBeNull()
    expect(katexMatches!.length).toBeGreaterThanOrEqual(3)
  })
})

// ── Error handling ─────────────────────────────────────────────────────

describe('renderMarkdown — LaTeX error handling', () => {
  it('renders invalid LaTeX without throwing', () => {
    // throwOnError: false means KaTeX renders an error span rather than throwing
    expect(() => renderMarkdown('$\\invalidcommand$')).not.toThrow()
  })

  it('still produces some output for invalid LaTeX', () => {
    const html = renderMarkdown('$\\notacommand$')
    // KaTeX with throwOnError:false renders a katex-error span
    expect(html.length).toBeGreaterThan(0)
  })
})
