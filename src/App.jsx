import { useState } from 'react'
import { AppProvider } from './context/AppContext'
import Login from './components/Login'
import MainLayout from './components/MainLayout'
import ToastNotifications from './components/ToastNotifications'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(true)

  if (!isAuthenticated) {
    return (
      <AppProvider>
        <Login onLogin={() => setIsAuthenticated(true)} />
        <ToastNotifications />
      </AppProvider>
    )
  }

  return (
    <AppProvider>
      <MainLayout />
      <ToastNotifications />
    </AppProvider>
  )
}

export default App