# random-tools

A collection of small, self-contained utility tools built with React + Vite.

## Tools

| Tool | Description |
|------|-------------|
| **JSON Formatter** | Pretty-print, compact, sort keys, syntax highlighting |
| **LLM Output Parser** | Parse OpenAI / Anthropic API responses, render markdown, highlight reasoning blocks, token usage stats |
| **LLM Evaluator** | Score responses (7 criteria), A/B comparison, custom pass/fail rubric |
| **Prompt Diff** | Word-level and line-level diff between two prompt versions |

## Repository structure

```
random-tools/
├── react/          # React source code (development)
├── html/           # Compiled build output (no dependencies needed)
└── json_formatter.py
```

## Running the tools

### Option 1 — No install (pre-built)

The `html/` folder contains a pre-built version. Serve it with any static file server:

**macOS / Linux:**
```bash
cd html && python3 -m http.server 8080
```

**Windows:**
```cmd
cd html && python -m http.server 8080
```

**Any platform (Node.js):**
```bash
npx serve html
```

Then open `http://localhost:8080`.

### Option 2 — Dev server (requires Node.js)

```bash
cd react
npm install
npm run dev       # dev server at http://localhost:5173
```

## Building & deploying

```bash
cd react
npm run build     # compile to ../html/
npm run deploy    # compile + commit + push html/ to GitHub
```

## CLI tool

**`json_formatter.py`** — standalone JSON formatter, Python 3 stdlib only (no install needed).

```bash
echo '{"b":2,"a":1}' | python3 json_formatter.py
python3 json_formatter.py --sort-keys data.json
python3 json_formatter.py --help
```
