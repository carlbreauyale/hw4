import { useEffect, useState, type ReactNode } from 'react'
import * as api from './api'
import { AuthContext, type AuthState } from './useAuth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<api.User | null>(null)
  const [loading, setLoading] = useState(true)

  // Restore the session from the cookie on page load.
  useEffect(() => {
    api
      .getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const value: AuthState = {
    user,
    loading,
    async login(email, password) {
      const u = await api.login(email, password)
      setUser(u)
      return u
    },
    async signup(input) {
      const u = await api.signup(input)
      setUser(u)
      return u
    },
    async logout() {
      await api.logout()
      setUser(null)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
