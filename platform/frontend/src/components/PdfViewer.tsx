import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import api from '../api/client'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

type ViewMode = 'single' | 'double'

interface Props {
  slug: string
  onLoadSuccess: (numPages: number) => void
  onPageChange:  (page: number) => void
  onToggleText?: () => void
  textMode?: boolean
  extractingText?: boolean
}

const ZOOM_STEPS = [0.5, 0.7, 0.85, 1.0, 1.25, 1.5, 2.0]
const DARK_FILTER = 'invert(1) hue-rotate(180deg)'
const BASE_MAX_W  = 860

// ── Toolbar button style helper ───────────────────────────────────────────────
function btnStyle(active = false, disabled = false): React.CSSProperties {
  return {
    width: 28, height: 28, padding: 0, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: active ? 'rgba(68,188,211,0.12)' : 'transparent',
    border: `1px solid ${active ? 'rgba(68,188,211,0.40)' : 'transparent'}`,
    borderRadius: 5,
    color: disabled ? 'var(--faint)' : active ? 'var(--cyan)' : 'var(--muted)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 120ms',
  }
}
function Divider() {
  return <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />
}

// ─────────────────────────────────────────────────────────────────────────────
export default function PdfViewer({ slug, onLoadSuccess, onPageChange, onToggleText, textMode = false, extractingText = false }: Props) {
  const wrapRef  = useRef<HTMLDivElement>(null)
  const pagesRef = useRef<HTMLDivElement>(null)
  const msgRef   = useRef<HTMLDivElement>(null)

  const [numPages,     setNumPages]     = useState(0)
  const [currentPage,  setCurrentPage]  = useState(1)
  const [zoom,         setZoom]         = useState(() =>
    parseFloat(localStorage.getItem(`pdf_zoom_${slug}`) || '1.0')
  )
  const [viewMode,     setViewMode]     = useState<ViewMode>('single')
  const [darkMode,     setDarkMode]     = useState(false)

  // Tracks whether prefs were already loaded from backend (prevents saving on initial load)
  const prefsLoadedRef = useRef(false)
  // Stores the last_page received on load so we can restore scroll after render
  const lastPageRef = useRef(1)

  // Ref so the render effect can read latest darkMode without being in its deps
  const darkModeRef = useRef(darkMode)
  useEffect(() => { darkModeRef.current = darkMode }, [darkMode])

  // ── Load prefs from backend on slug change ────────────────────────────────
  useEffect(() => {
    prefsLoadedRef.current = false
    api.get(`/books/${slug}/prefs`)
      .then(r => {
        setDarkMode(r.data.dark_mode ?? false)
        setViewMode(r.data.view_mode ?? 'single')
        lastPageRef.current = r.data.last_page ?? 1
        prefsLoadedRef.current = true
      })
      .catch(() => { prefsLoadedRef.current = true })
  }, [slug])

  // ── Save dark_mode / view_mode immediately ───────────────────────────────
  useEffect(() => {
    if (!prefsLoadedRef.current) return
    api.patch(`/books/${slug}/prefs`, { dark_mode: darkMode, view_mode: viewMode, last_page: currentPage })
      .catch(() => {})
  }, [darkMode, viewMode, slug]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save last_page with debounce (avoids request on every scroll event) ──
  useEffect(() => {
    if (!prefsLoadedRef.current) return
    const t = setTimeout(() => {
      api.patch(`/books/${slug}/prefs`, { dark_mode: darkMode, view_mode: viewMode, last_page: currentPage })
        .catch(() => {})
    }, 1500)
    return () => clearTimeout(t)
  }, [currentPage, slug]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save zoom to localStorage (device-local) ──────────────────────────────
  useEffect(() => {
    localStorage.setItem(`pdf_zoom_${slug}`, String(zoom))
  }, [zoom, slug])

  // ── Dark mode: CSS-only toggle, no re-render ──────────────────────────────
  useEffect(() => {
    const pages = pagesRef.current
    if (!pages) return
    const f = darkMode ? DARK_FILTER : 'none'
    pages.querySelectorAll('canvas').forEach(cv => {
      (cv as HTMLCanvasElement).style.filter = f
    })
  }, [darkMode])

  // ── Main render effect ────────────────────────────────────────────────────
  useEffect(() => {
    const wrap  = wrapRef.current
    const pages = pagesRef.current
    const msg   = msgRef.current
    if (!wrap || !pages || !msg) return

    let cancelled = false
    let io: IntersectionObserver | null = null

    pages.innerHTML = ''
    msg.style.display = 'flex'
    msg.textContent   = 'carregando PDF...'

    api.get(`/books/${slug}/pdf`, { responseType: 'arraybuffer' })
      .then(r => pdfjsLib.getDocument({ data: new Uint8Array(r.data) }).promise)
      .then(async doc => {
        if (cancelled) return
        const total = doc.numPages
        setNumPages(total)
        setCurrentPage(1)
        onLoadSuccess(total)
        msg.style.display = 'none'

        const maxW   = Math.min(Math.max(300, wrap.clientWidth - 48), BASE_MAX_W)
        const pageW  = viewMode === 'double' ? Math.floor((maxW - 12) / 2) : maxW
        const dpr    = window.devicePixelRatio || 1
        const filter = darkModeRef.current ? DARK_FILTER : 'none'

        // STEP 1 — pre-build all DOM nodes in order
        const canvases: HTMLCanvasElement[] = []

        if (viewMode === 'single') {
          for (let i = 1; i <= total; i++) {
            const row = document.createElement('div')
            row.style.cssText = 'display:flex;justify-content:center;margin-bottom:6px;'
            const wrap2 = makeWrapper(i)
            const cv    = makeCanvas(filter)
            wrap2.appendChild(cv)
            row.appendChild(wrap2)
            pages.appendChild(row)
            canvases.push(cv)
          }
        } else {
          for (let i = 1; i <= total; i += 2) {
            const row = document.createElement('div')
            row.style.cssText = 'display:flex;justify-content:center;gap:12px;margin-bottom:6px;align-items:flex-start;'
            for (let j = i; j <= Math.min(i + 1, total); j++) {
              const wrap2 = makeWrapper(j)
              const cv    = makeCanvas(filter)
              wrap2.appendChild(cv)
              row.appendChild(wrap2)
              canvases.push(cv)
            }
            pages.appendChild(row)
          }
        }

        // STEP 2 — fetch all page objects in parallel (metadata only, no rasterisation)
        const pageObjects = await Promise.all(
          Array.from({ length: total }, (_, i) => doc.getPage(i + 1))
        )
        if (cancelled) return

        // STEP 3 — pre-size every canvas so scroll positions are accurate
        pageObjects.forEach((page, i) => {
          const scale = pageW / page.getViewport({ scale: 1 }).width
          const vp    = page.getViewport({ scale })
          const cv    = canvases[i]
          cv.width         = Math.floor(vp.width  * dpr)
          cv.height        = Math.floor(vp.height * dpr)
          cv.style.width   = Math.floor(vp.width)  + 'px'
          cv.style.height  = Math.floor(vp.height) + 'px'
        })

        // STEP 4 — scroll to saved page immediately (sizes are already set)
        const savedPage = lastPageRef.current
        if (savedPage > 1) {
          const el = pages.querySelector(`[data-page="${savedPage}"]`)
          if (el) {
            el.scrollIntoView({ behavior: 'instant', block: 'start' })
            setCurrentPage(savedPage)
            onPageChange(savedPage)
          }
        }

        // STEP 5 — render pages: saved-page area first, then outward
        const renderOrder: number[] = []
        const seen = new Set<number>()
        for (let delta = 0; delta < total; delta++) {
          const fwd = savedPage + delta
          const bwd = savedPage - delta
          if (fwd <= total && !seen.has(fwd)) { renderOrder.push(fwd); seen.add(fwd) }
          if (delta > 0 && bwd >= 1 && !seen.has(bwd)) { renderOrder.push(bwd); seen.add(bwd) }
          if (seen.size === total) break
        }

        for (const pageNum of renderOrder) {
          if (cancelled) return
          const i    = pageNum - 1
          const page = pageObjects[i]
          const scale = pageW / page.getViewport({ scale: 1 }).width
          const vp    = page.getViewport({ scale })
          const cv    = canvases[i]

          cv.width         = Math.floor(vp.width  * dpr)
          cv.height        = Math.floor(vp.height * dpr)
          cv.style.width   = Math.floor(vp.width)  + 'px'
          cv.style.height  = Math.floor(vp.height) + 'px'

          const ctx       = cv.getContext('2d')!
          const transform = dpr !== 1
            ? [dpr, 0, 0, dpr, 0, 0] as [number,number,number,number,number,number]
            : null

          await page.render({ canvasContext: ctx, transform: transform ?? undefined, viewport: vp }).promise
        }
        if (cancelled) return

        // STEP 6 — scroll spy (only after all pages rendered)
        io = new IntersectionObserver(entries => {
          let best: IntersectionObserverEntry | null = null
          for (const e of entries)
            if (e.isIntersecting && (!best || e.intersectionRatio > best.intersectionRatio))
              best = e
          if (best) {
            const pg = Number((best.target as HTMLElement).dataset.page) || 1
            setCurrentPage(pg)
            onPageChange(pg)
          }
        }, { root: wrap, threshold: [0.1, 0.3, 0.5, 0.7] })
        pages.querySelectorAll('[data-page]').forEach(el => io!.observe(el))
      })
      .catch(e => {
        if (cancelled) return
        msg.style.display = 'flex'
        msg.textContent   = `Erro ao carregar PDF: ${e?.message ?? e}`
        console.error('[PdfViewer]', e)
      })

    return () => {
      cancelled = true
      io?.disconnect()
    }
  }, [slug, viewMode, onLoadSuccess, onPageChange])

  // ── Actions ───────────────────────────────────────────────────────────────
  const scrollToPage = (n: number) => {
    if (n < 1 || n > numPages) return
    const el = pagesRef.current?.querySelector(`[data-page="${n}"]`)
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); setCurrentPage(n) }
  }

  const zoomIdx = ZOOM_STEPS.indexOf(zoom)
  const zoomIn  = () => { const i = zoomIdx; if (i < ZOOM_STEPS.length - 1) setZoom(ZOOM_STEPS[i + 1]) }
  const zoomOut = () => { const i = zoomIdx; if (i > 0) setZoom(ZOOM_STEPS[i - 1]) }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

      {/* ── Toolbar ── */}
      <div style={{
        height: 40, flexShrink: 0, padding: '0 10px',
        display: 'flex', alignItems: 'center', gap: 2,
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border)',
      }}>

        {/* Page navigation */}
        <button
          style={btnStyle(false, currentPage <= 1)}
          disabled={currentPage <= 1}
          onClick={() => scrollToPage(currentPage - 1)}
          title="Página anterior (←)"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>

        <span style={{ fontSize: 11, fontFamily: 'var(--f-mono)', color: 'var(--text)', padding: '0 6px', minWidth: 76, textAlign: 'center', whiteSpace: 'nowrap' }}>
          {numPages > 0 ? `${currentPage} / ${numPages}` : '—'}
        </span>

        <button
          style={btnStyle(false, currentPage >= numPages)}
          disabled={currentPage >= numPages}
          onClick={() => scrollToPage(currentPage + 1)}
          title="Próxima página (→)"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        <Divider />

        {/* Zoom */}
        <button
          style={btnStyle(false, zoomIdx <= 0)}
          disabled={zoomIdx <= 0}
          onClick={zoomOut}
          title="Reduzir zoom"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
        </button>

        <span style={{ fontSize: 11, fontFamily: 'var(--f-mono)', color: 'var(--text)', padding: '0 4px', minWidth: 40, textAlign: 'center' }}>
          {Math.round(zoom * 100)}%
        </span>

        <button
          style={btnStyle(false, zoomIdx >= ZOOM_STEPS.length - 1)}
          disabled={zoomIdx >= ZOOM_STEPS.length - 1}
          onClick={zoomIn}
          title="Aumentar zoom"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
        </button>

        <Divider />

        {/* View mode */}
        <button
          style={btnStyle(viewMode === 'single')}
          onClick={() => setViewMode('single')}
          title="Página única"
        >
          <svg width="12" height="13" viewBox="0 0 16 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="1" y="1" width="14" height="18" rx="1.5"/></svg>
        </button>

        <button
          style={btnStyle(viewMode === 'double')}
          onClick={() => setViewMode('double')}
          title="Duas páginas"
        >
          <svg width="16" height="13" viewBox="0 0 24 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="1" y="1" width="10" height="18" rx="1.5"/><rect x="13" y="1" width="10" height="18" rx="1.5"/></svg>
        </button>

        <Divider />

        {/* Dark mode */}
        <button
          style={btnStyle(darkMode)}
          onClick={() => setDarkMode(d => !d)}
          title="Modo escuro do PDF"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </button>

        {onToggleText && (
          <>
            <Divider />
            <button
              style={btnStyle(textMode, extractingText)}
              onClick={onToggleText}
              disabled={extractingText}
              title={textMode ? 'Voltar ao PDF' : 'Ver em texto'}
            >
              {extractingText
                ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
              }
            </button>
          </>
        )}

      </div>

      {/* ── Content ── */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div
          ref={msgRef}
          style={{
            position: 'absolute', inset: 0, zIndex: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, color: 'var(--muted)', pointerEvents: 'none',
            background: 'var(--bg)',
          }}
        />
        <div ref={wrapRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 0 40px' }}>
          <div ref={pagesRef} style={{ zoom: zoom }} />
        </div>
      </div>

    </div>
  )
}

function makeCanvas(filter: string): HTMLCanvasElement {
  const cv = document.createElement('canvas')
  cv.style.cssText = 'display:block;border-radius:2px;max-width:100%;'
  cv.style.filter  = filter
  return cv
}

function makeWrapper(page: number): HTMLDivElement {
  const el = document.createElement('div')
  el.dataset.page = String(page)
  el.style.cssText =
    'display:inline-flex;box-shadow:0 8px 40px rgba(0,0,0,.7);border-radius:2px;flex-shrink:0;'
  return el
}
