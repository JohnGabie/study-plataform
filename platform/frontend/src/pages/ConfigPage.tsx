import { useEffect, useRef, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../auth/AuthContext'

// ── Section nav ──────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'conta',        label: 'Conta' },
  { id: 'integracoes',  label: 'Integrações' },
  { id: 'aprendizado',  label: 'Aprendizado' },
]

function SectionNav({ active, onSelect }: { active: string; onSelect: (id: string) => void }) {
  return (
    <div style={{
      width: 180, flexShrink: 0,
      position: 'sticky', top: 32, alignSelf: 'flex-start',
    }}>
      {SECTIONS.map(s => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          style={{
            display: 'block', width: '100%', textAlign: 'left',
            padding: '8px 12px', marginBottom: 2, borderRadius: 6,
            fontSize: 12, fontWeight: active === s.id ? 700 : 500,
            cursor: 'pointer', border: 'none',
            background: active === s.id ? 'rgba(34,211,238,0.08)' : 'transparent',
            color: active === s.id ? 'var(--cyan)' : 'var(--muted)',
            borderLeft: `2px solid ${active === s.id ? 'var(--cyan)' : 'transparent'}`,
            transition: 'all 130ms',
          }}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: 56 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
        paddingBottom: 12, borderBottom: '1px solid var(--border)',
      }}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

// ── Conta ─────────────────────────────────────────────────────────────────────

function ContaSection() {
  const { user } = useAuth()
  const [name, setName] = useState(user?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function saveName() {
    if (!name.trim() || name === user?.name) return
    setSaving(true)
    try {
      await api.patch('/users/me', { name: name.trim() })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section id="conta" title="Conta">
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt="" style={{
            width: 64, height: 64, borderRadius: '50%',
            border: '2px solid var(--border)',
          }} />
        ) : (
          <div style={{
            width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
            background: 'var(--cyan-faint)', border: '2px solid var(--cyan-glow)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 800, color: 'var(--cyan)',
          }}>
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}
        <div>
          <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{user?.name}</p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>{user?.email}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 560 }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6, fontFamily: 'var(--f-mono)' }}>
            nome de exibição
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveName()}
              style={{
                flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 6, padding: '8px 10px', fontSize: 12,
                color: 'var(--text)', outline: 'none', fontFamily: 'var(--f-mono)',
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--cyan-glow)'}
              onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
            />
            <button
              onClick={saveName}
              disabled={saving || !name.trim() || name === user?.name}
              style={{
                padding: '8px 14px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                background: saved ? 'rgba(34,211,238,0.12)' : 'var(--bg-card)',
                border: `1px solid ${saved ? 'rgba(34,211,238,0.3)' : 'var(--border)'}`,
                color: saved ? 'var(--cyan)' : 'var(--muted)',
                transition: 'all 130ms',
                opacity: (!name.trim() || name === user?.name) ? 0.4 : 1,
              }}
            >
              {saved ? '✓' : saving ? '...' : 'salvar'}
            </button>
          </div>
        </div>

        <div>
          <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 6, fontFamily: 'var(--f-mono)' }}>
            e-mail
          </label>
          <input
            value={user?.email ?? ''}
            readOnly
            style={{
              width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '8px 10px', fontSize: 12,
              color: 'var(--muted)', fontFamily: 'var(--f-mono)',
              boxSizing: 'border-box', cursor: 'default',
            }}
          />
        </div>
      </div>
    </Section>
  )
}

// ── Integrações (MCP tokens) ──────────────────────────────────────────────────

interface Token {
  id: string
  name: string
  created_at: string
  last_used_at: string | null
  token?: string
}

function IntegracoesSection() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('Claude Code')
  const [freshToken, setFreshToken] = useState<Token | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState('http://localhost:8000')
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    api.get('/auth/tokens').then(r => setTokens(r.data))
  }, [])

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    if (copiedTimer.current) clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopied(null), 1800)
  }

  async function createToken() {
    const r = await api.post('/auth/tokens', { name: newName })
    setFreshToken(r.data)
    setTokens(prev => [r.data, ...prev])
    setCreating(false)
    setNewName('Claude Code')
  }

  async function revokeToken(id: string) {
    await api.delete(`/auth/tokens/${id}`)
    setTokens(prev => prev.filter(t => t.id !== id))
    if (freshToken?.id === id) setFreshToken(null)
  }

  function downloadClaudeMd() {
    api.get('/auth/tokens/claude-md', { responseType: 'blob' }).then(r => {
      const url = URL.createObjectURL(r.data)
      const a = document.createElement('a')
      a.href = url; a.download = 'CLAUDE.md'; a.click()
      URL.revokeObjectURL(url)
    })
  }

  const mcpConfig = (raw: string) => JSON.stringify({
    mcpServers: {
      'study-platform': {
        type: 'http',
        url: `${serverUrl}/mcp`,
        headers: { Authorization: `Bearer ${raw}` },
      },
    },
  }, null, 2)

  return (
    <Section id="integracoes" title="Integrações">

      {/* MCP header */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
          MCP — Claude Code local
        </p>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
          Gere um token para conectar o Claude Code local à plataforma via MCP.
          O Claude poderá ver seus exercícios, submeter soluções e acompanhar progresso.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={downloadClaudeMd}
          style={{
            fontSize: 11, padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--muted)',
          }}
        >
          ↓ CLAUDE.md
        </button>
        <button
          onClick={() => setCreating(true)}
          style={{
            fontSize: 11, padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
            background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.25)',
            color: 'var(--cyan)',
          }}
        >
          + gerar token
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          padding: '10px 14px', borderRadius: 6, marginBottom: 12,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
        }}>
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createToken(); if (e.key === 'Escape') setCreating(false) }}
            placeholder="nome do token"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 12, color: 'var(--text)', fontFamily: 'var(--f-mono)',
            }}
          />
          <button onClick={createToken} style={{
            fontSize: 11, padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
            background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.3)',
            color: 'var(--cyan)',
          }}>criar</button>
          <button onClick={() => setCreating(false)} style={{
            fontSize: 11, padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
            background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)',
          }}>cancelar</button>
        </div>
      )}

      {/* Fresh token — shown once */}
      {freshToken?.token && (
        <div style={{
          padding: '16px 18px', borderRadius: 6, marginBottom: 16,
          background: 'rgba(34,211,238,0.04)', border: '1px solid rgba(34,211,238,0.2)',
        }}>
          <p style={{ fontSize: 11, color: 'var(--cyan)', fontWeight: 700, margin: '0 0 8px', fontFamily: 'var(--f-mono)' }}>
            token gerado — copie agora, não será exibido novamente
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
            <code style={{
              flex: 1, fontSize: 11, color: 'var(--text)', padding: '6px 10px', borderRadius: 4,
              background: 'var(--bg)', border: '1px solid var(--border)',
              fontFamily: 'var(--f-mono)', wordBreak: 'break-all',
            }}>
              {freshToken.token}
            </code>
            <button
              onClick={() => copy(freshToken.token!, 'raw')}
              style={{
                flexShrink: 0, fontSize: 11, padding: '6px 12px', borderRadius: 4, cursor: 'pointer',
                background: copied === 'raw' ? 'rgba(34,211,238,0.15)' : 'var(--bg-card)',
                border: `1px solid ${copied === 'raw' ? 'rgba(34,211,238,0.4)' : 'var(--border)'}`,
                color: copied === 'raw' ? 'var(--cyan)' : 'var(--muted)',
                transition: 'all 130ms',
              }}
            >
              {copied === 'raw' ? 'copiado!' : 'copiar'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--f-mono)', flexShrink: 0 }}>
              URL do servidor:
            </span>
            <input
              value={serverUrl}
              onChange={e => setServerUrl(e.target.value)}
              style={{
                flex: 1, background: 'var(--bg)', border: '1px solid var(--border)', outline: 'none',
                fontSize: 11, color: 'var(--text)', fontFamily: 'var(--f-mono)',
                padding: '4px 8px', borderRadius: 4,
              }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <pre style={{
              margin: 0, fontSize: 10, color: 'var(--muted)',
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 4, padding: '10px 12px', overflow: 'auto',
              fontFamily: 'var(--f-mono)', lineHeight: 1.6,
            }}>
              {mcpConfig(freshToken.token)}
            </pre>
            <button
              onClick={() => copy(mcpConfig(freshToken.token!), 'json')}
              style={{
                position: 'absolute', top: 8, right: 8,
                fontSize: 10, padding: '3px 8px', borderRadius: 3, cursor: 'pointer',
                background: copied === 'json' ? 'rgba(34,211,238,0.15)' : 'var(--bg-card)',
                border: `1px solid ${copied === 'json' ? 'rgba(34,211,238,0.35)' : 'var(--border)'}`,
                color: copied === 'json' ? 'var(--cyan)' : 'var(--muted)',
                transition: 'all 130ms',
              }}
            >
              {copied === 'json' ? 'copiado!' : 'copiar config'}
            </button>
          </div>
          <p style={{ fontSize: 10, color: 'var(--muted)', margin: '8px 0 0', opacity: 0.6 }}>
            Cole em{' '}
            <code style={{ fontFamily: 'var(--f-mono)' }}>~/.claude.json</code>
            {' '}sob a chave{' '}
            <code style={{ fontFamily: 'var(--f-mono)' }}>mcpServers</code>
            {' '}ou use{' '}
            <code style={{ fontFamily: 'var(--f-mono)' }}>claude mcp add --transport http study-platform {serverUrl}/mcp</code>
          </p>
        </div>
      )}

      {/* Token list */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
        {tokens.length === 0 ? (
          <p style={{ fontSize: 11, color: 'var(--muted)', padding: '16px', margin: 0 }}>
            nenhum token gerado ainda.
          </p>
        ) : tokens.map((t, i) => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '11px 14px',
            borderBottom: i < tokens.length - 1 ? '1px solid var(--border)' : 'none',
            background: freshToken?.id === t.id ? 'rgba(34,211,238,0.03)' : 'transparent',
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: t.last_used_at ? 'var(--cyan)' : 'var(--border)',
              boxShadow: t.last_used_at ? '0 0 5px rgba(34,211,238,0.5)' : 'none',
            }} />
            <span style={{ flex: 1, fontSize: 12, color: 'var(--text)', fontFamily: 'var(--f-mono)' }}>
              {t.name}
            </span>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--f-mono)', flexShrink: 0 }}>
              {new Date(t.created_at).toLocaleDateString('pt-BR')}
            </span>
            {t.last_used_at && (
              <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--f-mono)', flexShrink: 0 }}>
                usado {new Date(t.last_used_at).toLocaleDateString('pt-BR')}
              </span>
            )}
            <button
              onClick={() => revokeToken(t.id)}
              style={{
                fontSize: 10, padding: '3px 8px', borderRadius: 4, cursor: 'pointer',
                background: 'transparent', border: '1px solid var(--border)',
                color: 'var(--muted)', flexShrink: 0, transition: 'all 130ms',
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444' }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}
            >
              revogar
            </button>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── Aprendizado ───────────────────────────────────────────────────────────────

const DIFFICULTY_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: '8kyu', label: '8 kyu' },
  { value: '7kyu', label: '7 kyu' },
  { value: '6kyu', label: '6 kyu' },
  { value: '5kyu', label: '5 kyu' },
  { value: '4kyu', label: '4 kyu' },
]

const GOAL_OPTIONS = [1, 2, 3, 5, 10]

function LS_GET(key: string, fallback: string) {
  try { return localStorage.getItem(key) ?? fallback } catch { return fallback }
}
function LS_SET(key: string, value: string) {
  try { localStorage.setItem(key, value) } catch { /* ignore */ }
}

function AprendizadoSection() {
  const [dailyGoal, setDailyGoal] = useState(() => LS_GET('study_daily_goal', '3'))
  const [difficulty, setDifficulty] = useState(() => LS_GET('study_default_difficulty', ''))

  function setGoal(v: string) { setDailyGoal(v); LS_SET('study_daily_goal', v) }
  function setDiff(v: string) { setDifficulty(v); LS_SET('study_default_difficulty', v) }

  return (
    <Section id="aprendizado" title="Aprendizado">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, maxWidth: 560 }}>

        <div>
          <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 10, fontFamily: 'var(--f-mono)' }}>
            meta diária de exercícios
          </label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {GOAL_OPTIONS.map(n => (
              <button
                key={n}
                onClick={() => setGoal(String(n))}
                style={{
                  width: 40, height: 36, borderRadius: 6, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--f-mono)',
                  background: dailyGoal === String(n) ? 'rgba(34,211,238,0.1)' : 'var(--bg-card)',
                  border: `1px solid ${dailyGoal === String(n) ? 'rgba(34,211,238,0.35)' : 'var(--border)'}`,
                  color: dailyGoal === String(n) ? 'var(--cyan)' : 'var(--muted)',
                  transition: 'all 130ms',
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 10, color: 'var(--muted)', opacity: 0.6 }}>
            exercícios por dia
          </p>
        </div>

        <div>
          <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 10, fontFamily: 'var(--f-mono)' }}>
            dificuldade padrão no kata
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {DIFFICULTY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDiff(opt.value)}
                style={{
                  textAlign: 'left', padding: '6px 10px', borderRadius: 5, fontSize: 11,
                  cursor: 'pointer', fontFamily: 'var(--f-mono)',
                  background: difficulty === opt.value ? 'rgba(34,211,238,0.08)' : 'transparent',
                  border: `1px solid ${difficulty === opt.value ? 'rgba(34,211,238,0.3)' : 'transparent'}`,
                  color: difficulty === opt.value ? 'var(--cyan)' : 'var(--muted)',
                  transition: 'all 130ms',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </Section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ConfigPage() {
  const [active, setActive] = useState('conta')

  function scrollTo(id: string) {
    setActive(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 56px 80px' }}>

        <h1 style={{
          fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em',
          color: 'var(--text)', margin: '0 0 40px',
        }}>
          Configurações
        </h1>

        <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start' }}>
          <SectionNav active={active} onSelect={scrollTo} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <ContaSection />
            <IntegracoesSection />
            <AprendizadoSection />
          </div>
        </div>

      </div>
    </div>
  )
}
