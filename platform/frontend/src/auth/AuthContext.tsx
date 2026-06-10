import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import api from '../api/client'

interface User { id: string; email: string; name: string; avatar_url: string | null; honor: number }
interface AuthCtx { user: User | null; loading: boolean; loginDev: () => Promise<void>; loginGoogle: (credential: string) => Promise<void>; logout: () => void }

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) setUser(JSON.parse(stored))
    setLoading(false)
  }, [])

  const save = (token: string, u: User) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(u))
    setUser(u)
  }

  const loginDev = async () => {
    const { data } = await api.post('/auth/dev')
    save(data.token, data.user)
  }

  const loginGoogle = async (credential: string) => {
    const { data } = await api.post('/auth/google', { credential })
    save(data.token, data.user)
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return <AuthContext.Provider value={{ user, loading, loginDev, loginGoogle, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => { const ctx = useContext(AuthContext); if (!ctx) throw new Error('useAuth outside provider'); return ctx }
