# random-tools

A collection of small, self-contained utility tools built with React + Vite.

## Tools

| Tool | Description |
|------|-------------|
| **JSON Formatter** | Pretty-print, compact, sort keys, syntax highlighting |
| **LLM Output Parser** | Parse OpenAI / Anthropic API responses, render markdown, highlight reasoning blocks, token usage stats |
| **LLM Evaluator** | Score responses (7 criteria), A/B comparison, custom pass/fail rubric |
| **Prompt Diff** | Word-level and line-level diff between two prompt versions |

## Getting started

```bash
npm install
npm run dev       # dev server at http://localhost:5173
npm run build     # production build → dist/
```

## CLI tool

**`json_formatter.py`** — standalone CLI formatter, Python 3 stdlib only (no install needed).

```bash
echo '{"b":2,"a":1}' | python3 json_formatter.py
python3 json_formatter.py --help
```
