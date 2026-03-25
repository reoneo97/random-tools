# random-tools

A collection of small, self-contained utility tools built with React + Vite.

## Tools

| Tool | Route | Description |
|------|-------|-------------|
| **JSON Formatter** | `/json-formatter` | Pretty-print or minify JSON, sort keys recursively, configurable indent (2 / 4 spaces / tabs), interactive collapsible tree view with byte + key count stats |
| **Mermaid Formatter** | `/mermaid-formatter` | Render Mermaid diagram syntax as SVG in real time; 4 built-in themes (Dark, Default, Neutral, Forest); sample templates for flowchart, sequence, class, and state diagrams |
| **LLM Output Parser** | `/llm-parser` | Paste a raw OpenAI or Anthropic API response — auto-detects format, renders markdown output, surfaces reasoning/thinking blocks, and shows token usage stats |
| **LLM Evaluator** | `/llm-eval` | Score LLM responses on 7 criteria (relevance, accuracy, completeness, coherence, conciseness, tone, helpfulness); A/B side-by-side comparison; custom pass/fail rubric; JSON export |
| **Prompt Diff** | `/prompt-diff` | Word-level and line-level diff between two prompt versions with colour-coded additions/deletions and change-percentage stats |

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

## Suggested future tools

| Tool | Why it fits |
|------|-------------|
| **JWT Decoder** | Paste a JWT token → decoded header, payload, expiry countdown; no secrets sent anywhere |
| **Regex Tester** | Live regex match highlighting against sample text, flag toggles, named-group extraction |
| **Token Counter** | Count LLM prompt tokens (cl100k / o200k) client-side — natural companion to the existing LLM tools |
| **Base64 / URL Encoder** | Encode and decode Base64 and percent-encoded strings; useful when inspecting API payloads |
| **YAML ↔ JSON Converter** | Convert between YAML and JSON — common when working with config files and API specs |
| **Timestamp Converter** | Unix epoch ↔ human-readable datetime in multiple timezones |
