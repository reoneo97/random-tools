import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import JsonFormatter from './tools/JsonFormatter'
import LlmOutputParser from './tools/LlmOutputParser'
import LlmEval from './tools/LlmEval'
import PromptDiff from './tools/PromptDiff'
import MermaidFormatter from './tools/MermaidFormatter'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/json-formatter" replace />} />
        <Route path="json-formatter"    element={<JsonFormatter />} />
        <Route path="llm-parser"        element={<LlmOutputParser />} />
        <Route path="llm-eval"          element={<LlmEval />} />
        <Route path="prompt-diff"       element={<PromptDiff />} />
        <Route path="mermaid-formatter" element={<MermaidFormatter />} />
      </Route>
    </Routes>
  )
}
