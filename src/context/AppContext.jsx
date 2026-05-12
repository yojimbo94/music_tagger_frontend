import { createContext, useContext, useState, useCallback } from 'react'

const AppContext = createContext()

export function AppProvider({ children }) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [processingService, setProcessingService] = useState(null)
  const [processingStats, setProcessingStats] = useState({
    total: 0,
    processed: 0,
    matched: 0,
    failed: 0
  })
  const [notifications, setNotifications] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  // Ajouter une notification (toast)
  const addNotification = useCallback((type, message, duration = 5000) => {
    const id = Date.now()
    setNotifications(prev => [...prev, { id, type, message }])
    
    // Supprimer automatiquement après duration
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, duration)
  }, [])

  // Mettre à jour la progression du processing
  const updateProcessingProgress = useCallback((progress, stats = null) => {
    setProcessingProgress(progress)
    if (stats) {
      setProcessingStats(stats)
    }
  }, [])

  // Démarrer le processing
  const startProcessing = useCallback((service) => {
    setIsProcessing(true)
    setProcessingProgress(0)
    setProcessingService(service)
    setProcessingStats({ total: 0, processed: 0, matched: 0, failed: 0 })
  }, [])

  // Arrêter le processing
  const stopProcessing = useCallback(() => {
    setIsProcessing(false)
    setProcessingService(null)
  }, [])

  return (
    <AppContext.Provider value={{
      isProcessing,
      processingProgress,
      processingService,
      processingStats,
      startProcessing,
      stopProcessing,
      updateProcessingProgress,
      notifications,
      addNotification,
      isLoading,
      setIsLoading
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
