# random-tools

A collection of small, self-contained utility scripts.

---

## llm_eval.html

A browser-based LLM response evaluator. Single HTML file — no server, no dependencies.

**3 tabs:**

| Tab | What it does |
|-----|-------------|
| **Score** | Rate a response on 7 criteria (relevance, accuracy, completeness, coherence, conciseness, tone, helpfulness) with sliders. Shows overall score, verdict, and per-criterion breakdown bars. |
| **A/B Compare** | Score two responses side-by-side on the same criteria and see which wins. |
| **Rubric** | Build a custom pass/fail checklist. Toggle each criterion, track pass rate. |

All tabs export results as JSON.

**Usage:** Open `llm_eval.html` in any browser.

---

## llm_output_parser.html

A browser-based parser and renderer for LLM chat/completions API responses. Single HTML file — no server, no dependencies.

**Supports:** OpenAI (`chat.completion`) and Anthropic (`message`) response formats.

**Features:**
- Renders message content as **markdown** (headings, lists, code blocks with syntax highlighting, blockquotes, tables)
- Collapsible **reasoning/thinking block** highlighted in purple (OpenAI `reasoning_content`, Anthropic `thinking`)
- **Metadata sidebar** — model, response ID, token usage (prompt/completion/reasoning/cache), finish reason, word/char counts, token distribution bar
- Sample buttons for both OpenAI and Anthropic formats
- `Ctrl+Enter` to parse

**Usage:** Open `llm_output_parser.html` in any browser, paste an API response, click **Parse**.

---

## json_formatter.html

A browser-based JSON formatter. Single HTML file — no server, no dependencies, just open it.

**Features:** syntax highlighting, pretty-print, compact mode, sort keys, copy to clipboard, byte/key count.

**Usage:** Open `json_formatter.html` in any browser, paste JSON, click **Format** (or `Ctrl+Enter`).

---

## json_formatter.py

A JSON formatter and validator with no external dependencies — just Python 3 stdlib.

### Requirements

- Python 3.6+

### Usage

```
python3 json_formatter.py [OPTIONS] [FILE]
```

If `FILE` is omitted, input is read from **stdin**.

### Options

| Flag | Description |
|------|-------------|
| `-i N`, `--indent N` | Indentation width in spaces (default: 4) |
| `-c`, `--compact` | Compact output, no extra whitespace |
| `-s`, `--sort-keys` | Sort object keys alphabetically |
| `--validate` | Validate only, no output |
| `-o FILE`, `--output FILE` | Write result to a file |

### Examples

```bash
# Pretty-print from stdin
echo '{"b":2,"a":1}' | python3 json_formatter.py

# From a file with 2-space indent
python3 json_formatter.py --indent 2 data.json

# Compact output with sorted keys
python3 json_formatter.py --compact --sort-keys data.json

# Validate only
python3 json_formatter.py --validate data.json

# Write formatted output to a file
python3 json_formatter.py data.json --output pretty.json
```
