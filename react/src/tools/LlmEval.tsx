import { useState, useCallback } from 'react'
import Panel from '../components/Panel'
import Button from '../components/Button'
import ResizablePanels from '../components/ResizablePanels'
import styles from './LlmEval.module.css'

// ── Criteria ──────────────────────────────────────────────────────────

const CRITERIA = [
  { id: 'relevance',    label: 'Relevance',    desc: 'Directly addresses the question' },
  { id: 'accuracy',     label: 'Accuracy',     desc: 'Factually correct' },
  { id: 'completeness', label: 'Completeness', desc: 'Covers all key points' },
  { id: 'coherence',    label: 'Coherence',    desc: 'Logically structured' },
  { id: 'conciseness',  label: 'Conciseness',  desc: 'Appropriately concise' },
  { id: 'tone',         label: 'Tone',         desc: 'Appropriate for context' },
  { id: 'helpfulness',  label: 'Helpfulness',  desc: 'Genuinely useful to the user' },
] as const

type CriterionId = typeof CRITERIA[number]['id']
type Scores = Record<CriterionId, number>
type ABScores = Record<CriterionId, { a: number; b: number }>

// ── Helpers ───────────────────────────────────────────────────────────

function scoreColor(v: number, max = 10) {
  const p = v / max
  if (p >= 0.8) return 'var(--green)'
  if (p >= 0.5) return 'var(--orange)'
  return 'var(--red)'
}

function verdictLabel(avg: number) {
  if (avg >= 8.5) return 'Excellent'
  if (avg >= 7)   return 'Good'
  if (avg >= 5)   return 'Fair'
  return 'Poor'
}

function initScores(): Scores {
  return Object.fromEntries(CRITERIA.map(c => [c.id, 5])) as Scores
}
function initABScores(): ABScores {
  return Object.fromEntries(CRITERIA.map(c => [c.id, { a: 5, b: 5 }])) as ABScores
}

function uid() { return Math.random().toString(36).slice(2) }

interface RubricItem { id: string; text: string; state: 'pass' | 'fail' | null }

const DEFAULT_RUBRIC: RubricItem[] = [
  { id: uid(), text: 'Answers the question directly', state: null },
  { id: uid(), text: 'No hallucinated facts', state: null },
  { id: uid(), text: 'Appropriate length', state: null },
  { id: uid(), text: 'Uses correct formatting', state: null },
  { id: uid(), text: 'Maintains appropriate tone', state: null },
]

// ── Slider row ────────────────────────────────────────────────────────

function ScoreSlider({ label, desc, value, onChange }: { label: string; desc: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className={styles.criterion}>
      <div className={styles.criterionTop}>
        <span className={styles.criterionLabel}>{label}</span>
        <span className={styles.criterionDesc}>{desc}</span>
      </div>
      <div className={styles.scoreRow}>
        <input type="range" min={1} max={10} value={value} onChange={e => onChange(Number(e.target.value))} className={styles.slider} />
        <span className={styles.scoreBadge} style={{ color: scoreColor(value) }}>{value}</span>
      </div>
    </div>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────

type Tab = 'score' | 'compare' | 'rubric'

export default function LlmEval() {
  const [tab, setTab] = useState<Tab>('score')

  // Score state
  const [sInput, setSInput]   = useState('')
  const [sScores, setSScores] = useState<Scores>(initScores)
  const [sNotes, setSNotes]   = useState('')
  const [sExport, setSExport] = useState('')

  // AB state
  const [abA, setAbA]         = useState('')
  const [abB, setAbB]         = useState('')
  const [abScores, setAbScores] = useState<ABScores>(initABScores)
  const [abNotes, setAbNotes] = useState('')
  const [abExport, setAbExport] = useState('')

  // Rubric state
  const [rInput, setRInput]   = useState('')
  const [rubric, setRubric]   = useState<RubricItem[]>(DEFAULT_RUBRIC.map(r => ({ ...r })))
  const [newCrit, setNewCrit] = useState('')
  const [rExport, setRExport] = useState('')

  // ── Score tab ────────────────────────────────────────────────────────

  const sAvg = Object.values(sScores).reduce((a, b) => a + b, 0) / CRITERIA.length
  const sRounded = Math.round(sAvg * 10) / 10

  const exportScore = () => {
    setSExport(JSON.stringify({
      overall: sRounded, verdict: verdictLabel(sAvg),
      scores: sScores, notes: sNotes,
      response_preview: sInput.slice(0, 120),
      evaluated_at: new Date().toISOString(),
    }, null, 2))
  }

  // ── AB tab ───────────────────────────────────────────────────────────

  const abTotA = CRITERIA.reduce((s, c) => s + abScores[c.id].a, 0)
  const abTotB = CRITERIA.reduce((s, c) => s + abScores[c.id].b, 0)
  const abAvgA = (abTotA / CRITERIA.length).toFixed(1)
  const abAvgB = (abTotB / CRITERIA.length).toFixed(1)
  const abWinner = abTotA > abTotB ? 'A' : abTotB > abTotA ? 'B' : 'tie'

  const setAbScore = useCallback((id: CriterionId, side: 'a' | 'b', v: number) => {
    setAbScores(prev => ({ ...prev, [id]: { ...prev[id], [side]: v } }))
  }, [])

  const exportAB = () => {
    setAbExport(JSON.stringify({
      winner: abWinner, avg_a: abAvgA, avg_b: abAvgB,
      scores: abScores, notes: abNotes,
      evaluated_at: new Date().toISOString(),
    }, null, 2))
  }

  // ── Rubric tab ───────────────────────────────────────────────────────

  const passed   = rubric.filter(r => r.state === 'pass').length
  const evaluated = rubric.filter(r => r.state !== null).length
  const passRate  = evaluated ? Math.round((passed / evaluated) * 100) : 0

  const toggleRubric = (id: string, state: 'pass' | 'fail') =>
    setRubric(prev => prev.map(r => r.id === id ? { ...r, state: r.state === state ? null : state } : r))

  const addCrit = () => {
    if (!newCrit.trim()) return
    setRubric(prev => [...prev, { id: uid(), text: newCrit.trim(), state: null }])
    setNewCrit('')
  }

  const exportRubric = () => {
    setRExport(JSON.stringify({
      passed, failed: rubric.filter(r => r.state === 'fail').length,
      unevaluated: rubric.filter(r => r.state === null).length,
      pass_rate: evaluated ? `${passRate}%` : 'N/A',
      criteria: rubric.map(r => ({ criterion: r.text, result: r.state })),
      response_preview: rInput.slice(0, 120),
      evaluated_at: new Date().toISOString(),
    }, null, 2))
  }

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className={styles.root}>
      <div className={styles.tabs}>
        {(['score', 'compare', 'rubric'] as Tab[]).map(t => (
          <button key={t} className={`${styles.tabBtn} ${tab === t ? styles.active : ''}`} onClick={() => setTab(t)}>
            {{ score: 'Score', compare: 'A/B Compare', rubric: 'Rubric' }[t]}
          </button>
        ))}
      </div>

      {/* ── Score ── */}
      {tab === 'score' && (
        <ResizablePanels defaultSplit={33}>
          <Panel title="Response">
            <textarea className={styles.textarea} value={sInput} onChange={e => setSInput(e.target.value)}
              placeholder="Paste the LLM response to evaluate…" spellCheck={false} />
          </Panel>

          <ResizablePanels defaultSplit={55}>
            <Panel title="Scoring Criteria">
              <div className={styles.scroll}>
                <div className={styles.criteriaList}>
                  {CRITERIA.map(c => (
                    <ScoreSlider key={c.id} label={c.label} desc={c.desc} value={sScores[c.id]}
                      onChange={v => setSScores(prev => ({ ...prev, [c.id]: v }))} />
                  ))}
                </div>
                <div className={styles.sectionTitle} style={{ marginTop: 20 }}>Evaluator Notes</div>
                <textarea className={styles.notesArea} value={sNotes} onChange={e => setSNotes(e.target.value)}
                  placeholder="Optional notes or justification…" />
              </div>
            </Panel>

            <Panel title="Summary" actions={<Button onClick={exportScore}>Export JSON</Button>}>
              <div className={styles.scroll}>
                <div className={styles.scoreCard}>
                  <div className={styles.bigScore} style={{ color: scoreColor(sAvg) }}>{sRounded}</div>
                  <div className={styles.scoreLabel}>Overall Score / 10</div>
                  <div className={styles.verdictBadge}>{verdictLabel(sAvg)}</div>
                </div>

                <div className={styles.sectionTitle}>Breakdown</div>
                {CRITERIA.map(c => (
                  <div key={c.id} className={styles.breakdownRow}>
                    <div className={styles.breakdownMeta}>
                      <span>{c.label}</span>
                      <span style={{ color: scoreColor(sScores[c.id]), fontWeight: 700 }}>{sScores[c.id]}/10</span>
                    </div>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: `${sScores[c.id] * 10}%`, background: scoreColor(sScores[c.id]) }} />
                    </div>
                  </div>
                ))}

                {sExport && (
                  <>
                    <div className={styles.sectionTitle} style={{ marginTop: 16 }}>Export</div>
                    <pre className={styles.exportPre}>{sExport}</pre>
                    <Button style={{ marginTop: 8 }} onClick={() => navigator.clipboard.writeText(sExport)}>Copy JSON</Button>
                  </>
                )}
              </div>
            </Panel>
          </ResizablePanels>
        </ResizablePanels>
      )}

      {/* ── A/B Compare ── */}
      {tab === 'compare' && (
        <ResizablePanels defaultSplit={33}>
          <Panel title="Response A" titleColor="#60a5fa">
            <textarea className={styles.textarea} value={abA} onChange={e => setAbA(e.target.value)} placeholder="Paste Response A…" spellCheck={false} />
          </Panel>
          <ResizablePanels defaultSplit={55}>
          <Panel title="Response B" titleColor="#f472b6">
            <textarea className={styles.textarea} value={abB} onChange={e => setAbB(e.target.value)} placeholder="Paste Response B…" spellCheck={false} />
          </Panel>

          <Panel title="Comparative Scores" actions={<Button onClick={exportAB}>Export JSON</Button>}>
            <div className={styles.scroll}>
              {CRITERIA.map(c => (
                <div key={c.id} className={styles.abCriterion}>
                  <div className={styles.abCriterionLabel}>{c.label}</div>
                  <div className={styles.abScoreRow}>
                    <span className={styles.abSideLabel} style={{ color: '#60a5fa' }}>A</span>
                    <input type="range" min={1} max={10} value={abScores[c.id].a} className={styles.slider}
                      onChange={e => setAbScore(c.id, 'a', Number(e.target.value))} />
                    <span className={styles.abVal} style={{ color: '#60a5fa' }}>{abScores[c.id].a}</span>
                  </div>
                  <div className={styles.abScoreRow}>
                    <span className={styles.abSideLabel} style={{ color: '#f472b6' }}>B</span>
                    <input type="range" min={1} max={10} value={abScores[c.id].b} className={styles.slider}
                      onChange={e => setAbScore(c.id, 'b', Number(e.target.value))} />
                    <span className={styles.abVal} style={{ color: '#f472b6' }}>{abScores[c.id].b}</span>
                  </div>
                </div>
              ))}

              <div className={`${styles.winnerBanner} ${abWinner === 'A' ? styles.winnerA : abWinner === 'B' ? styles.winnerB : styles.winnerTie}`}>
                {abWinner === 'tie' ? `🤝 Tie (${abAvgA} = ${abAvgB})` : `🏆 Response ${abWinner} wins (${abWinner === 'A' ? abAvgA : abAvgB} vs ${abWinner === 'A' ? abAvgB : abAvgA})`}
              </div>

              <div className={styles.sectionTitle} style={{ marginTop: 16 }}>Notes</div>
              <textarea className={styles.notesArea} value={abNotes} onChange={e => setAbNotes(e.target.value)} placeholder="Comparison notes…" />

              {abExport && (
                <>
                  <pre className={styles.exportPre} style={{ marginTop: 12 }}>{abExport}</pre>
                  <Button style={{ marginTop: 8 }} onClick={() => navigator.clipboard.writeText(abExport)}>Copy JSON</Button>
                </>
              )}
            </div>
          </Panel>
          </ResizablePanels>
        </ResizablePanels>
      )}

      {/* ── Rubric ── */}
      {tab === 'rubric' && (
        <ResizablePanels>
          <Panel title="Response">
            <textarea className={styles.textarea} value={rInput} onChange={e => setRInput(e.target.value)}
              placeholder="Paste the LLM response to evaluate…" spellCheck={false} />
          </Panel>

          <Panel title="Checklist" actions={<Button onClick={exportRubric}>Export JSON</Button>}>
            <div className={styles.scroll}>
              <div className={styles.rubricSummary}>
                <div className={styles.rubricBig} style={{ color: scoreColor(passRate, 100) }}>{passed} / {evaluated}</div>
                <div className={styles.rubricSub}>
                  {evaluated ? `${passRate}% pass rate · ${rubric.length - evaluated} unevaluated` : 'No criteria evaluated yet'}
                </div>
              </div>

              <div className={styles.rubricAdd}>
                <input className={styles.rubricInput} value={newCrit} onChange={e => setNewCrit(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCrit()}
                  placeholder="Add a criterion… e.g. 'Cites sources'" />
                <Button onClick={addCrit}>Add</Button>
              </div>

              <div className={styles.rubricList}>
                {rubric.map(item => (
                  <div key={item.id} className={`${styles.rubricItem} ${item.state === 'pass' ? styles.rubricPass : item.state === 'fail' ? styles.rubricFail : ''}`}>
                    <div className={styles.rubricBtns}>
                      <Button className={item.state === 'pass' ? styles.activePass : ''} onClick={() => toggleRubric(item.id, 'pass')}>✔ Pass</Button>
                      <Button className={item.state === 'fail' ? styles.activeFail : ''} onClick={() => toggleRubric(item.id, 'fail')}>✖ Fail</Button>
                    </div>
                    <span className={styles.rubricText}>{item.text}</span>
                    <button className={styles.rubricDel} onClick={() => setRubric(prev => prev.filter(r => r.id !== item.id))}>×</button>
                  </div>
                ))}
              </div>

              {rExport && (
                <>
                  <pre className={styles.exportPre} style={{ marginTop: 14 }}>{rExport}</pre>
                  <Button style={{ marginTop: 8 }} onClick={() => navigator.clipboard.writeText(rExport)}>Copy JSON</Button>
                </>
              )}
            </div>
          </Panel>
        </ResizablePanels>
      )}
    </div>
  )
}
