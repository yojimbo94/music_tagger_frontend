import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  login as apiLogin,
  logout as apiLogout,
  isAuthenticated as hasStoredSession,
  setOnAuthExpired
} from '../api/client'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  // Présence d'un refresh token = session "présumée" valide. Si elle ne l'est
  // plus vraiment, le premier appel API échoue, se fait rejeter par /auth/refresh,
  // et onAuthExpired nous ramène sur l'écran de login (cf. api/client.js).
  const [isAuthenticated, setIsAuthenticated] = useState(hasStoredSession())

  useEffect(() => {
    setOnAuthExpired(() => setIsAuthenticated(false))
  }, [])

  const login = useCallback(async (username, password) => {
    await apiLogin(username, password)
    setIsAuthenticated(true)
  }, [])

  const logout = useCallback(() => {
    apiLogout()
    setIsAuthenticated(false)
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
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
