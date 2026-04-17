import { useState, useCallback, useRef } from 'react'
import Panel from '../components/Panel'
import Button from '../components/Button'
import StatusBar from '../components/StatusBar'
import ResizablePanels from '../components/ResizablePanels'
import { renderMarkdown } from '../lib/markdown'
import { submitRequest, loadApiKey, saveApiKey, type ApiResult } from '../lib/apiClient'
import styles from './VlmRequestBuilder.module.css'

// ── Types ──────────────────────────────────────────────────────────────

interface ImageItem {
  id: string
  name: string
  dataUrl: string   // base64 data URL
  mimeType: string
  sizeBytes: number
}

type Format = 'openai' | 'anthropic'
type OaiDetail = 'auto' | 'low' | 'high'

// ── JSON builders ──────────────────────────────────────────────────────

const DEFAULT_MODEL: Record<Format, string> = {
  openai:    'gpt-4o',
  anthropic: 'claude-opus-4-6',
}

function buildOpenAI(images: ImageItem[], text: string, detail: OaiDetail, systemPrompt: string, model: string) {
  const content: unknown[] = images.map(img => ({
    type: 'image_url',
    image_url: { url: img.dataUrl, detail },
  }))
  if (text.trim()) content.push({ type: 'text', text: text.trim() })

  const messages: unknown[] = []
  if (systemPrompt.trim()) messages.push({ role: 'system', content: systemPrompt.trim() })
  messages.push({ role: 'user', content })

  return {
    model: model || DEFAULT_MODEL.openai,
    messages,
    max_tokens: 1024,
  }
}

function buildAnthropic(images: ImageItem[], text: string, systemPrompt: string, model: string) {
  const content: unknown[] = images.map(img => ({
    type: 'image',
    source: {
      type: 'base64',
      media_type: img.mimeType,
      data: img.dataUrl.split(',')[1],  // strip the data:<mime>;base64, prefix
    },
  }))
  if (text.trim()) content.push({ type: 'text', text: text.trim() })

  const body: Record<string, unknown> = {
    model: model || DEFAULT_MODEL.anthropic,
    max_tokens: 1024,
    messages: [{ role: 'user', content }],
  }
  if (systemPrompt.trim()) body.system = systemPrompt.trim()

  return body
}

// ── Component ──────────────────────────────────────────────────────────

let idCounter = 0
const uid = () => `img-${++idCounter}`

export default function VlmRequestBuilder() {
  const [images, setImages]   = useState<ImageItem[]>([])
  const [text, setText]       = useState('')
  const [system, setSystem]   = useState('')
  const [format, setFormat]   = useState<Format>('openai')
  const [model, setModel]     = useState(DEFAULT_MODEL.openai)
  const [detail, setDetail]   = useState<OaiDetail>('auto')
  const [status, setStatus]   = useState<{ msg: string; kind: 'ok' | 'err' | 'muted' }>({ msg: '', kind: 'muted' })
  const [dragging, setDragging] = useState(false)
  const [copied, setCopied]   = useState(false)
  const [viewImg, setViewImg] = useState<ImageItem | null>(null)
  const [apiKey, setApiKey]   = useState(() => loadApiKey('openai'))
  const [showKey, setShowKey] = useState(false)
  const [rightTab, setRightTab] = useState<'json' | 'response'>('json')
  const [result, setResult]   = useState<ApiResult | null>(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (!arr.length) { setStatus({ msg: '✖ No valid image files', kind: 'err' }); return }

    arr.forEach(file => {
      const reader = new FileReader()
      reader.onload = e => {
        const dataUrl = e.target?.result as string
        setImages(prev => [...prev, { id: uid(), name: file.name, dataUrl, mimeType: file.type, sizeBytes: file.size }])
        setStatus({ msg: `✔ ${arr.length} image${arr.length !== 1 ? 's' : ''} loaded`, kind: 'ok' })
      }
      reader.readAsDataURL(file)
    })
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    loadFiles(e.dataTransfer.files)
  }, [loadFiles])

  const removeImage = (id: string) => setImages(prev => prev.filter(i => i.id !== id))

  const outputJson = images.length || text.trim()
    ? JSON.stringify(
        format === 'openai'
          ? buildOpenAI(images, text, detail, system, model)
          : buildAnthropic(images, text, system, model),
        null, 2
      )
    : ''

  const copyOutput = async () => {
    if (!outputJson) return
    await navigator.clipboard.writeText(outputJson)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const switchFormat = (f: Format) => {
    setFormat(f)
    setModel(DEFAULT_MODEL[f])
    setApiKey(loadApiKey(f))
  }

  const handleSubmit = useCallback(async () => {
    if (!apiKey.trim()) {
      setStatus({ msg: '✖ Enter an API key first', kind: 'err' }); return
    }
    if (!images.length && !text.trim()) {
      setStatus({ msg: '✖ Add at least one image or text', kind: 'err' }); return
    }
    setLoading(true)
    setRightTab('response')
    setStatus({ msg: 'Submitting…', kind: 'muted' })
    const body = (format === 'openai'
      ? buildOpenAI(images, text, detail, system, model)
      : buildAnthropic(images, text, system, model)) as Record<string, unknown>
    const res = await submitRequest(format, body, apiKey.trim())
    setResult(res)
    setLoading(false)
    saveApiKey(format, apiKey.trim())
    setStatus(res.ok
      ? { msg: `✔ ${res.outputTokens} output tokens · ${res.inputTokens} input tokens`, kind: 'ok' }
      : { msg: `✖ ${res.error}`, kind: 'err' }
    )
  }, [format, apiKey, images, text, detail, system, model])

  const clear = () => {
    setImages([]); setText(''); setSystem('')
    setResult(null)
    setStatus({ msg: '', kind: 'muted' })
    if (fileRef.current) fileRef.current.value = ''
  }

  const totalBytes = images.reduce((s, i) => s + i.sizeBytes, 0)

  return (
    <div className={styles.root}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <span className={styles.label}>Format</span>
        <select className={styles.select} value={format} onChange={e => switchFormat(e.target.value as Format)}>
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
        </select>
        <span className={styles.label}>Model</span>
        <input
          className={styles.modelInput}
          value={model}
          onChange={e => setModel(e.target.value)}
          placeholder={DEFAULT_MODEL[format]}
          spellCheck={false}
        />
        {format === 'openai' && (
          <>
            <span className={styles.label}>Detail</span>
            <select className={styles.select} value={detail} onChange={e => setDetail(e.target.value as OaiDetail)}>
              <option value="auto">auto</option>
              <option value="low">low</option>
              <option value="high">high</option>
            </select>
          </>
        )}
        <div className={styles.sep} />
        <span className={styles.label}>API Key</span>
        <input
          className={styles.keyInput}
          type={showKey ? 'text' : 'password'}
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder={format === 'openai' ? 'sk-...' : 'sk-ant-...'}
          spellCheck={false}
        />
        <button className={styles.keyToggle} onClick={() => setShowKey(s => !s)}>{showKey ? 'Hide' : 'Show'}</button>
        <div className={styles.sep} />
        <Button variant="primary" onClick={handleSubmit} disabled={loading}>{loading ? 'Sending…' : 'Submit ↵'}</Button>
        <Button variant="danger" onClick={clear}>Clear</Button>
      </div>

      <ResizablePanels>
        {/* Left: inputs */}
        <Panel title="Inputs">
          <div className={styles.inputCol}>
            {/* Image drop zone */}
            <div
              className={`${styles.dropZone} ${dragging ? styles.dragging : ''}`}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            >
              {images.length > 0 ? (
                <div className={styles.thumbGrid}>
                  {images.map(img => (
                    <div key={img.id} className={styles.thumbWrap}>
                      <img src={img.dataUrl} alt={img.name} className={styles.thumb} />
                      <button
                        className={styles.thumbView}
                        onClick={e => { e.stopPropagation(); setViewImg(img) }}
                        title="View"
                      >👁</button>
                      <button
                        className={styles.thumbRemove}
                        onClick={e => { e.stopPropagation(); removeImage(img.id) }}
                        title="Remove"
                      >×</button>
                    </div>
                  ))}
                  <div className={styles.thumbAdd}>+ add more</div>
                </div>
              ) : (
                <div className={styles.dropPrompt}>
                  <span className={styles.dropIcon}>⬆</span>
                  <span>Drop images here, or click to browse</span>
                  <span className={styles.dropSub}>PNG, JPEG, WebP, GIF · multiple supported</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className={styles.hiddenInput} onChange={e => { if (e.target.files) loadFiles(e.target.files) }} />

            {/* System prompt */}
            <label className={styles.fieldLabel}>System prompt <span className={styles.optional}>(optional)</span></label>
            <textarea
              className={styles.textarea}
              rows={2}
              value={system}
              onChange={e => setSystem(e.target.value)}
              placeholder="You are a helpful assistant…"
              spellCheck={false}
            />

            {/* User text */}
            <label className={styles.fieldLabel}>User text message <span className={styles.optional}>(optional)</span></label>
            <textarea
              className={styles.textarea}
              rows={3}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="What is in this image?"
              spellCheck={false}
            />

            {images.length > 0 && (
              <div className={styles.imgMeta}>
                {images.length} image{images.length !== 1 ? 's' : ''} · {(totalBytes / 1024).toFixed(1)} KB total
              </div>
            )}
          </div>
        </Panel>

        {/* Right: JSON / response */}
        <Panel
          title={rightTab === 'json' ? `${format === 'openai' ? 'OpenAI' : 'Anthropic'} Request JSON` : 'Response'}
          actions={
            <>
              <button className={`${styles.tabBtn} ${rightTab === 'json' ? styles.tabActive : ''}`} onClick={() => setRightTab('json')}>JSON</button>
              <button className={`${styles.tabBtn} ${rightTab === 'response' ? styles.tabActive : ''}`} onClick={() => setRightTab('response')}>Response</button>
              {rightTab === 'json'
                ? <Button onClick={copyOutput}>{copied ? 'Copied!' : 'Copy'}</Button>
                : result?.ok && <Button onClick={() => navigator.clipboard.writeText(result.content)}>Copy text</Button>
              }
            </>
          }
        >
          {rightTab === 'json' ? (
            outputJson
              ? <pre className={styles.outputPre}>{outputJson}</pre>
              : <div className={styles.empty}>Add an image or text to generate the request body.</div>
          ) : loading ? (
            <div className={styles.empty}>Waiting for response…</div>
          ) : !result ? (
            <div className={styles.empty}>Click Submit to send the request.</div>
          ) : result.ok ? (
            <div className={styles.responseWrap}>
              <div className={styles.mdContent} dangerouslySetInnerHTML={{ __html: renderMarkdown(result.content) }} />
            </div>
          ) : (
            <div className={styles.errorBox}>
              <strong>Error</strong>
              <pre className={styles.errorPre}>{result.raw || result.error}</pre>
            </div>
          )}
        </Panel>
      </ResizablePanels>
      <StatusBar message={status.msg} kind={status.kind} />

      {viewImg && (
        <div className={styles.lightboxBackdrop} onClick={() => setViewImg(null)}>
          <div className={styles.lightboxBox} onClick={e => e.stopPropagation()}>
            <div className={styles.lightboxHeader}>
              <span className={styles.lightboxName}>{viewImg.name}</span>
              <button className={styles.lightboxClose} onClick={() => setViewImg(null)}>×</button>
            </div>
            <img src={viewImg.dataUrl} alt={viewImg.name} className={styles.lightboxImg} />
            <div className={styles.lightboxMeta}>
              {viewImg.mimeType} · {(viewImg.sizeBytes / 1024).toFixed(1)} KB
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
