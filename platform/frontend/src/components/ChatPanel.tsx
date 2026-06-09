import { useState, useRef, useEffect } from 'react'
import api from '../api/client'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const ONBOARDING = 'Se precisar pesquisar algo ou usar IA, use aqui — seu histórico alimenta o agente adaptativo.'

export function ChatPanel({ context, style }: {
  context: string
  style?: React.CSSProperties
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setSending(true)
    try {
      const { data } = await api.post('/chat', { message: text, context })
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠ Chat não configurado ainda. Adicione `ANTHROPIC_API_KEY` ao `.env` do backend para ativar.',
      }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg)', ...style }}>

      {/* Onboarding */}
      <div style={{
        padding: '7px 14px', flexShrink: 0,
        borderBottom: '1px solid var(--border)',
        background: 'rgba(34,211,238,0.03)',
        fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--f-mono)',
        lineHeight: 1.5,
      }}>
        {ONBOARDING}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {messages.length === 0 && (
          <p style={{ fontSize: 11, color: 'var(--muted)', opacity: 0.4, margin: '20px auto 0', textAlign: 'center' }}>
            nenhuma mensagem ainda
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
            <div style={{
              padding: '8px 12px',
              borderRadius: m.role === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
              background: m.role === 'user' ? 'rgba(34,211,238,0.1)' : 'var(--bg-card)',
              border: `1px solid ${m.role === 'user' ? 'rgba(34,211,238,0.22)' : 'var(--border)'}`,
              fontSize: 12, color: 'var(--text)', lineHeight: 1.65,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div style={{ alignSelf: 'flex-start' }}>
            <div style={{
              padding: '8px 14px', borderRadius: '10px 10px 10px 2px',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              fontSize: 12, color: 'var(--muted)', letterSpacing: '0.15em',
            }}>
              ···
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        flexShrink: 0, display: 'flex', gap: 7,
        padding: '9px 12px', borderTop: '1px solid var(--border)',
      }}>
        <input
          type="text"
          placeholder="pergunte algo..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          style={{
            flex: 1, height: 30, padding: '0 10px', boxSizing: 'border-box',
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 5, color: 'var(--text)', fontSize: 12,
            fontFamily: 'var(--f-mono)', outline: 'none',
          }}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--border-lit)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          style={{
            width: 30, height: 30, borderRadius: 5, flexShrink: 0,
            background: input.trim() && !sending ? 'rgba(34,211,238,0.1)' : 'transparent',
            border: `1px solid ${input.trim() && !sending ? 'rgba(34,211,238,0.28)' : 'var(--border)'}`,
            cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
            color: input.trim() && !sending ? 'var(--cyan)' : 'var(--muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 120ms',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  )
}
