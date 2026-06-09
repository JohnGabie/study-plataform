import { useEffect, useState } from 'react'
import api from '../api/client'
import StarfieldFooter from '../components/StarfieldFooter'

interface Stats {
  user: { name: string; email: string; avatar_url: string | null; created_at: string }
  rank: string; rank_progress: number; honor: number; honor_for_next_rank: number
  total_completed: number; total_attempted: number; completion_rate: number
  current_streak: number; days_active: number; days_since_joined: number
  recent_completions: { title: string; slug: string; difficulty: string; submitted_at: string }[]
  heatmap: Record<string, number>
  weekly_summary: { completed_last_7_days: number }
}

const DIFF_COLOR: Record<string, string> = {
  '8kyu': '#9b9b9b', '7kyu': '#3b82f6', '6kyu': '#22d3ee',
  '5kyu': '#22c55e', '4kyu': '#eab308', '3kyu': '#f97316',
  '2kyu': '#ef4444', '1kyu': '#a855f7',
}
const RANK_ORDER = ['8kyu', '7kyu', '6kyu', '5kyu', '4kyu', '3kyu', '2kyu', '1kyu']

function RankRing({ rank, size = 120 }: { rank: string; size?: number }) {
  const color = DIFF_COLOR[rank] || '#525252'
  const cx = size / 2, cy = size / 2, r = size * 0.42
  const circumference = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="var(--border)" strokeWidth="3" />
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.15}
          opacity="0.85"
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 1,
      }}>
        <span style={{
          fontSize: size * 0.195, fontWeight: 800, color,
          letterSpacing: '-0.01em', fontFamily: 'var(--f-mono)', lineHeight: 1,
        }}>
          {rank.replace('kyu', '')}
        </span>
        <span style={{ fontSize: size * 0.1, color, opacity: 0.6, fontFamily: 'var(--f-mono)', lineHeight: 1 }}>
          kyu
        </span>
      </div>
    </div>
  )
}

function Heatmap({ heatmap }: { heatmap: Record<string, number> }) {
  const WEEKS = 26
  const today = new Date()
  const cells: { date: string; count: number; isToday: boolean }[] = []
  for (let i = WEEKS * 7 - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    cells.push({ date: key, count: heatmap[key] || 0, isToday: i === 0 })
  }
  const cellColor = (n: number, isToday: boolean) => {
    if (isToday) return n > 0 ? 'var(--cyan)' : 'rgba(34,211,238,0.18)'
    if (n === 0) return 'var(--border)'
    if (n === 1) return 'rgba(34,211,238,0.3)'
    if (n === 2) return 'rgba(34,211,238,0.6)'
    return 'var(--cyan)'
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: WEEKS }, (_, w) => (
          <div key={w} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {cells.slice(w * 7, w * 7 + 7).map((c, d) => (
              <div key={d} title={`${c.date}: ${c.count}`} style={{
                width: 13, height: 13, borderRadius: 3,
                background: cellColor(c.count, c.isToday),
                boxShadow: c.isToday ? '0 0 6px rgba(34,211,238,0.5)' : 'none',
              }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3.6e6), d = Math.floor(diff / 8.64e7)
  if (d > 0) return `${d}d`
  if (h > 0) return `${h}h`
  return 'agora'
}

export default function ProfilePage() {
  const [stats, setStats] = useState<Stats | null>(null)
  useEffect(() => { api.get('/users/me/stats').then(r => setStats(r.data)) }, [])

  if (!stats) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--muted)', fontSize: 11 }}>_</span>
    </div>
  )

  const nextRank = RANK_ORDER[RANK_ORDER.indexOf(stats.rank) + 1]
  const pct = Math.round(stats.rank_progress * 100)
  const rankColor = DIFF_COLOR[stats.rank] || '#525252'

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>

      {/* ── Cover band ─────────────────────────────────────── */}
      <div style={{
        height: 90, width: '100%', flexShrink: 0,
        background: `linear-gradient(135deg, ${rankColor}22 0%, ${rankColor}08 60%, transparent 100%)`,
        borderBottom: `1px solid ${rankColor}18`,
      }} />

      <div style={{ padding: '0 56px 72px' }}>

        {/* ── Identity header ─────────────────────────────── */}
        <div className="fade-up" style={{
          display: 'flex', alignItems: 'flex-end', gap: 28,
          marginTop: -44,
          paddingBottom: 32,
          borderBottom: '1px solid var(--border)',
          marginBottom: 40,
        }}>
          {/* Avatar */}
          {stats.user.avatar_url ? (
            <img src={stats.user.avatar_url} alt="" style={{
              width: 88, height: 88, borderRadius: '50%', flexShrink: 0,
              border: '3px solid var(--bg)',
              boxShadow: `0 0 0 1px var(--border-lit)`,
            }} />
          ) : (
            <div style={{
              width: 88, height: 88, borderRadius: '50%', flexShrink: 0,
              background: 'var(--bg-card)',
              border: '3px solid var(--bg)',
              boxShadow: `0 0 0 1px var(--border-lit)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: rankColor, fontSize: 30, fontWeight: 800,
            }}>
              {stats.user.name[0]}
            </div>
          )}

          {/* Name + meta */}
          <div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
            <h1 style={{
              fontSize: 26, fontWeight: 800, margin: '0 0 4px',
              letterSpacing: '-0.03em', color: 'var(--text)',
            }}>
              {stats.user.name}
            </h1>
            <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 14px', fontFamily: 'var(--f-mono)' }}>
              {stats.user.email}
            </p>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {[
                { label: `${stats.days_since_joined}d membro` },
                { label: `${stats.current_streak}d streak`, bright: stats.current_streak > 0 },
                { label: `${stats.days_active} dias ativos` },
              ].map(({ label, bright }) => (
                <span key={label} style={{
                  fontSize: 10, fontWeight: 600,
                  padding: '3px 10px', borderRadius: 4,
                  background: bright ? 'rgba(34,211,238,0.07)' : 'var(--bg-card)',
                  border: `1px solid ${bright ? 'rgba(34,211,238,0.22)' : 'var(--border)'}`,
                  color: bright ? 'var(--cyan)' : 'var(--muted)',
                  fontFamily: 'var(--f-mono)',
                }}>
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Rank ring */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingBottom: 4 }}>
            <RankRing rank={stats.rank} size={120} />
            <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>
              {stats.honor.toLocaleString()} honor
            </span>
          </div>
        </div>

        {/* ── Stat strip ──────────────────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          borderBottom: '1px solid var(--border)',
          marginBottom: 44,
        }}>
          {[
            { val: stats.honor, label: 'honor', sub: `→ ${nextRank || 'max'}`, color: rankColor },
            { val: stats.total_completed, label: 'completados', sub: `de ${stats.total_attempted}`, color: null },
            { val: `${Math.round(stats.completion_rate * 100)}%`, label: 'taxa de acerto', sub: 'nas tentativas', color: null },
            { val: stats.weekly_summary.completed_last_7_days, label: 'esta semana', sub: 'exercícios', color: null },
          ].map(({ val, label, sub, color }, i) => (
            <div key={label} style={{
              padding: '0 0 32px',
              paddingRight: i < 3 ? 36 : 0,
              marginRight: i < 3 ? 36 : 0,
              borderRight: i < 3 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                fontSize: 40, fontWeight: 800, lineHeight: 1,
                letterSpacing: '-0.04em',
                color: color || 'var(--text)',
                marginBottom: 7,
              }}>
                {val}
              </div>
              <div className="stat-label" style={{ marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', opacity: 0.55 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ── Heatmap + Recentes ──────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 48, marginBottom: 44 }}>

          {/* Heatmap */}
          <div>
            <div className="divider-label" style={{ marginBottom: 20 }}>
              <span className="section-label">atividade — 6 meses</span>
            </div>
            <Heatmap heatmap={stats.heatmap} />
          </div>

          {/* Recentes */}
          <div>
            <div className="divider-label" style={{ marginBottom: 0 }}>
              <span className="section-label">recentes</span>
            </div>
            <div style={{ borderTop: '1px solid var(--border)' }}>
              {stats.recent_completions.length === 0 ? (
                <p style={{ fontSize: 11, color: 'var(--muted)', padding: '20px 0', margin: 0 }}>
                  nenhum exercício completado ainda.
                </p>
              ) : stats.recent_completions.map((c, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 0',
                  borderBottom: i < stats.recent_completions.length - 1
                    ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{
                    width: 3, height: 28, borderRadius: 2, flexShrink: 0,
                    background: DIFF_COLOR[c.difficulty] || '#525252',
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 12, fontWeight: 600, color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      margin: '0 0 2px',
                    }}>
                      {c.title}
                    </p>
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: DIFF_COLOR[c.difficulty] || '#525252',
                      fontFamily: 'var(--f-mono)', letterSpacing: '0.05em',
                    }}>
                      {c.difficulty}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 10, color: 'var(--muted)', flexShrink: 0,
                    fontFamily: 'var(--f-mono)',
                  }}>
                    {timeAgo(c.submitted_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Rank progress ───────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="section-label">rank progress</span>
              <span style={{ fontSize: 11, color: rankColor, fontWeight: 700, fontFamily: 'var(--f-mono)' }}>
                {stats.rank}
              </span>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>→</span>
              <span style={{ fontSize: 11, color: DIFF_COLOR[nextRank] || 'var(--muted)', fontFamily: 'var(--f-mono)' }}>
                {nextRank || 'max'}
              </span>
            </div>
            <span style={{ fontSize: 13, color: rankColor, fontFamily: 'var(--f-mono)', fontWeight: 800 }}>
              {pct}%
            </span>
          </div>
          <div style={{ height: 3, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${pct}%`,
              background: `linear-gradient(90deg, ${rankColor}99, ${rankColor})`,
              boxShadow: `0 0 10px ${rankColor}50`,
              transition: 'width 1.2s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>
              {stats.honor.toLocaleString()}
            </span>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>
              {stats.honor_for_next_rank.toLocaleString()}
            </span>
          </div>
        </div>

      </div>
      <StarfieldFooter />
    </div>
  )
}
