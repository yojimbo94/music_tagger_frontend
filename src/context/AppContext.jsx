import { createContext, useContext, useState, useCallback } from 'react'

const AppContext = createContext()

const MAX_LOG_ENTRIES = 25

export function AppProvider({ children }) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingService, setProcessingService] = useState(null)
  const [processingStats, setProcessingStats] = useState({
    total: 0,
    processed: 0,
    matched: 0,
    failed: 0
  })
  const [processingLog, setProcessingLog] = useState([])
  const [notifications, setNotifications] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  // Ajouter une notification (toast)
  const addNotification = useCallback((type, message, duration = 5000) => {
    const id = `${Date.now()}-${Math.random()}`
    setNotifications(prev => [...prev, { id, type, message }])

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, duration)
  }, [])

  // Démarrer le processing (déclenché par l'appel API ; l'évènement socket
  // 'processing:started' confirmera et alimentera les stats réelles)
  const startProcessing = useCallback((service) => {
    setIsProcessing(true)
    setProcessingService(service)
    setProcessingStats({ total: 0, processed: 0, matched: 0, failed: 0 })
    setProcessingLog([])
  }, [])

  const stopProcessing = useCallback(() => {
    setIsProcessing(false)
    setProcessingService(null)
  }, [])

  // Alimenté par useProcessingSocket
  const handleProcessingStarted = useCallback((payload) => {
    setIsProcessing(true)
    setProcessingService(payload.service)
    setProcessingStats(prev => ({ ...prev, total: payload.total ?? prev.total }))
  }, [])

  const handleProcessingProgress = useCallback((payload) => {
    const { last_track, service, ...stats } = payload
    setIsProcessing(true)
    setProcessingService(service)
    setProcessingStats(stats)
    if (last_track) {
      setProcessingLog(prev => [{ ...last_track, at: Date.now() }, ...prev].slice(0, MAX_LOG_ENTRIES))
    }
  }, [])

  const handleProcessingDone = useCallback(({ total, processed, matched, failed }) => {
    setProcessingStats({ total, processed, matched, failed })
    setIsProcessing(false)
  }, [])

  const processingProgress = processingStats.total > 0
    ? (processingStats.processed / processingStats.total) * 100
    : 0

  return (
    <AppContext.Provider value={{
      isProcessing,
      processingProgress,
      processingService,
      processingStats,
      processingLog,
      startProcessing,
      stopProcessing,
      handleProcessingStarted,
      handleProcessingProgress,
      handleProcessingDone,
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
