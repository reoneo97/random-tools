function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function inline(text: string): string {
  return esc(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
}

export function renderMarkdown(text: string): string {
  const lines = text.split('\n')
  let html = ''
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    const fence = line.match(/^```(\w*)/)
    if (fence) {
      const lang = fence[1] || ''
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) { code.push(lines[i]); i++ }
      html += `<pre><code>${esc(code.join('\n'))}</code></pre>`
      i++; continue
    }

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
  return html
}
