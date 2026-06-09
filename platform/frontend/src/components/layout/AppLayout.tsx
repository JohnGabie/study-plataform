import { useEffect, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuth } from '../../auth/AuthContext'
import { ChatPanel } from '../ChatPanel'
import api from '../../api/client'

// ── Starfield ────────────────────────────────────────────────────────────────
function makeShadows(n: number, color: string): string {
  const s: string[] = []
  for (let i = 0; i < n; i++)
    s.push(`${Math.floor(Math.random() * 2000)}px ${Math.floor(Math.random() * 2000)}px ${color}`)
  return s.join(', ')
}

// Generated once at module load — stable across re-renders
const S1 = makeShadows(700, 'rgba(190, 220, 255, 0.35)')
const S2 = makeShadows(200, 'rgba(34, 211, 238, 0.50)')
const S3 = makeShadows(80,  'rgba(34, 211, 238, 0.80)')

function StarLayer({ shadows, size, duration }: { shadows: string; size: number; duration: number }) {
  const style: React.CSSProperties = {
    position: 'absolute',
    width: size, height: size,
    background: 'transparent',
    boxShadow: shadows,
    animation: `animStar ${duration}s linear infinite`,
  }
  return (
    <>
      <div style={style} />
      <div style={{ ...style, top: 2000 }} />
    </>
  )
}

function Starfield() {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 70, right: 0,
      height: 220, overflow: 'hidden', pointerEvents: 'none',
      background: 'linear-gradient(to top, rgba(13,26,42,0.65) 0%, transparent 100%)',
      zIndex: 5,
    }}>
      <StarLayer shadows={S1} size={1} duration={50} />
      <StarLayer shadows={S2} size={2} duration={100} />
      <StarLayer shadows={S3} size={3} duration={150} />
    </div>
  )
}

// ── TopBar ───────────────────────────────────────────────────────────────────
const DIFF_COLOR: Record<string, string> = {
  '8kyu': '#9b9b9b', '7kyu': '#3b82f6', '6kyu': '#22d3ee',
  '5kyu': '#22c55e', '4kyu': '#eab308', '3kyu': '#f97316',
  '2kyu': '#ef4444', '1kyu': '#a855f7',
}

function TopBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState<{ rank: string; honor: number } | null>(null)

  useEffect(() => {
    api.get('/users/me/stats')
      .then(r => setStats({ rank: r.data.rank, honor: r.data.honor }))
      .catch(() => {})
  }, [])

  const rankColor = stats ? (DIFF_COLOR[stats.rank] || '#525252') : '#525252'

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, zIndex: 20,
    }}>
      {user && (
        <div style={{
          height: 54,
          display: 'flex',
          alignItems: 'stretch',
          background: 'var(--bg-card)',
          borderLeft: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          borderTop: 'none',
          borderRight: 'none',
          borderRadius: '0 0 0 14px',
          overflow: 'hidden',
        }}>

          {/* Rank + honor */}
          {stats && (
            <button
              onClick={() => navigate('/profile')}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '0 18px',
                background: 'none', border: 'none', cursor: 'pointer',
                transition: 'background 130ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <span style={{
                fontSize: 12, fontWeight: 800, fontFamily: 'var(--f-mono)',
                padding: '4px 11px', borderRadius: 6,
                background: `${rankColor}22`,
                border: `1.5px solid ${rankColor}60`,
                color: rankColor,
                letterSpacing: '0.06em',
                boxShadow: `0 0 10px ${rankColor}25`,
              }}>
                {stats.rank}
              </span>
              <span style={{
                fontSize: 13, color: 'var(--muted)', fontFamily: 'var(--f-mono)',
                letterSpacing: '-0.01em',
              }}>
                {stats.honor.toLocaleString()}
                <span style={{ opacity: 0.5, fontSize: 11, marginLeft: 5 }}>honor</span>
              </span>
            </button>
          )}

          {/* Avatar */}
          <button
            onClick={() => navigate('/profile')}
            title={user.name}
            style={{
              width: 58,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', cursor: 'pointer',
              transition: 'background 130ms',
              padding: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" style={{
                width: 32, height: 32, borderRadius: '50%',
                border: `2px solid ${stats ? rankColor + '60' : 'var(--border-lit)'}`,
                objectFit: 'cover',
                boxShadow: stats ? `0 0 8px ${rankColor}30` : 'none',
              }} />
            ) : (
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--cyan-faint)',
                border: '2px solid var(--cyan-glow)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--cyan)',
                fontSize: 13, fontWeight: 800,
                boxShadow: '0 0 8px rgba(34,211,238,0.18)',
              }}>
                {user.name[0].toUpperCase()}
              </div>
            )}
          </button>

          {/* Logout */}
          <button
            onClick={() => { logout(); navigate('/login') }}
            title="Sair"
            style={{
              width: 48,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text)',
              transition: 'color 130ms, background 130ms',
              padding: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--red)'
              e.currentTarget.style.background = 'rgba(239,68,68,0.07)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text)'
              e.currentTarget.style.background = 'none'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

// ── ChatBubble ───────────────────────────────────────────────────────────────
function ChatBubble() {
  const location = useLocation()
  const [open, setOpen] = useState(false)

  const slug = location.pathname.startsWith('/exercise/')
    ? location.pathname.split('/exercise/')[1]
    : null
  const context = slug ? `kata:${slug}` : location.pathname === '/' ? 'dashboard' : 'general'

  return (
    <>
      {open && (
        <div style={{
          position: 'fixed', bottom: 84, right: 24, zIndex: 41,
          width: 320, height: 420,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-lit)',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          <ChatPanel context={context} style={{ height: '100%' }} />
        </div>
      )}
      <button
        onClick={() => setOpen(o => !o)}
        title="Chat"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 42,
          width: 48, height: 48, borderRadius: '50%',
          background: open ? 'var(--cyan-faint)' : 'var(--bg-card)',
          border: `1px solid ${open ? 'var(--cyan)' : 'var(--cyan-glow)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--cyan)',
          boxShadow: open ? '0 0 16px rgba(34,211,238,0.2)' : '0 2px 8px rgba(0,0,0,0.4)',
          transition: 'background 150ms, border-color 150ms, box-shadow 150ms',
        }}
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>
    </>
  )
}

// ── Layout ───────────────────────────────────────────────────────────────────
export default function AppLayout() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <TopBar />
        <div style={{ height: '100%', overflow: 'hidden' }}>
          <Outlet />
        </div>
      </main>
      <ChatBubble />
    </div>
  )
}
