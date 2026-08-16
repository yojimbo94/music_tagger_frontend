import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  login as apiLogin,
  logout as apiLogout,
  isAuthenticated as hasStoredSession,
  getRole as getStoredRole,
  setOnAuthExpired
} from '../api/client'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  // Présence d'un refresh token = session "présumée" valide. Si elle ne l'est
  // plus vraiment, le premier appel API échoue, se fait rejeter par /auth/refresh,
  // et onAuthExpired nous ramène sur l'écran de login (cf. api/client.js).
  const [isAuthenticated, setIsAuthenticated] = useState(hasStoredSession())
  // "admin" ou "visitor", fixé par le serveur au login (cf. routes/auth.py) — le
  // visiteur voit la même interface mais toute action d'écriture est désactivée
  // côté front et rejetée (403) côté serveur.
  const [role, setRole] = useState(getStoredRole())

  useEffect(() => {
    setOnAuthExpired(() => {
      setIsAuthenticated(false)
      setRole(null)
    })
  }, [])

  const login = useCallback(async (username, password) => {
    const data = await apiLogin(username, password)
    setIsAuthenticated(true)
    setRole(data.role)
  }, [])

  const logout = useCallback(() => {
    apiLogout()
    setIsAuthenticated(false)
    setRole(null)
  }, [])

  const isAdmin = role === 'admin'

  return (
    <AuthContext.Provider value={{ isAuthenticated, role, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
