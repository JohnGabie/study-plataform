import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../auth/AuthContext'

interface Exercise {
  id: string; title: string; slug: string
  difficulty: string; module: string; tags: string[]
  created_at: string
  attempt_count: number; completion_count: number; user_status: string
}

const DIFF_COLOR: Record<string, string> = {
  '8kyu': '#9b9b9b', '7kyu': '#3b82f6', '6kyu': '#22d3ee',
  '5kyu': '#22c55e', '4kyu': '#eab308', '3kyu': '#f97316',
  '2kyu': '#ef4444', '1kyu': '#a855f7',
}
const DIFFS = ['8kyu', '7kyu', '6kyu', '5kyu', '4kyu', '3kyu', '2kyu', '1kyu']
const DIFF_ORDER = Object.fromEntries(DIFFS.map((d, i) => [d, i]))

const RANK_THRESHOLDS: [number, string][] = [
  [0, '8kyu'], [30, '7kyu'], [120, '6kyu'],
  [400, '5kyu'], [1200, '4kyu'], [4000, '3kyu'],
]
function honorToRank(honor: number): string {
  let rank = '8kyu'
  for (const [threshold, name] of RANK_THRESHOLDS) {
    if (honor >= threshold) rank = name
  }
  return rank
}

type SortKey = 'newest' | 'oldest' | 'popular' | 'hardest' | 'easiest' | 'name' | 'relevance'
type ProgressKey = 'all' | 'not_attempted' | 'attempted' | 'completed'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest',    label: 'mais recentes' },
  { value: 'oldest',    label: 'mais antigos' },
  { value: 'popular',   label: 'mais populares' },
  { value: 'hardest',   label: 'mais difíceis' },
  { value: 'easiest',   label: 'mais fáceis' },
  { value: 'name',      label: 'nome' },
  { value: 'relevance', label: 'relevância' },
]

const PROGRESS_OPTIONS: { value: ProgressKey; label: string }[] = [
  { value: 'all',           label: 'todos' },
  { value: 'not_attempted', label: 'não tentados' },
  { value: 'attempted',     label: 'não finalizados' },
  { value: 'completed',     label: 'completados' },
]

// ── FilterSelect (single-select dropdown) ───────────────────────────────────
function FilterSelect<T extends string>({
  label, value, options, onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const current = options.find(o => o.value === value)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <p style={{
        fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: 'var(--muted)', margin: '0 0 6px',
      }}>
        {label}
      </p>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', height: 30, padding: '0 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg)', border: `1px solid ${open ? 'var(--border-lit)' : 'var(--border)'}`,
          borderRadius: 5, color: 'var(--text)', cursor: 'pointer',
          fontSize: 12, fontFamily: 'var(--f-mono)',
          transition: 'border-color 120ms',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current?.label}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round"
          style={{ flexShrink: 0, transition: 'transform 150ms', transform: open ? 'rotate(180deg)' : 'none' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          marginTop: 2, background: 'var(--bg-card)', border: '1px solid var(--border-lit)',
          borderRadius: 5, overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}>
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              style={{
                width: '100%', padding: '7px 10px', textAlign: 'left',
                background: opt.value === value ? 'rgba(34,211,238,0.06)' : 'transparent',
                border: 'none', cursor: 'pointer',
                color: opt.value === value ? 'var(--cyan)' : 'var(--text)',
                fontSize: 12, fontFamily: 'var(--f-mono)',
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'background 80ms',
              }}
              onMouseEnter={e => { if (opt.value !== value) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { if (opt.value !== value) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ width: 9, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                {opt.value === value && (
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="2 6 5 9 10 3" />
                  </svg>
                )}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── FilterMultiSelect (multi-select dropdown with checkboxes) ────────────────
function FilterMultiSelect({
  label, values, options, onChange, placeholder, searchable,
}: {
  label: string
  values: Set<string>
  options: { value: string; label: string; color?: string }[]
  onChange: (next: Set<string>) => void
  placeholder?: string
  searchable?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQ('')
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const toggle = (v: string) => {
    const next = new Set(values)
    next.has(v) ? next.delete(v) : next.add(v)
    onChange(next)
  }

  const displayLabel = values.size === 0
    ? (placeholder ?? 'todos')
    : values.size === 1
    ? options.find(o => values.has(o.value))?.label ?? `${values.size} sel.`
    : `${values.size} selecionados`

  const visible = searchable && q
    ? options.filter(o => o.label.toLowerCase().includes(q.toLowerCase()))
    : options

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <p style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'var(--muted)', margin: 0,
        }}>
          {label}
        </p>
        {values.size > 0 && (
          <button onClick={e => { e.stopPropagation(); onChange(new Set()) }}
            style={{ fontSize: 9, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            limpar
          </button>
        )}
      </div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', height: 30, padding: '0 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--bg)', border: `1px solid ${open ? 'var(--border-lit)' : 'var(--border)'}`,
          borderRadius: 5, color: values.size > 0 ? 'var(--text)' : 'var(--muted)', cursor: 'pointer',
          fontSize: 12, fontFamily: 'var(--f-mono)',
          transition: 'border-color 120ms',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayLabel}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke="var(--muted)" strokeWidth="2.5" strokeLinecap="round"
          style={{ flexShrink: 0, transition: 'transform 150ms', transform: open ? 'rotate(180deg)' : 'none' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          marginTop: 2, background: 'var(--bg-card)', border: '1px solid var(--border-lit)',
          borderRadius: 5, overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          maxHeight: 260, display: 'flex', flexDirection: 'column',
        }}>
          {searchable && (
            <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
              <input
                type="text" placeholder="buscar tag..."
                value={q} onChange={e => setQ(e.target.value)}
                autoFocus
                style={{
                  width: '100%', height: 24, padding: '0 8px', boxSizing: 'border-box',
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 3, color: 'var(--text)', fontSize: 11,
                  fontFamily: 'var(--f-mono)', outline: 'none',
                }}
              />
            </div>
          )}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {visible.map(opt => {
              const active = values.has(opt.value)
              const c = opt.color || 'var(--cyan)'
              return (
                <button
                  key={opt.value}
                  onClick={() => toggle(opt.value)}
                  style={{
                    width: '100%', padding: '6px 10px', textAlign: 'left',
                    background: active ? `${c}0f` : 'transparent',
                    border: 'none', cursor: 'pointer',
                    color: active ? c : 'var(--text)',
                    fontSize: 12, fontFamily: 'var(--f-mono)',
                    display: 'flex', alignItems: 'center', gap: 8,
                    transition: 'background 80ms',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{
                    width: 11, height: 11, borderRadius: 3, flexShrink: 0,
                    border: `1.5px solid ${active ? c : 'var(--border-lit)'}`,
                    background: active ? c : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 120ms',
                  }}>
                    {active && (
                      <svg width="7" height="7" viewBox="0 0 12 12" fill="none"
                        stroke="#000" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="2 6 5 9 10 3" />
                      </svg>
                    )}
                  </div>
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── HexBadge ─────────────────────────────────────────────────────────────────
function HexBadge({ rank }: { rank: string }) {
  const color = DIFF_COLOR[rank] || '#9b9b9b'
  const num = rank.replace('kyu', '')
  return (
    <div style={{ width: 54, height: 54, flexShrink: 0, position: 'relative' }}>
      <svg width="54" height="54" viewBox="0 0 54 54">
        <polygon points="27,2 51,14 51,40 27,52 3,40 3,14"
          fill={`${color}14`} stroke={color} strokeWidth="1.5" />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 15, fontWeight: 800, color, fontFamily: 'var(--f-mono)', lineHeight: 1 }}>{num}</span>
        <span style={{ fontSize: 8, fontWeight: 600, color, fontFamily: 'var(--f-mono)', opacity: 0.75, lineHeight: 1.4 }}>kyu</span>
      </div>
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'completed' ? 'var(--green)' : status === 'attempted' ? 'var(--yellow)' : 'var(--border-lit)'
  return (
    <div style={{
      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
      background: color, marginTop: 2,
      boxShadow: status === 'completed' ? '0 0 6px rgba(63,185,80,0.5)' : 'none',
    }} />
  )
}

function KataCard({ ex, query }: { ex: Exercise; query: string }) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)
  const color = DIFF_COLOR[ex.difficulty] || '#9b9b9b'

  return (
    <button
      onClick={() => navigate(`/exercise/${ex.slug}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 16,
        width: '100%', textAlign: 'left', cursor: 'pointer',
        padding: '14px 16px',
        background: hovered ? 'var(--bg-hover)' : 'var(--bg-card)',
        border: `1px solid ${hovered ? 'var(--border-lit)' : 'var(--border)'}`,
        borderRadius: 6, marginBottom: 5,
        transition: 'background 120ms, border-color 120ms',
      }}
    >
      <HexBadge rank={ex.difficulty} />

      <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
          <StatusDot status={ex.user_status} />
          <div style={{
            fontSize: 13, fontWeight: 700, color: hovered ? 'var(--cyan)' : 'var(--text)',
            letterSpacing: '-0.01em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            transition: 'color 120ms',
          }}>
            {ex.title}
          </div>
        </div>

        <div style={{
          fontSize: 10, color: 'var(--muted)', marginBottom: 7,
          fontFamily: 'var(--f-mono)', display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            {ex.module}
          </span>
          {ex.attempt_count > 0 && (
            <span style={{ color: 'var(--faint)', opacity: 0.7 }}>
              {ex.attempt_count} tentativa{ex.attempt_count !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {ex.tags.map(t => {
            const isMatch = query && t.toLowerCase().includes(query.toLowerCase())
            return (
              <span key={t} style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.07em',
                textTransform: 'uppercase', padding: '2px 6px', borderRadius: 3,
                background: isMatch ? 'rgba(34,211,238,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isMatch ? 'rgba(34,211,238,0.25)' : 'var(--border)'}`,
                color: isMatch ? 'var(--cyan)' : 'var(--muted)',
              }}>
                {t}
              </span>
            )
          })}
        </div>
      </div>

      <div style={{ paddingTop: 18, flexShrink: 0 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke={hovered ? color : 'var(--border-lit)'}
          strokeWidth="2" strokeLinecap="round"
          style={{ transition: 'stroke 120ms', display: 'block' }}>
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </div>
    </button>
  )
}

function relevanceScore(ex: Exercise, q: string): number {
  if (!q) return 0
  const ql = q.toLowerCase()
  let score = 0
  if (ex.title.toLowerCase().startsWith(ql)) score += 10
  if (ex.title.toLowerCase().includes(ql)) score += 5
  if (ex.module.toLowerCase().includes(ql)) score += 3
  if (ex.tags.some(t => t.toLowerCase() === ql)) score += 4
  if (ex.tags.some(t => t.toLowerCase().includes(ql))) score += 2
  return score
}

export default function KataListPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('newest')
  const [progress, setProgress] = useState<ProgressKey>('all')
  const [diffFilter, setDiffFilter] = useState<Set<string>>(new Set())
  const [tagFilter, setTagFilter] = useState<Set<string>>(new Set())
  const modeApplied = useRef(false)

  useEffect(() => {
    api.get('/exercises').then(r => setExercises(r.data)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const mode = searchParams.get('mode')
    if (!mode || modeApplied.current || exercises.length === 0) return
    modeApplied.current = true

    if (mode === 'warmup') {
      setDiffFilter(new Set(['8kyu', '7kyu']))
      setProgress('not_attempted')
    } else if (mode === 'practice') {
      setProgress('completed')
    } else if (mode === 'rankup') {
      const rank = honorToRank(user?.honor ?? 0)
      const rankIdx = DIFFS.indexOf(rank)
      if (rankIdx < DIFFS.length - 1) {
        setDiffFilter(new Set(DIFFS.slice(rankIdx + 1)))
      }
    }
  }, [exercises.length, user, searchParams])

  const allTags = useMemo(() =>
    Array.from(new Set(exercises.flatMap(ex => ex.tags))).sort(),
    [exercises]
  )

  const diffOptions = useMemo(() =>
    DIFFS.map(d => ({ value: d, label: d, color: DIFF_COLOR[d] })),
    []
  )

  const tagOptions = useMemo(() =>
    allTags.map(t => ({ value: t, label: t })),
    [allTags]
  )

  const hasFilters = diffFilter.size > 0 || tagFilter.size > 0 || progress !== 'all' || search

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    let list = exercises.filter(ex => {
      if (diffFilter.size > 0 && !diffFilter.has(ex.difficulty)) return false
      if (tagFilter.size > 0 && !ex.tags.some(t => tagFilter.has(t))) return false
      if (progress === 'not_attempted' && ex.user_status !== 'not_attempted') return false
      if (progress === 'attempted' && ex.user_status !== 'attempted') return false
      if (progress === 'completed' && ex.user_status !== 'completed') return false
      if (q) {
        const matches = (
          ex.title.toLowerCase().includes(q) ||
          ex.tags.some(t => t.toLowerCase().includes(q)) ||
          ex.module.toLowerCase().includes(q)
        )
        if (!matches) return false
      }
      return true
    })

    switch (sort) {
      case 'newest':    list = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at)); break
      case 'oldest':    list = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at)); break
      case 'popular':   list = [...list].sort((a, b) => b.attempt_count - a.attempt_count); break
      case 'hardest':   list = [...list].sort((a, b) => (DIFF_ORDER[b.difficulty] ?? 99) - (DIFF_ORDER[a.difficulty] ?? 99)); break
      case 'easiest':   list = [...list].sort((a, b) => (DIFF_ORDER[a.difficulty] ?? 99) - (DIFF_ORDER[b.difficulty] ?? 99)); break
      case 'name':      list = [...list].sort((a, b) => a.title.localeCompare(b.title)); break
      case 'relevance': list = [...list].sort((a, b) => relevanceScore(b, search) - relevanceScore(a, search)); break
    }
    return list
  }, [exercises, search, sort, progress, diffFilter, tagFilter])

  const resetAll = () => {
    setSearch(''); setSort('newest'); setProgress('all')
    setDiffFilter(new Set()); setTagFilter(new Set())
  }

  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--muted)', fontSize: 11, fontFamily: 'var(--f-mono)' }}>_</span>
    </div>
  )

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>

      {/* ── Filter sidebar ──────────────────────────────── */}
      <div style={{
        width: 220, flexShrink: 0, height: '100%', overflowY: 'auto',
        borderRight: '1px solid var(--border)',
        padding: '20px 16px 40px',
        display: 'flex', flexDirection: 'column', gap: 18,
      }}>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
            stroke="var(--muted)" strokeWidth="2" strokeLinecap="round"
            style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text" placeholder="buscar por nome, tag..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', paddingLeft: 28, paddingRight: search ? 28 : 10,
              height: 30, fontSize: 12, boxSizing: 'border-box',
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 5, color: 'var(--text)',
              fontFamily: 'var(--f-mono)', outline: 'none',
              transition: 'border-color 120ms',
            }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--border-lit)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
          />
          {search && (
            <button onClick={() => setSearch('')}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--muted)', fontSize: 14, lineHeight: 1, padding: 0,
              }}>×</button>
          )}
        </div>

        {/* Sort By */}
        <FilterSelect
          label="ordenar"
          value={sort}
          options={SORT_OPTIONS}
          onChange={v => setSort(v as SortKey)}
        />

        {/* Progress */}
        <FilterSelect
          label="progresso"
          value={progress}
          options={PROGRESS_OPTIONS}
          onChange={v => setProgress(v as ProgressKey)}
        />

        {/* Difficulty */}
        <FilterMultiSelect
          label="dificuldade"
          values={diffFilter}
          options={diffOptions}
          onChange={setDiffFilter}
          placeholder="todas"
        />

        {/* Tags */}
        {allTags.length > 0 && (
          <FilterMultiSelect
            label="tags"
            values={tagFilter}
            options={tagOptions}
            onChange={setTagFilter}
            placeholder="todas"
            searchable
          />
        )}

      </div>

      {/* ── Kata list ────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 26px 60px' }}>

        {(() => {
          const mode = searchParams.get('mode')
          const labels: Record<string, { label: string; color: string }> = {
            rankup:   { label: 'Rank Up — desafios acima do seu nível', color: 'var(--cyan)' },
            warmup:   { label: 'Warm-up — fáceis, não tentados',        color: 'var(--green)' },
            practice: { label: 'Praticar — já completados',             color: '#a855f7' },
          }
          const m = mode ? labels[mode] : null
          return m ? (
            <div style={{
              marginBottom: 16, padding: '8px 14px', borderRadius: 5,
              background: m.color + '0f', border: `1px solid ${m.color}25`,
              fontSize: 11, color: m.color, fontFamily: 'var(--f-mono)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span>{m.label}</span>
              <button onClick={resetAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 11, padding: 0, opacity: 0.7 }}>
                limpar
              </button>
            </div>
          ) : null
        })()}

        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
          <h1 style={{ fontSize: 16, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
            kata library
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {hasFilters && (
              <button onClick={resetAll}
                style={{ fontSize: 10, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--f-mono)' }}>
                limpar filtros
              </button>
            )}
            <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>
              {filtered.length}{hasFilters ? ` / ${exercises.length}` : ''} katas
            </span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
              {exercises.length === 0 ? 'nenhum kata disponível ainda.' : 'nenhum resultado.'}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map(ex => <KataCard key={ex.id} ex={ex} query={search} />)}
          </div>
        )}
      </div>

    </div>
  )
}
