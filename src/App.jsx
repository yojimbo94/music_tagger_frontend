import { AppProvider } from './context/AppContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './components/Login'
import MainLayout from './components/MainLayout'
import ToastNotifications from './components/ToastNotifications'

function AppShell() {
  const { isAuthenticated } = useAuth()

  return (
    <AppProvider>
      {isAuthenticated ? <MainLayout /> : <Login />}
      <ToastNotifications />
    </AppProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}

export default App
