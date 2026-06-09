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

  const save = (u: User) => { setUser(u); localStorage.setItem('user', JSON.stringify(u)) }

  const loginDev = async () => {
    const { data } = await api.post('/auth/dev')
    save(data)
  }

  const loginGoogle = async (credential: string) => {
    const { data } = await api.post('/auth/google', { credential })
    save(data)
  }

  const logout = () => { setUser(null); localStorage.removeItem('user') }

  return <AuthContext.Provider value={{ user, loading, loginDev, loginGoogle, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => { const ctx = useContext(AuthContext); if (!ctx) throw new Error('useAuth outside provider'); return ctx }
