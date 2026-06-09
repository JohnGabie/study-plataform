import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import api from '../api/client'
import PdfViewer from '../components/PdfViewer'

// ── Types ─────────────────────────────────────────────────────────────────────
interface BookDetail {
  slug: string
  title: string
  author: string
  year: number | null
  phase: number | null
  content_type: 'markdown' | 'pdf'
  content: string | null
  cover_url: string | null
}

interface TocEntry {
  level: number
  text: string
  id: string
}

const PHASE_COLOR: Record<number, string> = {
  1: 'var(--cyan)', 2: 'var(--blue)', 3: '#a78bfa',
  4: 'var(--yellow)', 5: 'var(--green)', 6: '#f97316', 7: '#ec4899',
}
const PHASE_LABEL: Record<number, string> = {
  1: 'Python', 2: 'Web & APIs', 3: 'Dados',
  4: 'Qualidade', 5: 'Testes', 6: 'Produção', 7: 'Mentalidade',
}

function headingId(text: string): string {
  return String(text).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
}

function extractToc(md: string): TocEntry[] {
  const entries: TocEntry[] = []
  const re = /^(#{1,3}) (.+)$/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(md)) !== null) {
    entries.push({ level: m[1].length, text: m[2].replace(/\*\*/g, ''), id: headingId(m[2]) })
  }
  return entries
}

// ── localStorage progress ─────────────────────────────────────────────────────
function saveProgress(slug: string, data: object) {
  localStorage.setItem(`book_progress_${slug}`, JSON.stringify({ ...data, lastRead: new Date().toISOString() }))
}
function loadProgress(slug: string): { scrollPercent?: number; currentPage?: number } {
  try { return JSON.parse(localStorage.getItem(`book_progress_${slug}`) || '{}') } catch { return {} }
}

// ── MD renderer ───────────────────────────────────────────────────────────────
const MD_COMPONENTS = {
  h1: ({ children, ...p }: any) => <h1 id={headingId(String(children))} style={{ fontSize: 22, fontWeight: 800, margin: '0 0 16px', paddingBottom: 12, borderBottom: '1px solid var(--border)', color: 'var(--text)', lineHeight: 1.3 }} {...p}>{children}</h1>,
  h2: ({ children, ...p }: any) => <h2 id={headingId(String(children))} style={{ fontSize: 17, fontWeight: 700, margin: '36px 0 12px', color: 'var(--text)', lineHeight: 1.4 }} {...p}>{children}</h2>,
  h3: ({ children, ...p }: any) => <h3 id={headingId(String(children))} style={{ fontSize: 14, fontWeight: 600, margin: '24px 0 8px', color: 'rgba(240,240,240,0.6)', lineHeight: 1.4 }} {...p}>{children}</h3>,
  p:  ({ children, ...p }: any) => <p style={{ margin: '0 0 14px', lineHeight: 1.85, color: 'var(--text)' }} {...p}>{children}</p>,
  a:  ({ children, href, ...p }: any) => <a href={href} style={{ color: 'var(--cyan)' }} target="_blank" rel="noopener noreferrer" {...p}>{children}</a>,
  code: ({ inline, children, ...p }: any) => inline
    ? <code style={{ color: 'var(--cyan)', background: 'rgba(34,211,238,0.08)', padding: '1px 6px', borderRadius: 4, fontSize: '0.9em' }} {...p}>{children}</code>
    : <code style={{ display: 'block', color: 'var(--text)', fontFamily: 'var(--f-mono)' }} {...p}>{children}</code>,
  pre:  ({ children, ...p }: any) => <pre style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, overflowX: 'auto', padding: '14px 16px', margin: '0 0 16px', fontSize: 12, lineHeight: 1.6 }} {...p}>{children}</pre>,
  blockquote: ({ children, ...p }: any) => <blockquote style={{ borderLeft: '3px solid var(--cyan)', background: 'rgba(34,211,238,0.05)', margin: '0 0 16px', padding: '10px 16px', borderRadius: '0 6px 6px 0' }} {...p}>{children}</blockquote>,
  ul: ({ children, ...p }: any) => <ul style={{ paddingLeft: 20, margin: '0 0 14px', lineHeight: 1.85, color: 'var(--text)' }} {...p}>{children}</ul>,
  ol: ({ children, ...p }: any) => <ol style={{ paddingLeft: 20, margin: '0 0 14px', lineHeight: 1.85, color: 'var(--text)' }} {...p}>{children}</ol>,
  li: ({ children, ...p }: any) => <li style={{ marginBottom: 4 }} {...p}>{children}</li>,
  table: ({ children, ...p }: any) => <div style={{ overflowX: 'auto', marginBottom: 16 }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }} {...p}>{children}</table></div>,
  th: ({ children, ...p }: any) => <th style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--muted)', fontWeight: 600, fontSize: 11, letterSpacing: '0.04em' }} {...p}>{children}</th>,
  td: ({ children, ...p }: any) => <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text)' }} {...p}>{children}</td>,
  hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '28px 0' }} />,
  strong: ({ children, ...p }: any) => <strong style={{ color: 'var(--text)', fontWeight: 700 }} {...p}>{children}</strong>,
}

// ── TOC sidebar ───────────────────────────────────────────────────────────────
function TocSidebar({ toc, onNavigate }: { toc: TocEntry[]; onNavigate: (id: string) => void }) {
  if (toc.length === 0) return null
  return (
    <div style={{
      width: 220, flexShrink: 0, borderRight: '1px solid var(--border)',
      overflowY: 'auto', paddingTop: 24, paddingBottom: 24,
    }}>
      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', padding: '0 16px', marginBottom: 10 }}>
        índice
      </p>
      {toc.map((entry, i) => (
        <button
          key={i}
          onClick={() => onNavigate(entry.id)}
          style={{
            display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
            padding: `5px 16px 5px ${8 + (entry.level - 1) * 12}px`,
            fontSize: entry.level === 1 ? 12 : 11,
            fontWeight: entry.level === 1 ? 600 : 400,
            color: entry.level === 1 ? 'var(--text)' : 'var(--muted)',
            lineHeight: 1.4,
            transition: 'color 120ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={e => (e.currentTarget.style.color = entry.level === 1 ? 'var(--text)' : 'var(--muted)')}
        >
          {entry.text}
        </button>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BookReaderPage() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()

  const [book, setBook] = useState<BookDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const handlePdfLoad = useCallback((n: number) => setNumPages(n), [])
  const handlePageChange = useCallback((p: number) => setCurrentPage(p), [])

  // MD state
  const contentRef = useRef<HTMLDivElement>(null)
  const [toc, setToc] = useState<TocEntry[]>([])
  const scrollSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // fetch book
  useEffect(() => {
    setLoading(true)
    setError(null)
    api.get(`/books/${slug}`)
      .then(r => {
        const data: BookDetail = r.data
        setBook(data)
        if (data.content) setToc(extractToc(data.content))
        setLoading(false)
        const prog = loadProgress(slug)
        if (data.content_type === 'pdf' && prog.currentPage) {
          setCurrentPage(prog.currentPage)
        }
      })
      .catch(e => {
        setError(e.response?.data?.detail || 'Erro ao carregar livro')
        setLoading(false)
      })
  }, [slug])

  // Restore MD scroll after content renders
  useEffect(() => {
    if (!book?.content || !contentRef.current) return
    const prog = loadProgress(slug)
    if (prog.scrollPercent && prog.scrollPercent > 0) {
      const el = contentRef.current
      requestAnimationFrame(() => {
        el.scrollTop = ((el.scrollHeight - el.clientHeight) * prog.scrollPercent!) / 100
      })
    }
  }, [book, slug])

  // MD scroll tracking (throttled 500ms)
  const handleMdScroll = useCallback(() => {
    if (scrollSaveTimer.current) clearTimeout(scrollSaveTimer.current)
    scrollSaveTimer.current = setTimeout(() => {
      const el = contentRef.current
      if (!el) return
      const scrollPercent = Math.round((el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight)) * 100)
      saveProgress(slug, { scrollPercent })
    }, 500)
  }, [slug])

  // PDF page tracking
  useEffect(() => {
    if (book?.content_type !== 'pdf' || numPages === 0) return
    saveProgress(slug, { currentPage, totalPages: numPages, scrollPercent: Math.round((currentPage / numPages) * 100) })
  }, [currentPage, numPages, slug, book])

  const phaseColor = book?.phase != null ? (PHASE_COLOR[book.phase] ?? 'var(--cyan)') : 'var(--cyan)'
  const phaseLabel = book?.phase != null ? (PHASE_LABEL[book.phase] ?? '') : ''
  const progressPct = (() => {
    const p = loadProgress(slug)
    if (book?.content_type === 'pdf' && numPages > 0) return Math.round((currentPage / numPages) * 100)
    return p.scrollPercent ?? 0
  })()

  // ── Render states ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>carregando...</span>
      </div>
    )
  }

  if (error || !book) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>{error ?? 'Livro não encontrado'}</p>
        <button onClick={() => navigate('/books')} className="btn btn-cyan" style={{ fontSize: 11 }}>
          ← Biblioteca
        </button>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

      {/* Reading progress bar (3px at very top) */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--border)', zIndex: 30 }}>
        <div style={{ width: `${progressPct}%`, height: '100%', background: phaseColor, transition: 'width 400ms ease' }} />
      </div>

      {/* Header bar */}
      <div style={{
        height: 51, flexShrink: 0, marginTop: 3,
        display: 'flex', alignItems: 'center', gap: 14,
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
        padding: '0 20px',
      }}>
        <button
          onClick={() => navigate('/books')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 5, transition: 'color 120ms, background 120ms', flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--bg-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'none' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          livros
        </button>

        <div style={{ width: 1, height: 16, background: 'var(--border)', flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {book.title}
          </p>
          <p style={{ margin: 0, fontSize: 10, color: 'var(--muted)' }}>
            {book.author}{book.year ? ` · ${book.year}` : ''}
          </p>
        </div>

        {phaseLabel && (
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
            color: phaseColor, padding: '3px 8px', borderRadius: 4, flexShrink: 0,
            background: `${phaseColor}15`, border: `1px solid ${phaseColor}30`,
          }}>
            {phaseLabel}
          </span>
        )}

        {book.content_type === 'pdf' && numPages > 0 && (
          <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--f-mono)', flexShrink: 0 }}>
            {currentPage} / {numPages}
          </span>
        )}
      </div>

      {/* Body: TOC + Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {book.content_type === 'markdown' && (
          <TocSidebar toc={toc} onNavigate={id => {
            const el = document.getElementById(id)
            if (el && contentRef.current) {
              contentRef.current.scrollTo({ top: el.offsetTop - 20, behavior: 'smooth' })
            }
          }} />
        )}

        {book.content_type === 'markdown' ? (
          <div
            ref={contentRef}
            onScroll={handleMdScroll}
            style={{ flex: 1, overflowY: 'auto', padding: '36px 52px 80px' }}
          >
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              <ReactMarkdown components={MD_COMPONENTS as any}>{book.content ?? ''}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <PdfViewer
              slug={slug}
              onLoadSuccess={handlePdfLoad}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </div>
  )
}
