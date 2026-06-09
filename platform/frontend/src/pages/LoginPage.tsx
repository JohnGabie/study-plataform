import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../auth/AuthContext'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export default function LoginPage() {
  const { user, loginDev, loginGoogle } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (user) navigate('/') }, [user, navigate])

  const handleDev = async () => {
    setLoading(true); setError('')
    try { await loginDev(); navigate('/') }
    catch { setError('Erro no login de desenvolvimento.') }
    finally { setLoading(false) }
  }

  const handleGoogle = async (credential: string) => {
    setError('')
    try { await loginGoogle(credential); navigate('/') }
    catch { setError('Erro ao autenticar com Google.') }
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', position: 'relative', overflow: 'hidden',
    }}>
      {/* Grid background */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.4 }}>
        <defs>
          <pattern id="g" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="var(--border)" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)" />
      </svg>
      {/* Radial fade */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, var(--bg) 80%)',
      }} />
      {/* Glow center */}
      <div style={{
        position: 'absolute', width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%)',
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      }} />

      {/* Card */}
      <div className="fade-up" style={{ position: 'relative', zIndex: 1, width: 360, padding: '0 24px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, margin: '0 auto 16px',
            borderRadius: 14, background: 'var(--cyan-faint)',
            border: '1.5px solid rgba(34,211,238,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 28px var(--cyan-glow)',
          }}>
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
              <path d="M8 8L16 4L24 8V16L16 28L8 16V8Z" stroke="#22d3ee" strokeWidth="1.5" fill="rgba(34,211,238,0.15)" />
              <path d="M16 4V28M8 8L24 16M24 8L8 16" stroke="#22d3ee" strokeWidth="0.6" opacity="0.5" />
            </svg>
          </div>
          <h1 className="f-display" style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
            Study Platform
          </h1>
          <p className="f-mono" style={{ fontSize: 11, color: 'var(--cyan)', marginTop: 6 }}>
            // train · think · ship
          </p>
        </div>

        {/* Panel */}
        <div className="card" style={{ padding: 24 }}>
          <p className="f-display" style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 4 }}>
            Acesse sua conta
          </p>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
            Continue de onde parou.
          </p>

          {GOOGLE_CLIENT_ID ? (
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin
                  onSuccess={res => res.credential && handleGoogle(res.credential)}
                  onError={() => setError('Falha no login com Google.')}
                  theme="filled_black"
                  shape="rectangular"
                  text="signin_with"
                  width="312"
                />
              </div>
            </GoogleOAuthProvider>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                background: 'rgba(210,153,34,0.06)', border: '1px solid rgba(210,153,34,0.25)',
                borderRadius: 8,
              }}>
                <span style={{ color: 'var(--yellow)', fontSize: 13 }}>⚠</span>
                <span className="f-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
                  Google OAuth não configurado
                </span>
              </div>
              <button className="btn btn-cyan" onClick={handleDev} disabled={loading}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? (
                  <span className="f-mono" style={{ fontSize: 12 }}>entrando...</span>
                ) : (
                  <><span>→</span><span>Entrar em modo dev</span></>
                )}
              </button>
            </div>
          )}

          {error && (
            <p className="f-mono" style={{ fontSize: 11, color: 'var(--red)', textAlign: 'center', marginTop: 12 }}>
              {error}
            </p>
          )}
        </div>

        <p className="f-mono" style={{ fontSize: 10, color: 'var(--muted)', opacity: 0.5, textAlign: 'center', marginTop: 16 }}>
          plataforma privada · apenas usuários autorizados
        </p>
      </div>
    </div>
  )
}
