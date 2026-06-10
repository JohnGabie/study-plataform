import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../auth/AuthContext'

// ── Primitives ────────────────────────────────────────────────────────────────

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <p style={{
        margin: '0 0 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--f-mono)',
      }}>
        {label}
      </p>
      <div style={{
        border: '1px solid var(--border)', borderRadius: 8,
        background: 'var(--bg-card)', overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  )
}

function Row({
  label, description, last = false, danger = false, children,
}: {
  label: string
  description?: string
  last?: boolean
  danger?: boolean
  children?: React.ReactNode
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 24, padding: '14px 20px',
      borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      <div style={{ minWidth: 0 }}>
        <p style={{
          margin: '0 0 2px', fontSize: 13, fontWeight: 600,
          color: danger ? '#f87171' : 'var(--text)',
        }}>
          {label}
        </p>
        {description && (
          <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
            {description}
          </p>
        )}
      </div>
      {children && (
        <div style={{ flexShrink: 0 }}>{children}</div>
      )}
    </div>
  )
}

// ── Conta ─────────────────────────────────────────────────────────────────────

function ContaSection() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() { setEditing(true); setTimeout(() => inputRef.current?.select(), 30) }

  async function saveName() {
    if (!name.trim() || name.trim() === user?.name) { setEditing(false); setName(user?.name ?? ''); return }
    setSaving(true)
    try {
      await api.patch('/users/me', { name: name.trim() })
      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  return (
    <Group label="Conta">
      {/* Identity */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '20px 20px 16px',
        borderBottom: '1px solid var(--border)',
      }}>
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt="" style={{
            width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
            border: '2px solid var(--border)',
          }} />
        ) : (
          <div style={{
            width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: 'var(--cyan)',
          }}>
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
        )}
        <div>
          <p style={{ margin: '0 0 1px', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            {user?.name}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>
            {user?.email}
          </p>
        </div>
      </div>

      {/* Name edit */}
      <Row label="Nome de exibição" description="Aparece no perfil e no contexto do MCP.">
        {editing ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setEditing(false); setName(user?.name ?? '') } }}
              style={{
                width: 180, background: 'var(--bg)', border: '1px solid rgba(34,211,238,0.4)',
                borderRadius: 5, padding: '6px 10px', fontSize: 12,
                color: 'var(--text)', outline: 'none', fontFamily: 'var(--f-mono)',
              }}
            />
            <button onClick={saveName} style={btnCyan}>
              {saving ? '…' : saved ? '✓' : 'salvar'}
            </button>
            <button onClick={() => { setEditing(false); setName(user?.name ?? '') }} style={btnGhost}>
              ✕
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: saved ? 'var(--cyan)' : 'var(--muted)', fontFamily: 'var(--f-mono)' }}>
              {user?.name}
            </span>
            <button onClick={startEdit} style={btnGhost}>editar</button>
          </div>
        )}
      </Row>

      {/* Email */}
      <Row label="E-mail" description="Autenticado via Google. Não pode ser alterado.">
        <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>
          {user?.email}
        </span>
      </Row>

      {/* Logout */}
      <Row label="Sair da conta" last danger>
        <button
          onClick={() => { logout(); navigate('/login') }}
          style={{
            fontSize: 11, padding: '6px 14px', borderRadius: 5, cursor: 'pointer',
            background: 'transparent', border: '1px solid #3f1515',
            color: '#f87171', transition: 'all 130ms',
          }}
          onMouseOver={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = '#ef4444' }}
          onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#3f1515' }}
        >
          Sair
        </button>
      </Row>
    </Group>
  )
}

// ── MCP Tokens ────────────────────────────────────────────────────────────────

interface Token { id: string; name: string; created_at: string; last_used_at: string | null; token?: string }

function IntegracoesSection() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('Claude Code')
  const [freshToken, setFreshToken] = useState<Token | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState('http://localhost:8000')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const createInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { api.get('/auth/tokens').then(r => setTokens(r.data)) }, [])
  useEffect(() => { if (creating) setTimeout(() => createInputRef.current?.focus(), 30) }, [creating])

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(null), 1800)
  }

  async function createToken() {
    const r = await api.post('/auth/tokens', { name: newName.trim() || 'Claude Code' })
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
    mcpServers: { 'study-platform': { type: 'http', url: `${serverUrl}/mcp`, headers: { Authorization: `Bearer ${raw}` } } },
  }, null, 2)

  return (
    <Group label="Integrações">

      {/* MCP header row */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        gap: 16, padding: '14px 20px', borderBottom: '1px solid var(--border)',
      }}>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            MCP — Claude Code
          </p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
            Conecte o Claude Code local à plataforma para acessar exercícios e progresso via tools.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, paddingTop: 2 }}>
          <button onClick={downloadClaudeMd} style={btnGhost}>↓ CLAUDE.md</button>
          <button onClick={() => setCreating(v => !v)} style={creating ? btnGhost : btnCyan}>
            {creating ? '✕' : '+ token'}
          </button>
        </div>
      </div>

      {/* Inline create form */}
      {creating && (
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center',
          padding: '10px 20px', borderBottom: '1px solid var(--border)',
          background: 'rgba(34,211,238,0.03)',
        }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0, fontFamily: 'var(--f-mono)' }}>
            nome:
          </span>
          <input
            ref={createInputRef}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createToken(); if (e.key === 'Escape') setCreating(false) }}
            style={{
              flex: 1, background: 'var(--bg)', border: '1px solid rgba(34,211,238,0.3)',
              borderRadius: 5, padding: '6px 10px', fontSize: 12,
              color: 'var(--text)', outline: 'none', fontFamily: 'var(--f-mono)',
            }}
          />
          <button onClick={createToken} style={btnCyan}>criar</button>
        </div>
      )}

      {/* Fresh token reveal */}
      {freshToken?.token && (
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          background: 'rgba(34,211,238,0.04)',
          borderLeft: '3px solid var(--cyan)',
        }}>
          <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: 'var(--cyan)', fontFamily: 'var(--f-mono)' }}>
            ✓ token gerado — copie agora, não será mostrado novamente
          </p>

          {/* Raw token */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
            <code style={{
              flex: 1, fontSize: 11, padding: '7px 10px', borderRadius: 5,
              background: 'var(--bg)', border: '1px solid var(--border)',
              color: 'var(--text)', fontFamily: 'var(--f-mono)',
              wordBreak: 'break-all', lineHeight: 1.5,
            }}>
              {freshToken.token}
            </code>
            <button onClick={() => copy(freshToken.token!, 'raw')} style={copied === 'raw' ? btnCyan : btnGhost}>
              {copied === 'raw' ? '✓ copiado' : 'copiar'}
            </button>
          </div>

          {/* Server URL + JSON config */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--f-mono)', flexShrink: 0 }}>
              servidor:
            </span>
            <input
              value={serverUrl}
              onChange={e => setServerUrl(e.target.value)}
              style={{
                flex: 1, maxWidth: 260, background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 5, padding: '4px 8px', fontSize: 11, outline: 'none',
                color: 'var(--text)', fontFamily: 'var(--f-mono)',
              }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <pre style={{
              margin: 0, fontSize: 10.5, lineHeight: 1.65,
              color: 'var(--muted)', background: 'var(--bg)',
              border: '1px solid var(--border)', borderRadius: 6,
              padding: '12px 14px', overflow: 'auto', fontFamily: 'var(--f-mono)',
            }}>
              {mcpConfig(freshToken.token)}
            </pre>
            <button
              onClick={() => copy(mcpConfig(freshToken.token!), 'json')}
              style={{
                ...(copied === 'json' ? btnCyan : btnGhost),
                position: 'absolute', top: 8, right: 8,
              }}
            >
              {copied === 'json' ? '✓ copiado' : 'copiar config'}
            </button>
          </div>

          <p style={{ margin: '8px 0 0', fontSize: 10, color: 'var(--muted)', opacity: 0.7, lineHeight: 1.6 }}>
            Cole em <code style={{ fontFamily: 'var(--f-mono)' }}>~/.claude.json</code> sob <code style={{ fontFamily: 'var(--f-mono)' }}>mcpServers</code>
            {' '}ou rode: <code style={{ fontFamily: 'var(--f-mono)' }}>claude mcp add --transport http study-platform {serverUrl}/mcp</code>
          </p>
        </div>
      )}

      {/* Token list */}
      {tokens.length === 0 ? (
        <div style={{ padding: '16px 20px' }}>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>
            Nenhum token ainda. Crie um para conectar o Claude Code.
          </p>
        </div>
      ) : tokens.map((t, i) => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '11px 20px',
          borderBottom: i < tokens.length - 1 ? '1px solid var(--border)' : 'none',
          background: freshToken?.id === t.id ? 'rgba(34,211,238,0.02)' : 'transparent',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: t.last_used_at ? 'var(--cyan)' : 'var(--faint)',
            boxShadow: t.last_used_at ? '0 0 4px var(--cyan)' : 'none',
          }} />
          <span style={{ flex: 1, fontSize: 12, color: 'var(--text)', fontFamily: 'var(--f-mono)' }}>
            {t.name}
          </span>
          <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--f-mono)' }}>
            {t.last_used_at
              ? `usado ${new Date(t.last_used_at).toLocaleDateString('pt-BR')}`
              : `criado ${new Date(t.created_at).toLocaleDateString('pt-BR')}`}
          </span>
          <button
            onClick={() => revokeToken(t.id)}
            style={btnGhost}
            onMouseOver={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = '#3f1515' }}
            onMouseOut={e => { e.currentTarget.style.color = (btnGhost as any).color; e.currentTarget.style.borderColor = (btnGhost as any).borderColor }}
          >
            revogar
          </button>
        </div>
      ))}
    </Group>
  )
}

// ── Aprendizado ───────────────────────────────────────────────────────────────

const DIFF_OPTIONS = [
  { value: '', label: 'Todos', color: 'var(--muted)' },
  { value: '8kyu', label: '8 kyu', color: '#9b9b9b' },
  { value: '7kyu', label: '7 kyu', color: '#3b82f6' },
  { value: '6kyu', label: '6 kyu', color: '#22d3ee' },
  { value: '5kyu', label: '5 kyu', color: '#22c55e' },
  { value: '4kyu', label: '4 kyu', color: '#eab308' },
]
const GOAL_OPTIONS = [1, 2, 3, 5, 10]

function ls(key: string, def: string) { try { return localStorage.getItem(key) ?? def } catch { return def } }
function lsSet(key: string, v: string) { try { localStorage.setItem(key, v) } catch { /* */ } }

function AprendizadoSection() {
  const [goal, setGoal] = useState(() => ls('study_daily_goal', '3'))
  const [diff, setDiff] = useState(() => ls('study_default_difficulty', ''))

  return (
    <Group label="Aprendizado">
      <Row label="Meta diária" description="Exercícios que você quer completar por dia.">
        <div style={{ display: 'flex', gap: 5 }}>
          {GOAL_OPTIONS.map(n => (
            <button
              key={n}
              onClick={() => { setGoal(String(n)); lsSet('study_daily_goal', String(n)) }}
              style={{
                width: 36, height: 32, borderRadius: 5, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--f-mono)', transition: 'all 130ms',
                background: goal === String(n) ? 'rgba(34,211,238,0.12)' : 'var(--bg)',
                border: `1px solid ${goal === String(n) ? 'rgba(34,211,238,0.4)' : 'var(--border)'}`,
                color: goal === String(n) ? 'var(--cyan)' : 'var(--muted)',
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </Row>

      <Row label="Dificuldade padrão" description="Filtro inicial ao abrir a lista de kata." last>
        <div style={{ display: 'flex', gap: 5 }}>
          {DIFF_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setDiff(opt.value); lsSet('study_default_difficulty', opt.value) }}
              style={{
                padding: '5px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--f-mono)', transition: 'all 130ms',
                background: diff === opt.value ? `${opt.color}18` : 'var(--bg)',
                border: `1px solid ${diff === opt.value ? `${opt.color}55` : 'var(--border)'}`,
                color: diff === opt.value ? opt.color : 'var(--muted)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Row>
    </Group>
  )
}

// ── Shared button styles ──────────────────────────────────────────────────────

const btnCyan: React.CSSProperties = {
  fontSize: 11, padding: '5px 12px', borderRadius: 5, cursor: 'pointer',
  background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)',
  color: 'var(--cyan)', transition: 'all 130ms', fontFamily: 'var(--f-mono)',
}

const btnGhost: React.CSSProperties = {
  fontSize: 11, padding: '5px 12px', borderRadius: 5, cursor: 'pointer',
  background: 'transparent', border: '1px solid var(--border)',
  color: 'var(--muted)', transition: 'all 130ms', fontFamily: 'var(--f-mono)',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ConfigPage() {
  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '44px 40px 80px' }}>
        <h1 style={{
          margin: '0 0 36px', fontSize: 20, fontWeight: 800,
          letterSpacing: '-0.03em', color: 'var(--text)',
        }}>
          Configurações
        </h1>
        <ContaSection />
        <IntegracoesSection />
        <AprendizadoSection />
      </div>
    </div>
  )
}
