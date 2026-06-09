import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const NAV = [
  {
    to: '/', label: 'Dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    to: '/exercise', label: 'Kata',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    to: '/courses', label: 'Cursos',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    to: '/books', label: 'Livros',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    to: '/chats', label: 'Chat IA',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
]

// Sidebar colapsada = 70px. Nav tem padding 0 8px → usável = 54px.
// Ícone = 20px. Centra em 54px: paddingLeft = (54-20)/2 = 17px.
// Expandida: paddingLeft = 14px (alinha com o conteúdo das páginas).
const ICON_PAD_COLLAPSED = 17
const ICON_PAD_EXPANDED  = 14

export default function Sidebar() {
  const [hovering, setHovering] = useState(false)

  return (
    <aside
      style={{ position: 'relative', width: 70, flexShrink: 0, height: '100vh' }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div style={{
        position: 'absolute', left: 0, top: 0,
        width: hovering ? 228 : 70,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
        paddingTop: 18,
        paddingBottom: 18,
        paddingLeft: 8,
        paddingRight: 8,
        overflow: 'hidden',
        transition: 'width 220ms ease',
        zIndex: hovering ? 100 : 1,
      }}>

        {/* Logo strip */}
        <div style={{
          height: 38,
          borderRadius: 9,
          background: 'var(--cyan-faint)',
          border: '1px solid var(--cyan-glow)',
          display: 'flex', alignItems: 'center',
          gap: 10,
          // center the 17px logo icon in (54px usable) → paddingLeft = (54-17)/2 ≈ 18
          paddingLeft: hovering ? 12 : 18,
          marginBottom: 24,
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'padding-left 220ms ease',
        }}>
          <svg width="17" height="17" viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
            <path d="M16 3L29 10V22L16 29L3 22V10Z" stroke="#22d3ee" strokeWidth="1.5" fill="rgba(34,211,238,0.1)" />
            <path d="M16 3V29M3 10L29 22M29 10L3 22" stroke="#22d3ee" strokeWidth="0.5" opacity="0.4" />
          </svg>
          <span style={{
            fontSize: 12, fontWeight: 800, color: 'var(--text)',
            letterSpacing: '-0.02em', whiteSpace: 'nowrap',
            maxWidth: hovering ? 140 : 0,
            opacity: hovering ? 1 : 0,
            overflow: 'hidden',
            transition: 'max-width 220ms ease, opacity 150ms ease',
          }}>
            Study Platform
          </span>
        </div>

        {/* Nav */}
        <nav style={{
          flex: 1,
          display: 'flex', flexDirection: 'column',
          gap: 3,
        }}>
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to} to={to} end={to === '/'}
              className={({ isActive }) => `rail-item${isActive ? ' active' : ''}`}
              style={{
                width: '100%',
                height: 42,
                justifyContent: 'flex-start',
                paddingLeft: hovering ? ICON_PAD_EXPANDED : ICON_PAD_COLLAPSED,
                gap: 12,
                borderRadius: 7,
                // transition covers the layout shift; color/bg come from CSS class
                transition: 'padding-left 220ms ease, color 130ms, background 130ms',
              }}
            >
              <span style={{ flexShrink: 0, display: 'flex' }}>{icon}</span>
              <span style={{
                fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
                maxWidth: hovering ? 140 : 0,
                opacity: hovering ? 1 : 0,
                overflow: 'hidden',
                transition: 'max-width 220ms ease, opacity 150ms ease',
              }}>
                {label}
              </span>
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  )
}
