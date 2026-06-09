import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="h-screen flex items-center justify-center" style={{ color: '#44bcd3', fontFamily: 'JetBrains Mono' }}>loading...</div>
  return user ? <>{children}</> : <Navigate to="/login" replace />
}
