import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { useAuth } from '../auth/AuthContext'
import StarfieldFooter from '../components/StarfieldFooter'
import api from '../api/client'

interface Exercise {
  id: string; title: string; slug: string
  difficulty: string; module: string; tags: string[]; description: string
}
interface Summary {
  current_streak: number
  completed_last_7_days: number
  daily_breakdown: { date: string; completed: number }[]
}
interface Resume {
  exercise: { title: string; slug: string; difficulty: string }
  passed_count: number
  total_count: number
  submitted_at: string | null
}
interface Insight {
  message: string
  generated_at: string
  highlights: string[]
  gaps: string[]
}
interface RecentExercise {
  id: string; title: string; slug: string
  difficulty: string; tags: string[]
  status: string; submitted_at: string
}

type HistoryItemType = 'exercise' | 'course' | 'book' | 'chat'

interface HistoryItem {
  id: string
  type: HistoryItemType
  title: string
  slug: string
  submitted_at: string
  // exercise
  difficulty?: string
  status?: string
  tags?: string[]
  // course / book
  progress?: number   // 0-100
  // chat
  preview?: string
  context?: string
}

const DIFF_COLOR: Record<string, string> = {
  '8kyu': '#9b9b9b', '7kyu': '#3b82f6', '6kyu': '#22d3ee',
  '5kyu': '#22c55e', '4kyu': '#eab308', '3kyu': '#f97316',
  '2kyu': '#ef4444', '1kyu': '#a855f7',
}
const DIFF_ORDER: Record<string, number> = {
  '8kyu': 0, '7kyu': 1, '6kyu': 2, '5kyu': 3,
  '4kyu': 4, '3kyu': 5, '2kyu': 6, '1kyu': 7,
}

const MODES = [
  { key: 'rankup',   label: 'Rank Up',    dot: '⚡', color: '#22d3ee', color2: '#3b82f6' },
  { key: 'warmup',   label: 'Aquecimento', dot: '🔥', color: '#f97316', color2: '#fbbf24' },
  { key: 'practice', label: 'Praticar',   dot: '●',  color: '#22c55e', color2: '#4ade80' },
] as const

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3.6e6), d = Math.floor(diff / 8.64e7)
  if (d > 0) return `${d}d`
  if (h > 0) return `${h}h`
  return 'agora'
}

const sectionLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, letterSpacing: '0.10em',
  textTransform: 'uppercase', color: 'rgba(240,240,240,0.5)',
}

// Assign exercises to modes: hardest→rankup, easiest→warmup, middle→practice
function assignModes(exercises: Exercise[]): Record<string, Exercise | null> {
  if (exercises.length === 0) return { rankup: null, warmup: null, practice: null }
  const sorted = [...exercises].sort(
    (a, b) => (DIFF_ORDER[b.difficulty] ?? 0) - (DIFF_ORDER[a.difficulty] ?? 0)
  )
  return {
    rankup:   sorted[0] ?? null,
    warmup:   sorted[sorted.length - 1] ?? null,
    practice: sorted.length >= 3 ? sorted[1] : sorted[1] ?? null,
  }
}

// ── MiniHeatmap ───────────────────────────────────────────────────────────────
function MiniHeatmap({ breakdown }: { breakdown: { date: string; completed: number }[] }) {
  const map = Object.fromEntries(breakdown.map(d => [d.date, d.completed]))
  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (27 - i))
    const key = d.toISOString().split('T')[0]
    return { key, count: map[key] || 0 }
  })
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
      {days.map(({ key, count }) => (
        <div key={key} title={`${key}: ${count}`} style={{
          width: 10, height: 10, borderRadius: 2,
          background: count === 0 ? 'var(--border)'
            : count === 1 ? 'rgba(34,211,238,0.35)'
            : 'var(--cyan)',
        }} />
      ))}
    </div>
  )
}

// ── ResumeCard ────────────────────────────────────────────────────────────────
function ResumeCard({ resume }: { resume: Resume }) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)
  const c = DIFF_COLOR[resume.exercise.difficulty] || '#525252'
  const pct = resume.total_count > 0
    ? Math.round((resume.passed_count / resume.total_count) * 100)
    : 0

  return (
    <button
      onClick={() => navigate(`/exercise/${resume.exercise.slug}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        padding: '14px 18px',
        background: hovered ? 'var(--bg-hover)' : 'var(--bg-card)',
        border: `1px solid ${hovered ? c + '50' : c + '28'}`,
        borderLeft: `3px solid ${c}`,
        borderRadius: 6,
        display: 'flex', alignItems: 'center', gap: 16,
        transition: 'background 120ms, border-color 120ms',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: c, fontFamily: 'var(--f-mono)', letterSpacing: '0.08em' }}>
            {resume.exercise.difficulty}
          </span>
          <span style={{
            fontSize: 13, fontWeight: 600, color: 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            letterSpacing: '-0.01em',
          }}>
            {resume.exercise.title}
          </span>
        </div>
        {resume.total_count > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 2, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${pct}%`,
                background: pct === 100 ? 'var(--green)' : c,
                transition: 'width 400ms ease',
              }} />
            </div>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--f-mono)', flexShrink: 0 }}>
              {resume.passed_count}/{resume.total_count}
            </span>
          </div>
        )}
      </div>
      <div style={{
        fontSize: 11, fontWeight: 600, color: c, fontFamily: 'var(--f-mono)', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 5,
        opacity: hovered ? 1 : 0.7, transition: 'opacity 120ms',
      }}>
        continuar
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
        </svg>
      </div>
    </button>
  )
}

// ── TrainerWidget — visual original, cada modo tem exercício pré-atribuído ───
function TrainerWidget({ exercises }: { exercises: Exercise[] }) {
  const navigate = useNavigate()
  const [selectedKey, setSelectedKey] = useState<string>('rankup')

  const assigned = assignModes(exercises)
  const modeIdx = MODES.findIndex(m => m.key === selectedKey)
  const mode = MODES[modeIdx]
  const current = assigned[selectedKey]

  return (
    <div style={{
      padding: '1.5px',
      borderRadius: 10,
      background: `linear-gradient(144deg, ${mode.color}, ${mode.color2} 50%, ${mode.color}88)`,
      boxShadow: `${mode.color}22 0 18px 32px -5px`,
      transition: 'background 280ms, box-shadow 280ms',
    }}>
    <div style={{
      borderRadius: 9, overflow: 'hidden',
      background: 'var(--bg-card)',
    }}>
      {/* Header — seletor de modo */}
      <div style={{
        padding: '12px 16px',
        background: `linear-gradient(135deg, ${mode.color}50 0%, ${mode.color2}30 100%)`,
        borderBottom: `1px solid ${mode.color}50`,
        display: 'flex', alignItems: 'center', gap: 6,
        transition: 'background 280ms, border-color 280ms',
      }}>
        {MODES.map(m => {
          const active = m.key === selectedKey
          return (
            <button
              key={m.key}
              onClick={() => setSelectedKey(m.key)}
              style={{
                height: 28, padding: '0 12px', borderRadius: 14,
                border: `1px solid ${active ? `${m.color}65` : `${m.color}30`}`,
                background: active ? `${m.color}22` : `${m.color}0a`,
                color: active ? m.color : `${m.color}70`,
                cursor: 'pointer',
                fontSize: 11, fontWeight: active ? 700 : 500,
                fontFamily: 'var(--f-mono)',
                display: 'flex', alignItems: 'center', gap: 5,
                transition: 'all 150ms',
                letterSpacing: active ? '0.02em' : '0',
              }}
            >
              {m.label}
            </button>
          )
        })}
      </div>

      {/* Body */}
      <div style={{ padding: '16px 16px 18px' }}>
        {current ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', flexShrink: 0,
                color: DIFF_COLOR[current.difficulty] || '#525252',
                background: `${DIFF_COLOR[current.difficulty] || '#525252'}18`,
                border: `1px solid ${DIFF_COLOR[current.difficulty] || '#525252'}40`,
                padding: '2px 8px', borderRadius: 3,
                fontFamily: 'var(--f-mono)',
              }}>
                {current.difficulty}
              </span>
              <p style={{
                fontSize: 14, fontWeight: 700, color: 'var(--text)',
                margin: 0, letterSpacing: '-0.02em', lineHeight: 1.3,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {current.title}
              </p>
            </div>
            {current.description ? (
              <div style={{
                fontSize: 11, color: 'var(--text)', margin: '0 0 18px',
                lineHeight: 1.65,
                display: '-webkit-box', WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <span>{children}</span>,
                    strong: ({ children }) => <strong style={{ color: 'var(--text)' }}>{children}</strong>,
                    code: ({ children }) => <code style={{ fontFamily: 'var(--f-mono)', fontSize: 10, color: 'var(--cyan)' }}>{children}</code>,
                    a: ({ children }) => <span>{children}</span>,
                  }}
                >
                  {current.description}
                </ReactMarkdown>
              </div>
            ) : <div style={{ marginBottom: 18 }} />}
          </>
        ) : (
          <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 18px', opacity: 0.4 }}>
            nenhum exercício disponível — o agente gera novos às 06:00.
          </p>
        )}

        <button
          onClick={() => current
            ? navigate(`/exercise/${current.slug}`)
            : navigate(`/exercise?mode=${selectedKey}`)
          }
          style={{
            height: 32, padding: '0 20px', borderRadius: 6,
            background: `${mode.color}30`,
            border: `1px solid ${mode.color}65`,
            color: mode.color, cursor: 'pointer',
            fontSize: 12, fontWeight: 700, fontFamily: 'var(--f-mono)',
            letterSpacing: '0.05em',
            boxShadow: `0 0 10px ${mode.color}18`,
            transition: 'background 120ms, box-shadow 120ms',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = `${mode.color}42`
            e.currentTarget.style.boxShadow = `0 0 16px ${mode.color}30`
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = `${mode.color}30`
            e.currentTarget.style.boxShadow = `0 0 10px ${mode.color}18`
          }}
        >
          Treinar
        </button>
      </div>
    </div>
    </div>
  )
}

const STATUS_CFG = {
  passed:      { label: 'concluído',    icon: '✓', color: '#22c55e' },
  failed:      { label: 'falhou',       icon: '✗', color: '#f97316' },
  in_progress: { label: 'em progresso', icon: '◉', color: '#22d3ee' },
} as const
type StatusKey = keyof typeof STATUS_CFG

const TYPE_CFG: Record<HistoryItemType, { label: string; color: string }> = {
  exercise: { label: 'kata',   color: '#22d3ee' },
  course:   { label: 'curso',  color: '#a855f7' },
  book:     { label: 'livro',  color: '#f59e0b' },
  chat:     { label: 'chat IA', color: '#64748b' },
}

// ── HistoryCard ───────────────────────────────────────────────────────────────
function HistoryCard({ item }: { item: HistoryItem }) {
  const navigate = useNavigate()
  const [hov, setHov] = useState(false)
  const typeCfg = TYPE_CFG[item.type]

  // For exercises: status-based accent; for others: type color
  let accentColor = typeCfg.color
  let statusLabel = ''
  let statusIcon = ''
  if (item.type === 'exercise') {
    const daysSince = (Date.now() - new Date(item.submitted_at).getTime()) / (24 * 3600 * 1000)
    const st: StatusKey =
      item.status === 'in_progress' && daysSince > 2 ? 'failed'
      : (item.status as StatusKey) in STATUS_CFG ? (item.status as StatusKey)
      : 'in_progress'
    accentColor = STATUS_CFG[st].color
    statusLabel = STATUS_CFG[st].label
    statusIcon  = STATUS_CFG[st].icon
  }

  const diffColor = DIFF_COLOR[item.difficulty ?? ''] || '#525252'

  return (
    <button
      onClick={() => navigate(
        item.type === 'exercise' ? `/exercise/${item.slug}`
        : item.type === 'chat'   ? `/chats/${item.slug}`
        : `/${item.type}s/${item.slug}`
      )}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 210, height: 148, flexShrink: 0,
        textAlign: 'left', cursor: 'pointer',
        padding: '12px 14px 12px 16px',
        background: hov ? `color-mix(in srgb, var(--bg-card) 92%, ${accentColor})` : 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${hov ? accentColor : accentColor + '60'}`,
        borderRadius: 8,
        display: 'flex', flexDirection: 'column', gap: 0,
        boxShadow: hov ? `0 6px 24px rgba(0,0,0,0.4), 0 0 0 1px ${accentColor}22` : 'none',
        transition: 'background 180ms, border-left-color 180ms, box-shadow 180ms, transform 180ms',
        transform: hov ? 'translateY(-4px)' : 'none',
      }}
    >
      {/* Top row: type badge + status/progress */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        {/* Left: diff badge (exercise) or type pill (others) */}
        {item.type === 'exercise' ? (
          <span style={{
            fontSize: 9, fontWeight: 700, fontFamily: 'var(--f-mono)',
            letterSpacing: '0.06em', color: diffColor,
            background: diffColor + '15', border: `1px solid ${diffColor}30`,
            padding: '1px 6px', borderRadius: 3,
          }}>
            {item.difficulty}
          </span>
        ) : (
          <span style={{
            fontSize: 9, fontWeight: 700, fontFamily: 'var(--f-mono)',
            letterSpacing: '0.06em', color: typeCfg.color,
            background: typeCfg.color + '15', border: `1px solid ${typeCfg.color}30`,
            padding: '1px 6px', borderRadius: 3, textTransform: 'uppercase',
          }}>
            {typeCfg.label}
          </span>
        )}
        {/* Right: status label (exercise) or progress % (course/book) or empty (chat) */}
        {item.type === 'exercise' && (
          <span style={{
            fontSize: 9, fontWeight: 600, fontFamily: 'var(--f-mono)',
            color: accentColor, letterSpacing: '0.04em',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ fontSize: 11 }}>{statusIcon}</span>
            {statusLabel}
          </span>
        )}
        {(item.type === 'course' || item.type === 'book') && item.progress !== undefined && (
          <span style={{ fontSize: 9, fontFamily: 'var(--f-mono)', color: 'var(--muted)' }}>
            {item.progress}%
          </span>
        )}
        {item.type === 'chat' && (
          <span style={{ fontSize: 9, fontFamily: 'var(--f-mono)', color: 'var(--muted)' }}>
            {timeAgo(item.submitted_at)}
          </span>
        )}
      </div>

      {/* Title */}
      <p style={{
        flex: 1, margin: 0,
        fontSize: 13, fontWeight: 600, color: 'var(--text)',
        lineHeight: 1.5, letterSpacing: '-0.01em',
        display: '-webkit-box', WebkitLineClamp: item.type === 'chat' ? 2 : 3,
        WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {item.title}
      </p>

      {/* Chat preview */}
      {item.type === 'chat' && item.preview && (
        <p style={{
          margin: '6px 0 0', fontSize: 10, color: 'var(--muted)',
          lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {item.preview}
        </p>
      )}

      {/* Progress bar (course / book) */}
      {(item.type === 'course' || item.type === 'book') && item.progress !== undefined && (
        <div style={{ marginTop: 10 }}>
          <div style={{ height: 2, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${item.progress}%`,
              background: typeCfg.color, borderRadius: 2,
              transition: 'width 400ms ease',
            }} />
          </div>
        </div>
      )}

      {/* Tags (exercise) */}
      {item.type === 'exercise' && item.tags && item.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
          {item.tags.slice(0, 3).map(tag => (
            <span key={tag} style={{
              fontSize: 9, fontFamily: 'var(--f-mono)',
              color: 'var(--muted)', background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border)',
              padding: '1px 6px', borderRadius: 3, letterSpacing: '0.02em',
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Time (exercise only at bottom) */}
      {item.type === 'exercise' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8 }}>
          <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>
            {timeAgo(item.submitted_at)}
          </span>
        </div>
      )}

      {/* Course/book bottom: time */}
      {(item.type === 'course' || item.type === 'book') && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8 }}>
          <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>
            {timeAgo(item.submitted_at)}
          </span>
        </div>
      )}
    </button>
  )
}

function HistoryCarousel({ items }: { items: HistoryItem[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)
  const [hovering, setHovering] = useState(false)

  const checkScroll = () => {
    const el = ref.current
    if (!el) return
    setCanLeft(el.scrollLeft > 2)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
  }

  useEffect(() => {
    const el = ref.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [items])

  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 600, behavior: 'smooth' })

  if (items.length === 0) {
    return (
      <p style={{ fontSize: 11, color: 'var(--muted)', margin: '4px 0 0', fontFamily: 'var(--f-mono)' }}>
        nenhuma atividade ainda.
      </p>
    )
  }

  const arrowStyle = (visible: boolean): React.CSSProperties => ({
    position: 'absolute', top: 0, bottom: 0,
    width: 52, display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', zIndex: 3, border: 'none',
    opacity: visible && hovering ? 1 : 0,
    pointerEvents: visible && hovering ? 'auto' : 'none',
    transition: 'opacity 200ms',
  })

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <button onClick={() => scroll(-1)} style={{ ...arrowStyle(canLeft), left: 0, background: 'linear-gradient(to right, var(--bg) 0%, transparent 100%)' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'rgba(15,20,25,0.85)', border: '1px solid var(--border-lit)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </div>
      </button>

      <div ref={ref} style={{
        display: 'flex', gap: 10, overflowX: 'hidden', scrollBehavior: 'smooth',
        paddingTop: 6, marginTop: -6, paddingBottom: 10,
      }}>
        {items.map(item => <HistoryCard key={item.id} item={item} />)}
        <div style={{ width: 40, flexShrink: 0 }} />
      </div>

      <button onClick={() => scroll(1)} style={{ ...arrowStyle(canRight), right: 0, background: 'linear-gradient(to left, var(--bg) 0%, transparent 100%)' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'rgba(15,20,25,0.85)', border: '1px solid var(--border-lit)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </button>

      {canRight && (
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 6, width: 80,
          background: 'linear-gradient(to left, var(--bg) 30%, transparent 100%)',
          pointerEvents: 'none', zIndex: 2,
        }} />
      )}
    </div>
  )
}

const MOCK_INSIGHTS: Insight[] = [
  {
    message: 'Primeira análise. Você tem 9 exercícios disponíveis e ainda não começou — sem problema, é assim que começa. Adicionei 1 exercício de Python focado em *args, que é um gap confirmado no seu perfil. Faça esse primeiro e o agente calibra a próxima leva.',
    generated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    highlights: [],
    gaps: ['python:functions'],
  },
  {
    message: 'Sua performance em exercícios de HTTP está sólida — acerto consistente em status codes e métodos. O ponto fraco identificado é `python:functions`: especificamente closures e escopo de variáveis. Os exercícios de FastAPI que você tentou usavam funções aninhadas e a dificuldade ali provavelmente tem raiz nisso. Adicionei 2 exercícios: um sobre closures simples e um sobre *args/*kwargs.',
    generated_at: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
    highlights: ['http:methods', 'http:status-codes'],
    gaps: ['python:functions', 'fastapi:pydantic'],
  },
  {
    message: 'Sessão curta hoje — 1 exercício tentado, não passou. O kata era sobre validação com Pydantic. O erro foi em schema aninhado: você passou um dict onde era esperado um objeto tipado. Esse padrão aparece bastante no ZionHub. Próxima leva vai consolidar Pydantic básico antes de seguir para autenticação.',
    generated_at: new Date(Date.now() - 50 * 3600 * 1000).toISOString(),
    highlights: ['fastapi:routing'],
    gaps: ['fastapi:pydantic', 'python:types'],
  },
]

const MOCK_RECENT: HistoryItem[] = [
  {
    id: 'mock-1', type: 'exercise',
    title: 'Função com número variável de argumentos', slug: 'funcao-args-variaveis',
    difficulty: '8kyu', tags: ['python', 'funcoes'],
    status: 'in_progress', submitted_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mock-2', type: 'exercise',
    title: 'Validar Request Body com Pydantic', slug: 'validar-request-body-pydantic',
    difficulty: '6kyu', tags: ['fastapi', 'pydantic'],
    status: 'passed', submitted_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mock-c1', type: 'course',
    title: 'FastAPI do Zero', slug: 'fastapi-do-zero',
    progress: 35, submitted_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mock-3', type: 'exercise',
    title: 'Retornar Status Code Correto em Erros', slug: 'status-code-erros',
    difficulty: '7kyu', tags: ['http', 'fastapi'],
    status: 'failed', submitted_at: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mock-b1', type: 'book',
    title: 'Effective Python', slug: 'effective-python',
    progress: 22, submitted_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mock-ai1', type: 'chat',
    title: 'Como funciona dependency injection no FastAPI?', slug: 'dep-injection-fastapi',
    preview: 'Você perguntou sobre como o FastAPI resolve dependências automaticamente via Depends()...',
    context: 'kata:validar-request-body-pydantic',
    submitted_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'mock-c2', type: 'course',
    title: 'SQL com Python', slug: 'sql-com-python',
    progress: 8, submitted_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
  },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [resume, setResume] = useState<Resume | null>(null)
  const [insights, setInsights] = useState<Insight[]>([])
  const [insightIdx, setInsightIdx] = useState(0)
  const [recentItems, setRecentItems] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'bom dia' : hour < 18 ? 'boa tarde' : 'boa noite'
  const firstName = user?.name?.split(' ')[0] ?? ''

  useEffect(() => {
    Promise.all([
      api.get('/exercises/today'),
      api.get('/progress/summary'),
      api.get('/progress/resume').catch(() => ({ data: null })),
      api.get('/agent/insights').catch(() => ({ data: [] })),
      api.get('/progress/recent-exercises').catch(() => ({ data: [] })),
    ]).then(([ex, prog, res, ins, recent]) => {
      setExercises(ex.data)
      setSummary(prog.data)
      setResume(res.data)
      setInsights(ins.data?.length ? ins.data : MOCK_INSIGHTS)
      setInsightIdx(0)
      const rawRecent: RecentExercise[] = recent.data ?? []
      const exerciseItems: HistoryItem[] = rawRecent.map(ex => ({ ...ex, type: 'exercise' as const }))
      setRecentItems(exerciseItems.length ? exerciseItems : MOCK_RECENT)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--muted)', fontSize: 11, fontFamily: 'var(--f-mono)' }}>_</span>
    </div>
  )

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '44px 56px 72px' }}>

        {/* Header */}
        <div className="fade-up" style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          marginBottom: 28,
        }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>
            {greeting},{' '}
            <span style={{ color: 'var(--cyan)' }}>{firstName}</span>
          </h1>
          <span style={{ fontSize: 11, color: 'var(--blue)', fontFamily: 'var(--f-mono)' }}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
        </div>

        {/* Stat strip — compact pills */}
        {summary && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 32, flexWrap: 'wrap',
          }}>
            {[
              { icon: '🔥', val: `${summary.current_streak}d`, label: 'streak', accent: summary.current_streak > 0 ? 'var(--cyan)' : undefined },
              { icon: '✓',  val: summary.completed_last_7_days, label: 'essa semana', accent: undefined },
              { icon: '★',  val: (user?.honor ?? 0).toLocaleString(), label: 'honor', accent: undefined },
            ].map(({ icon, val, label, accent }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                height: 28, padding: '0 12px',
                background: accent ? `${accent}10` : 'var(--bg-card)',
                border: `1px solid ${accent ? accent + '30' : 'var(--border)'}`,
                borderRadius: 20,
              }}>
                <span style={{ fontSize: 11, lineHeight: 1 }}>{icon}</span>
                <span style={{ fontSize: 13, fontWeight: 800, fontFamily: 'var(--f-mono)', color: accent ?? 'var(--text)', letterSpacing: '-0.01em' }}>
                  {val}
                </span>
                <span style={{ fontSize: 10, color: 'var(--muted)', letterSpacing: '0.02em' }}>{label}</span>
              </div>
            ))}
            <button
              style={{
                marginLeft: 'auto',
                height: 28, padding: '0 14px',
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(59,130,246,0.10)',
                border: '1px solid rgba(59,130,246,0.35)',
                borderRadius: 20, cursor: 'pointer',
                fontSize: 11, fontWeight: 600, color: 'var(--blue)',
                fontFamily: 'var(--f-mono)', letterSpacing: '0.02em',
                transition: 'background 120ms, border-color 120ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(59,130,246,0.18)'
                e.currentTarget.style.borderColor = 'rgba(59,130,246,0.6)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(59,130,246,0.10)'
                e.currentTarget.style.borderColor = 'rgba(59,130,246,0.35)'
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              iniciar chat com a IA
            </button>
          </div>
        )}

        {/* Continue card */}
        {resume && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ marginBottom: 10 }}>
              <span style={sectionLabel}>continuar de onde parou</span>
            </div>
            <ResumeCard resume={resume} />
          </div>
        )}

        {/* Agent insight carousel */}
        {insights.length > 0 && (() => {
          const insight = insights[insightIdx]
          const isLatest = insightIdx === 0
          const isOldest = insightIdx === insights.length - 1
          return (
            <div style={{ marginBottom: 28 }}>
              {/* Header row */}
              <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={sectionLabel}>análise do agente</span>
                <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>
                  {new Date(insight.generated_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                  {!isLatest && <span style={{ color: 'rgba(240,240,240,0.3)', marginLeft: 4 }}>· {insightIdx + 1}/{insights.length}</span>}
                </span>
                {/* Nav arrows */}
                {insights.length > 1 && (
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => setInsightIdx(i => Math.max(0, i - 1))}
                      disabled={isLatest}
                      style={{
                        width: 22, height: 22, borderRadius: 4,
                        background: isLatest ? 'transparent' : 'var(--bg-card)',
                        border: `1px solid ${isLatest ? 'var(--border)' : 'var(--border-lit)'}`,
                        color: isLatest ? 'var(--border)' : 'var(--muted)',
                        cursor: isLatest ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 120ms',
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setInsightIdx(i => Math.min(insights.length - 1, i + 1))}
                      disabled={isOldest}
                      style={{
                        width: 22, height: 22, borderRadius: 4,
                        background: isOldest ? 'transparent' : 'var(--bg-card)',
                        border: `1px solid ${isOldest ? 'var(--border)' : 'var(--border-lit)'}`,
                        color: isOldest ? 'var(--border)' : 'var(--muted)',
                        cursor: isOldest ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 120ms',
                      }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              {/* Card */}
              <div style={{
                padding: '14px 18px', borderRadius: 6,
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderLeft: `3px solid ${isLatest ? 'rgba(34,211,238,0.4)' : 'rgba(240,240,240,0.12)'}`,
                opacity: isLatest ? 1 : 0.75,
                transition: 'opacity 200ms, border-left-color 200ms',
              }}>
                <div style={{
                  maxHeight: 110, overflowY: 'auto',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'var(--border) transparent',
                  paddingRight: 4,
                }}>
                  <p style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.7, margin: 0 }}>
                    {insight.message}
                  </p>
                </div>
                {(insight.gaps.length > 0 || insight.highlights.length > 0) && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    {insight.highlights.map(h => (
                      <span key={h} style={{
                        fontSize: 10, fontFamily: 'var(--f-mono)', padding: '2px 8px',
                        borderRadius: 3, background: 'rgba(63,185,80,0.07)',
                        border: '1px solid rgba(63,185,80,0.2)', color: 'var(--green)',
                      }}>↑ {h}</span>
                    ))}
                    {insight.gaps.map(g => (
                      <span key={g} style={{
                        fontSize: 10, fontFamily: 'var(--f-mono)', padding: '2px 8px',
                        borderRadius: 3, background: 'rgba(34,211,238,0.07)',
                        border: '1px solid rgba(34,211,238,0.2)', color: 'var(--cyan)',
                      }}>→ {g}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* Treinar agora */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ marginBottom: 12 }}>
            <span style={sectionLabel}>treinar agora</span>
          </div>
          <TrainerWidget exercises={exercises} />
        </div>

        {/* History carousel */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ marginBottom: 12 }}>
            <span style={sectionLabel}>histórico</span>
          </div>
          <HistoryCarousel items={recentItems} />
        </div>


      </div>
      <StarfieldFooter />
    </div>
  )
}
