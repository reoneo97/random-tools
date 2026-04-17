import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import JsonFormatter from './tools/JsonFormatter'
import LlmOutputParser from './tools/LlmOutputParser'
import LlmRequestBuilder from './tools/LlmRequestBuilder'
import LlmEval from './tools/LlmEval'
import PromptDiff from './tools/PromptDiff'
import MermaidFormatter from './tools/MermaidFormatter'
import VlmTokenCalc from './tools/VlmTokenCalc'
import VlmRequestBuilder from './tools/VlmRequestBuilder'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/json-formatter" replace />} />
        <Route path="json-formatter"       element={<JsonFormatter />} />
        <Route path="llm-parser"           element={<LlmOutputParser />} />
        <Route path="llm-request-builder"  element={<LlmRequestBuilder />} />
        <Route path="llm-eval"             element={<LlmEval />} />
        <Route path="prompt-diff"          element={<PromptDiff />} />
        <Route path="mermaid-formatter"    element={<MermaidFormatter />} />
        <Route path="vlm-token-calc"       element={<VlmTokenCalc />} />
        <Route path="vlm-request-builder"  element={<VlmRequestBuilder />} />
      </Route>
    </Routes>
  )
}
