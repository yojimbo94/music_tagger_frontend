import { AppProvider } from './context/AppContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './components/Login'
import MainLayout from './components/MainLayout'
import ToastNotifications from './components/ToastNotifications'
import MultiplayerSession from './components/blindtest/MultiplayerSession'

function AppShell() {
  const { isAuthenticated } = useAuth()

  return (
    <AppProvider>
      {isAuthenticated ? <MainLayout /> : <Login />}
      <ToastNotifications />
    </AppProvider>
  )
}

// Un ami qui clique un lien de session blind test (?join=CODE) ne doit pas
// avoir besoin d'un compte (admin ou visiteur partagé, cf. AUTH.md) : cet
// écran est monté hors de tout AuthProvider/MainLayout, avant même de savoir
// si quelqu'un est connecté sur ce navigateur — cf. src/server/multiplayer_events.py
// côté serveur (namespace Socket.IO ouvert, sans JWT).
const joinCode = new URLSearchParams(window.location.search).get('join')

function App() {
  if (joinCode) {
    return (
      <AppProvider>
        <div className="min-h-screen bg-gray-50 px-4">
          <MultiplayerSession initialCode={joinCode} />
        </div>
        <ToastNotifications />
      </AppProvider>
    )
  }

  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}

export default App
