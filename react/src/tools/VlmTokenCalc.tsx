import { useState, useCallback, useRef } from 'react'
import Panel from '../components/Panel'
import Button from '../components/Button'
import StatusBar from '../components/StatusBar'
import styles from './VlmTokenCalc.module.css'

// ── Token calculation logic ────────────────────────────────────────────

function clampToBox(w: number, h: number, maxW: number, maxH: number): [number, number] {
  if (w <= maxW && h <= maxH) return [w, h]
  const scale = Math.min(maxW / w, maxH / h)
  return [Math.round(w * scale), Math.round(h * scale)]
}

function calcClaude(w: number, h: number): number {
  const [rw, rh] = clampToBox(w, h, 1568, 1568)
  return Math.ceil(rw / 32) * Math.ceil(rh / 32)
}

function calcOpenAI(w: number, h: number, detail: 'low' | 'high' | 'auto'): number {
  if (detail === 'low') return 85
  const isSmall = w <= 512 && h <= 512
  if (detail === 'auto' && isSmall) return 85
  // high detail: fit to 2048×2048, then tile into 512×512 blocks
  const [rw, rh] = clampToBox(w, h, 2048, 2048)
  const tiles = Math.ceil(rw / 512) * Math.ceil(rh / 512)
  return tiles * 170 + 85
}

// Gemini 1.5 Flash/Pro: fixed 258 tokens per image (≤3072px), above that
// the image is downscaled to fit 3072×3072 and split into 768×768 tiles.
function calcGemini(w: number, h: number): number {
  if (w <= 3072 && h <= 3072) return 258
  const [rw, rh] = clampToBox(w, h, 3072, 3072)
  return Math.ceil(rw / 768) * Math.ceil(rh / 768) * 258
}

// ── Types ──────────────────────────────────────────────────────────────

interface ImageInfo {
  name: string
  width: number
  height: number
  sizeBytes: number
  dataUrl: string
}

interface ProviderResult {
  label: string
  color: string
  tokens: number | null
  detail?: string
}

// ── Component ──────────────────────────────────────────────────────────

export default function VlmTokenCalc() {
  const [image, setImage]       = useState<ImageInfo | null>(null)
  const [detail, setDetail]     = useState<'low' | 'high' | 'auto'>('auto')
  const [status, setStatus]     = useState<{ msg: string; kind: 'ok' | 'err' | 'muted' }>({ msg: '', kind: 'muted' })
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setStatus({ msg: '✖ File must be an image', kind: 'err' })
      return
    }
    const reader = new FileReader()
    reader.onload = e => {
      const dataUrl = e.target?.result as string
      const img = new Image()
      img.onload = () => {
        setImage({ name: file.name, width: img.naturalWidth, height: img.naturalHeight, sizeBytes: file.size, dataUrl })
        setStatus({ msg: `✔ ${img.naturalWidth} × ${img.naturalHeight} px · ${(file.size / 1024).toFixed(1)} KB`, kind: 'ok' })
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) loadFile(file)
  }, [loadFile])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
  }

  const providers: ProviderResult[] = image ? [
    {
      label: 'Claude 3/4',
      color: 'var(--orange)',
      tokens: calcClaude(image.width, image.height),
      detail: 'Tiled 32×32 px, max 1568×1568 resize',
    },
    {
      label: `GPT-4V (${detail})`,
      color: 'var(--green)',
      tokens: calcOpenAI(image.width, image.height, detail),
      detail: detail === 'low'
        ? 'Fixed low-detail cost'
        : 'Tiled 512×512 px, max 2048×2048 resize',
    },
    {
      label: 'Gemini 1.5',
      color: 'var(--purple)',
      tokens: calcGemini(image.width, image.height),
      detail: image.width <= 3072 && image.height <= 3072
        ? 'Fixed 258 tokens for images ≤ 3072 px'
        : 'Tiled 768×768 px (> 3072 px image)',
    },
  ] : []

  const maxTokens = providers.length ? Math.max(...providers.map(p => p.tokens ?? 0)) : 1

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <span className={styles.label}>GPT-4V detail</span>
        <select
          className={styles.select}
          value={detail}
          onChange={e => setDetail(e.target.value as 'low' | 'high' | 'auto')}
        >
          <option value="auto">auto</option>
          <option value="low">low</option>
          <option value="high">high</option>
        </select>
        <div className={styles.sep} />
        <Button variant="danger" onClick={() => { setImage(null); setStatus({ msg: '', kind: 'muted' }); if (fileRef.current) fileRef.current.value = '' }}>
          Clear
        </Button>
      </div>

      <div className={styles.panels}>
        {/* Drop zone */}
        <Panel title="Image Input">
          <div
            className={`${styles.dropZone} ${dragging ? styles.dragging : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            {image ? (
              <img src={image.dataUrl} alt={image.name} className={styles.preview} />
            ) : (
              <div className={styles.dropPrompt}>
                <span className={styles.dropIcon}>⬆</span>
                <span>Drop an image here, or click to browse</span>
                <span className={styles.dropSub}>PNG, JPEG, GIF, WebP…</span>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className={styles.hiddenInput} onChange={onFileChange} />
          <StatusBar message={status.msg} kind={status.kind} />
        </Panel>

        {/* Results */}
        <Panel title="Token Estimates">
          {image ? (
            <div className={styles.results}>
              <div className={styles.imageMetaRow}>
                <span className={styles.metaItem}><span className={styles.metaLabel}>File</span>{image.name}</span>
                <span className={styles.metaItem}><span className={styles.metaLabel}>Dimensions</span>{image.width} × {image.height} px</span>
                <span className={styles.metaItem}><span className={styles.metaLabel}>Size</span>{(image.sizeBytes / 1024).toFixed(1)} KB</span>
              </div>

              <div className={styles.providerList}>
                {providers.map(p => (
                  <div key={p.label} className={styles.providerCard}>
                    <div className={styles.providerTop}>
                      <span className={styles.providerLabel} style={{ color: p.color }}>{p.label}</span>
                      <span className={styles.providerTokens} style={{ color: p.color }}>
                        {p.tokens?.toLocaleString()} tokens
                      </span>
                    </div>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{ width: `${((p.tokens ?? 0) / maxTokens) * 100}%`, background: p.color }}
                      />
                    </div>
                    <span className={styles.providerSub}>{p.detail}</span>
                  </div>
                ))}
              </div>

              <div className={styles.noteBox}>
                <strong>Note:</strong> These are estimates based on publicly documented formulas. Actual billing may vary slightly. All calculations run in-browser — no image data is sent anywhere.
              </div>
            </div>
          ) : (
            <div className={styles.empty}>Upload an image to see token estimates.</div>
          )}
        </Panel>
      </div>
    </div>
  )
}
