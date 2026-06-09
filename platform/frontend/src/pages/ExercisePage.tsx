import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { usePyodide, type TestResult } from '../hooks/usePyodide'
import { ChatPanel } from '../components/ChatPanel'
import api from '../api/client'

interface TestCase {
  id: number; description: string; input: string; expected: string; visible: boolean
}
interface ExerciseData {
  id: string; title: string; slug: string; difficulty: string
  description: string; stub: string; hints: string[]
  book_reference: string | null; test_cases: TestCase[]
}

const DIFF_COLOR: Record<string, string> = {
  '8kyu': '#9b9b9b', '7kyu': '#3b82f6', '6kyu': '#22d3ee',
  '5kyu': '#22c55e', '4kyu': '#eab308', '3kyu': '#f97316',
  '2kyu': '#ef4444', '1kyu': '#a855f7',
}

function renderDesc(text: string) {
  return text
    .replace(/```python([\s\S]*?)```/g,
      '<pre style="background:var(--bg-card);border:1px solid var(--border-lit);border-radius:6px;padding:12px 14px;margin:10px 0;overflow-x:auto;font-family:var(--f-mono);font-size:12px;color:var(--text);line-height:1.6;white-space:pre">$1</pre>')
    .replace(/`([^`]+)`/g,
      '<code style="font-family:var(--f-mono);font-size:12px;background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px;color:var(--cyan)">$1</code>')
    .replace(/^## (.+)$/gm,
      '<h2 style="font-family:var(--f-display);font-size:15px;font-weight:700;color:var(--text);margin:20px 0 8px">$1</h2>')
    .replace(/^### (.+)$/gm,
      '<h3 style="font-family:var(--f-display);font-size:13px;font-weight:600;color:var(--muted);margin:14px 0 6px">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text)">$1</strong>')
    .replace(/\n/g, '<br/>')
}

export default function ExercisePage() {
  const { slug } = useParams<{ slug?: string }>()
  const navigate = useNavigate()
  const [exercise, setExercise] = useState<ExerciseData | null>(null)
  const [code, setCode] = useState('')
  const [results, setResults] = useState<TestResult[] | null>(null)
  const [runType, setRunType] = useState<'test' | 'submit' | null>(null)
  const [running, setRunning] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showHints, setShowHints] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [startTime] = useState(Date.now())
  const { loading: pyLoading, load: loadPy, runTests } = usePyodide()

  useEffect(() => {
    if (!slug) return
    setResults(null); setSubmitted(false); setShowHints(false); setRunType(null)
    api.get(`/exercises/${slug}`).then(r => {
      setExercise(r.data)
      setCode(r.data.stub)
    })
    loadPy()
  }, [slug, loadPy])

  const handleTest = useCallback(async () => {
    if (!exercise) return
    setRunning(true)
    setRunType('test')
    try {
      const visible = exercise.test_cases.filter(tc => tc.visible)
      setResults(await runTests(code, exercise.stub, visible))
    } finally {
      setRunning(false)
    }
  }, [exercise, code, runTests])

  const handleSubmit = useCallback(async () => {
    if (!exercise || running) return
    setRunning(true)
    setRunType('submit')
    try {
      const allResults = await runTests(code, exercise.stub, exercise.test_cases)
      setResults(allResults)
      const passed = allResults.filter(r => r.passed).length
      if (passed === allResults.length) {
        await api.post('/submissions', {
          exercise_id: exercise.id, code,
          status: 'passed',
          test_results: allResults,
          time_spent_seconds: Math.round((Date.now() - startTime) / 1000),
        })
        setSubmitted(true)
      }
    } finally {
      setRunning(false)
    }
  }, [exercise, code, runTests, startTime, running])

  const passedCount = results?.filter(r => r.passed).length ?? 0
  const totalCount = results?.length ?? 0
  const allPassed = results ? passedCount === totalCount : false
  const hiddenCount = exercise ? exercise.test_cases.filter(tc => !tc.visible).length : 0

  if (!slug || !exercise) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="f-mono" style={{ color: 'var(--muted)', fontSize: 12 }}>
        {!slug ? 'carregando...' : 'carregando exercício...'}
      </span>
    </div>
  )

  const diffColor = DIFF_COLOR[exercise.difficulty] || 'var(--muted)'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Difficulty stripe */}
      <div style={{ height: 3, background: diffColor, flexShrink: 0 }} />

      {/* Top bar */}
      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 18px', height: 40,
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
      }}>
        <button
          onClick={() => navigate('/exercise')}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--border-lit)', padding: '4px 0', transition: 'color 150ms',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--muted)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--border-lit)'}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="f-mono" style={{ fontSize: 10 }}>kata</span>
        </button>

        <div style={{ width: 1, height: 12, background: 'var(--border)' }} />

        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px',
          borderRadius: 4, background: `${diffColor}14`,
          border: `1px solid ${diffColor}30`,
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: diffColor, letterSpacing: '0.05em', fontFamily: 'var(--f-mono)' }}>
            {exercise.difficulty}
          </span>
        </div>

        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', letterSpacing: '-0.01em', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {exercise.title}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {exercise.book_reference && (
            <span className="f-mono" style={{ fontSize: 10, color: 'var(--muted)', opacity: 0.6 }}>
              {exercise.book_reference}
            </span>
          )}
          {pyLoading && (
            <span className="f-mono" style={{ fontSize: 10, color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
              python
            </span>
          )}
        </div>
      </div>

      {/* Split pane */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left — description */}
        <div style={{
          width: '38%', flexShrink: 0, overflowY: 'auto',
          padding: '24px 26px 24px 22px',
          borderRight: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--muted)' }}
            dangerouslySetInnerHTML={{ __html: renderDesc(exercise.description) }} />

          {/* Visible test cases */}
          <div style={{ marginTop: 28 }}>
            <p className="section-label" style={{ marginBottom: 10 }}>test cases</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {exercise.test_cases.filter(tc => tc.visible).map(tc => (
                <div key={tc.id} className="card" style={{ padding: '10px 14px' }}>
                  <p className="f-mono" style={{ fontSize: 10, color: 'var(--muted)', opacity: 0.6, marginBottom: 5 }}>
                    {tc.description}
                  </p>
                  <p className="f-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                    input: <span style={{ color: 'var(--text)' }}>{tc.input}</span>
                  </p>
                  <p className="f-mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    expected: <span style={{ color: 'var(--green)' }}>{tc.expected}</span>
                  </p>
                </div>
              ))}
              {hiddenCount > 0 && (
                <p className="f-mono" style={{ fontSize: 10, color: 'var(--muted)', opacity: 0.4, margin: '4px 0 0' }}>
                  + {hiddenCount} caso{hiddenCount !== 1 ? 's' : ''} oculto{hiddenCount !== 1 ? 's' : ''} — revelados no Submit
                </p>
              )}
            </div>
          </div>

          {/* Hints */}
          {exercise.hints.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <button onClick={() => setShowHints(!showHints)} className="f-mono"
                style={{
                  fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  color: showHints ? 'var(--cyan)' : 'var(--muted)',
                  display: 'flex', alignItems: 'center', gap: 6, transition: 'color 150ms',
                }}>
                <span style={{ fontSize: 9 }}>{showHints ? '▼' : '▶'}</span>
                {showHints ? 'ocultar dicas' : `dicas (${exercise.hints.length})`}
              </button>
              {showHints && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {exercise.hints.map((h, i) => (
                    <div key={i} className="hint-block">
                      <p className="f-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                        <span style={{ color: 'var(--cyan)' }}>{i + 1}.</span> {h}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right — editor + actions + results + chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Monaco */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <Editor
              height="100%"
              defaultLanguage="python"
              value={code}
              onChange={v => setCode(v || '')}
              theme="vs-dark"
              options={{
                fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: 22,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                renderLineHighlight: 'line',
                padding: { top: 16, bottom: 16 },
                wordWrap: 'on',
                overviewRulerLanes: 0,
                folding: false,
              }}
            />
          </div>

          {/* Action bar */}
          <div style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 14px', borderTop: '1px solid var(--border)',
            background: 'var(--bg)',
          }}>
            {/* Test button */}
            <button
              onClick={handleTest}
              disabled={running || pyLoading || submitted}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 5, cursor: running || pyLoading || submitted ? 'not-allowed' : 'pointer',
                background: 'transparent',
                border: '1px solid var(--border-lit)',
                color: running && runType === 'test' ? 'var(--cyan)' : 'var(--muted)',
                fontSize: 12, fontFamily: 'var(--f-mono)',
                transition: 'all 120ms', opacity: submitted ? 0.4 : 1,
              }}
              onMouseEnter={e => { if (!running && !submitted) e.currentTarget.style.borderColor = 'var(--muted)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-lit)' }}
            >
              {running && runType === 'test'
                ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span> testando...</>
                : <>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                    Test
                  </>
              }
            </button>

            {/* Submit button */}
            {!submitted ? (
              <button
                onClick={handleSubmit}
                disabled={running || pyLoading}
                className="btn btn-cyan"
                style={{ opacity: running || pyLoading ? 0.6 : 1 }}
              >
                {running && runType === 'submit'
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
                      submetendo...
                    </span>
                  : <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Submit Solution
                    </span>
                }
              </button>
            ) : (
              <span className="f-mono" style={{ fontSize: 12, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                solução aceita
              </span>
            )}

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Results counter */}
            {results && (
              <span className="f-mono" style={{
                fontSize: 11,
                color: allPassed ? 'var(--green)' : 'var(--red)',
              }}>
                {passedCount}/{totalCount}
                {runType === 'test' && (
                  <span style={{ color: 'var(--muted)', marginLeft: 4 }}>visíveis</span>
                )}
              </span>
            )}

            {/* Chat toggle */}
            <button
              onClick={() => setShowChat(v => !v)}
              title="Chat com IA"
              style={{
                width: 28, height: 28, borderRadius: 5, flexShrink: 0,
                background: showChat ? 'rgba(34,211,238,0.1)' : 'transparent',
                border: `1px solid ${showChat ? 'rgba(34,211,238,0.3)' : 'var(--border)'}`,
                color: showChat ? 'var(--cyan)' : 'var(--muted)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 120ms',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          </div>

          {/* Test mode banner */}
          {results && runType === 'test' && (
            <div style={{
              flexShrink: 0, padding: '6px 14px',
              borderTop: '1px solid var(--border)',
              background: 'rgba(34,211,238,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span className="f-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
                testado com {totalCount} caso{totalCount !== 1 ? 's' : ''} visível{totalCount !== 1 ? 'is' : ''}
                {hiddenCount > 0 && ` — ${hiddenCount} oculto${hiddenCount !== 1 ? 's' : ''} serão testados no Submit`}
              </span>
              <button
                onClick={handleSubmit}
                disabled={running || pyLoading}
                style={{
                  fontSize: 10, fontFamily: 'var(--f-mono)', fontWeight: 600,
                  color: 'var(--cyan)', background: 'none', border: 'none',
                  cursor: 'pointer', padding: 0, opacity: running ? 0.5 : 1,
                }}
              >
                Submit →
              </button>
            </div>
          )}

          {/* Test results */}
          {results && (
            <div style={{
              flexShrink: 0, maxHeight: 200, overflowY: 'auto',
              borderTop: '1px solid var(--border)', padding: '10px 14px',
              display: 'flex', flexDirection: 'column', gap: 5,
              background: 'var(--bg)',
            }}>
              {results.map((r, i) => {
                const tc = exercise.test_cases.find(t => t.id === r.id) ?? exercise.test_cases[i]
                return (
                  <div key={i} style={{
                    padding: '9px 12px', borderRadius: 7,
                    background: r.passed ? 'rgba(63,185,80,0.04)' : 'rgba(248,81,73,0.04)',
                    border: `1px solid ${r.passed ? 'rgba(63,185,80,0.18)' : 'rgba(248,81,73,0.18)'}`,
                    display: 'flex', gap: 10,
                  }}>
                    <span style={{ color: r.passed ? 'var(--green)' : 'var(--red)', flexShrink: 0, paddingTop: 1 }}>
                      {r.passed
                        ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                        : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      }
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="f-mono" style={{ fontSize: 10, color: 'var(--muted)', opacity: 0.6, marginBottom: 3 }}>
                        {tc?.description ?? `test ${i + 1}`}
                      </p>
                      {r.passed
                        ? <p className="f-mono" style={{ fontSize: 11, color: 'var(--green)' }}>{r.output}</p>
                        : <>
                            <p className="f-mono" style={{ fontSize: 11, color: 'var(--red)' }}>
                              got: <span style={{ color: 'var(--text)' }}>{r.output}</span>
                            </p>
                            <p className="f-mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                              expected: <span style={{ color: 'var(--green)' }}>{tc?.expected ?? r.expected}</span>
                            </p>
                          </>
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Chat panel */}
          {showChat && (
            <div style={{
              flexShrink: 0, height: 280,
              borderTop: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              <div style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 14px', borderBottom: '1px solid var(--border)',
                background: 'var(--bg-card)',
              }}>
                <span className="f-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>
                  IA — {exercise.title}
                </span>
                <button onClick={() => setShowChat(false)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--muted)', fontSize: 16, lineHeight: 1, padding: 0,
                }}>×</button>
              </div>
              <ChatPanel
                context={`kata:${exercise.slug}`}
                style={{ flex: 1, minHeight: 0 }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
