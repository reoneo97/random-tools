import katex from 'katex'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderKatex(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, { displayMode, throwOnError: false, output: 'html' })
  } catch {
    return `<span style="color:var(--red);font-family:monospace">${esc(tex)}</span>`
  }
}

// Sentinels — control chars that won't appear in user content and survive esc()
const B = '\x02', E = '\x03'
const SOLO_TOKEN = new RegExp(`^${B}(\\d+)${E}$`)
const ALL_TOKENS  = new RegExp(`${B}(\\d+)${E}`, 'g')

function inline(text: string): string {
  // LaTeX/code stash tokens (\x02N\x03) survive esc() and all patterns below
  // since esc() only touches &<> and none of the regexes match control chars.
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
}

export function renderMarkdown(text: string): string {
  const stash: string[] = []
  const stashHtml = (html: string) => {
    const i = stash.length
    stash.push(html)
    return `${B}${i}${E}`
  }

  // Step 1 — extract code first so LaTeX inside code is never rendered
  // Fenced code blocks
  let t = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, _lang, code) =>
    stashHtml(`<pre><code>${esc(code.trimEnd())}</code></pre>`)
  )
  // Inline code spans
  t = t.replace(/`([^`\n]+)`/g, (_, code) =>
    stashHtml(`<code>${esc(code)}</code>`)
  )

  // Step 2 — extract LaTeX (code regions are now protected as stash tokens)
  // Block math $$...$$
  t = t.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) =>
    stashHtml(`<div class="katex-block">${renderKatex(tex.trim(), true)}</div>`)
  )
  // Inline math $...$
  t = t.replace(/\$([^\n$]+?)\$/g, (_, tex) =>
    stashHtml(renderKatex(tex.trim(), false))
  )

  // Step 3 — process markdown line by line
  const lines = t.split('\n')
  let html = ''
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Block-level stash item — emit directly without wrapping
    const bm = line.trim().match(SOLO_TOKEN)
    if (bm) { html += stash[Number(bm[1])]; i++; continue }

    const h1 = line.match(/^# (.+)/);   if (h1) { html += `<h1>${inline(h1[1])}</h1>`; i++; continue }
    const h2 = line.match(/^## (.+)/);  if (h2) { html += `<h2>${inline(h2[1])}</h2>`; i++; continue }
    const h3 = line.match(/^### (.+)/); if (h3) { html += `<h3>${inline(h3[1])}</h3>`; i++; continue }

    if (/^---+$/.test(line.trim())) { html += '<hr>'; i++; continue }
    if (line.startsWith('> ')) { html += `<blockquote>${inline(line.slice(2))}</blockquote>`; i++; continue }

    if (/^[-*+] /.test(line)) {
      html += '<ul>'
      while (i < lines.length && /^[-*+] /.test(lines[i])) { html += `<li>${inline(lines[i].replace(/^[-*+] /, ''))}</li>`; i++ }
      html += '</ul>'; continue
    }
    if (/^\d+\. /.test(line)) {
      html += '<ol>'
      while (i < lines.length && /^\d+\. /.test(lines[i])) { html += `<li>${inline(lines[i].replace(/^\d+\. /, ''))}</li>`; i++ }
      html += '</ol>'; continue
    }

    if (line.trim() === '') { i++; continue }
    html += `<p>${inline(line)}</p>`
    i++
  }

  // Step 4 — restore stash tokens that ended up in inline contexts
  html = html.replace(ALL_TOKENS, (_, idx) => stash[Number(idx)])

  return html
}
