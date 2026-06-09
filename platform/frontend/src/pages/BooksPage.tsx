import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import AddBookModal from '../components/AddBookModal'

const PHASE_CFG: Record<number, { label: string; color: string }> = {
  1: { label: 'Python',      color: 'var(--cyan)'  },
  2: { label: 'Web & APIs',  color: 'var(--blue)'  },
  3: { label: 'Dados',       color: '#a78bfa'      },
  4: { label: 'Qualidade',   color: 'var(--yellow)'},
  5: { label: 'Testes',      color: 'var(--green)' },
  6: { label: 'Produção',    color: '#f97316'      },
  7: { label: 'Mentalidade', color: '#ec4899'      },
}

interface Book {
  slug: string
  title: string
  author: string
  year: number | null
  phase: number | null
  available: boolean
  progress: number
  cover_url: string | null
  content_type: string
}

function getLocalProgress(slug: string): number {
  try {
    const raw = localStorage.getItem(`book_progress_${slug}`)
    if (!raw) return 0
    return JSON.parse(raw).scrollPercent ?? 0
  } catch { return 0 }
}

function withProgress(books: Omit<Book, 'progress'>[]): Book[] {
  return books.map(b => ({ ...b, progress: getLocalProgress(b.slug) }))
}

// ── FilterTab ─────────────────────────────────────────────────────────────────
function FilterTab({ label, count, active, color, onClick }: {
  label: string; count: number; active: boolean; color: string; onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
        background: active ? `${color}18` : hovered ? 'var(--bg-card)' : 'transparent',
        border: `1px solid ${active ? `${color}50` : hovered ? 'var(--border-lit)' : 'var(--border)'}`,
        color: active ? color : hovered ? 'var(--text)' : 'var(--muted)',
        fontSize: 11, fontWeight: active ? 700 : 500,
        transition: 'all 130ms',
      }}
    >
      {label}
      <span style={{
        fontSize: 9, fontWeight: 700, color: active ? color : 'var(--faint)',
        background: active ? `${color}25` : 'transparent',
        padding: '1px 5px', borderRadius: 3, transition: 'all 130ms',
      }}>
        {count}
      </span>
    </button>
  )
}

// ── BookCard ──────────────────────────────────────────────────────────────────
function BookCard({ book, onClick }: { book: Book; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  const phase = book.phase != null ? PHASE_CFG[book.phase] : null
  const phaseColor = phase?.color ?? 'var(--muted)'

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        background: 'var(--bg-card)',
        border: `1px solid ${hovered ? 'var(--border-lit)' : 'var(--border)'}`,
        borderRadius: 8, overflow: 'hidden',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'border-color 130ms, transform 150ms, box-shadow 130ms',
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.3)' : 'none',
        height: book.cover_url ? 220 : 148,
      }}
    >
      {/* Phase spine */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: phaseColor, opacity: 0.9 }} />

      {/* Cover image */}
      {book.cover_url && (
        <div style={{ height: 100, overflow: 'hidden', flexShrink: 0, marginLeft: 3 }}>
          <img src={book.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      )}

      <div style={{ padding: '12px 14px 12px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Phase badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 9 }}>
          {phase && (
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
              color: phaseColor, padding: '2px 6px', borderRadius: 3,
              background: `${phaseColor}15`, border: `1px solid ${phaseColor}30`,
            }}>
              {phase.label}
            </span>
          )}
          {book.progress > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: 'var(--green)' }}>
              {book.progress}%
            </span>
          )}
        </div>

        {/* Title */}
        <p style={{
          fontSize: 12, fontWeight: 700, margin: '0 0 5px', color: 'var(--text)', lineHeight: 1.45,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1,
        } as React.CSSProperties}>
          {book.title}
        </p>

        {/* Author · year */}
        <p style={{ fontSize: 10, color: 'var(--muted)', margin: 0 }}>
          {book.author}{book.year ? ` · ${book.year}` : ''}
        </p>

        {/* Progress bar */}
        {book.progress > 0 && (
          <div style={{ marginTop: 10, height: 2, background: 'var(--border)', borderRadius: 1 }}>
            <div style={{ width: `${book.progress}%`, height: '100%', background: 'var(--green)', borderRadius: 1 }} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16 }}>
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
      <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>nenhum livro adicionado ainda</p>
      <button onClick={onAdd} className="btn btn-cyan" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        adicionar primeiro livro
      </button>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function BooksPage() {
  const navigate = useNavigate()
  const [books, setBooks] = useState<Book[]>([])
  const [activePhase, setActivePhase] = useState<number | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const fetchBooks = useCallback(() => {
    api.get('/books').then(r => {
      setBooks(withProgress(r.data as Omit<Book, 'progress'>[]))
    }).catch(() => {})
  }, [])

  useEffect(() => { fetchBooks() }, [fetchBooks])

  const filtered = useMemo(
    () => activePhase === null ? books : books.filter(b => b.phase === activePhase),
    [books, activePhase],
  )

  const totalStarted = books.filter(b => b.progress > 0).length

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      {showAddModal && (
        <AddBookModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => fetchBooks()}
        />
      )}

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '52px 48px 72px' }}>

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, color: 'var(--cyan)', marginBottom: 8, fontWeight: 500, letterSpacing: '0.06em' }}>
            // biblioteca de referência
          </p>
          <h1 style={{ fontSize: 40, fontWeight: 800, color: 'var(--text)', margin: '0 0 10px', letterSpacing: '-0.03em' }}>
            livros
          </h1>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 20px', maxWidth: 500, lineHeight: 1.7 }}>
            Seus livros de referência em Markdown ou PDF. Adicione o arquivo e leia direto na plataforma.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <div>
              <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--f-mono)' }}>{books.length}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 7 }}>livros</span>
            </div>
            {totalStarted > 0 && (
              <div>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--cyan)', fontFamily: 'var(--f-mono)' }}>{totalStarted}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 7 }}>em leitura</span>
              </div>
            )}

            <button
              onClick={() => setShowAddModal(true)}
              className="btn btn-cyan"
              style={{ marginLeft: 'auto', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              adicionar livro
            </button>
          </div>
        </div>

        {books.length === 0 ? (
          <EmptyState onAdd={() => setShowAddModal(true)} />
        ) : (
          <>
            {/* Filter tabs */}
            <div className="fade-up" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24, animationDelay: '40ms', opacity: 0 }}>
              <FilterTab
                label="todos" count={books.length} active={activePhase === null}
                color="var(--text)" onClick={() => setActivePhase(null)}
              />
              {Object.entries(PHASE_CFG).map(([id, cfg]) => {
                const count = books.filter(b => b.phase === Number(id)).length
                if (count === 0) return null
                return (
                  <FilterTab
                    key={id}
                    label={cfg.label}
                    count={count}
                    active={activePhase === Number(id)}
                    color={cfg.color}
                    onClick={() => setActivePhase(activePhase === Number(id) ? null : Number(id))}
                  />
                )
              })}
            </div>

            {/* Grid */}
            <div
              className="fade-up"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, animationDelay: '80ms', opacity: 0 }}
            >
              {filtered.map(book => (
                <BookCard key={book.slug} book={book} onClick={() => navigate(`/books/${book.slug}`)} />
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  )
}
