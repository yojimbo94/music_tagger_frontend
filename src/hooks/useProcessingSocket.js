import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { API_BASE } from '../api/client'

/**
 * Connexion Socket.IO au serveur de processing. Remplace le polling HTTP par un
 * vrai push temps réel des évènements 'processing:started/progress/done'.
 */
export function useProcessingSocket({ onStarted, onProgress, onDone, onError } = {}) {
  const handlersRef = useRef({ onStarted, onProgress, onDone, onError })

  useEffect(() => {
    handlersRef.current = { onStarted, onProgress, onDone, onError }
  })

  useEffect(() => {
    // Le serveur tourne en async_mode="threading" (pas d'eventlet/gevent installé),
    // qui ne sait pas faire l'upgrade WebSocket avec le serveur de dev Werkzeug
    // (provoque un crash "write() before start_response"). On reste en long-polling,
    // ce qui suffit largement pour de la progression de processing.
    const socket = io(API_BASE, { transports: ['polling'] })

    socket.on('processing:started', (payload) => handlersRef.current.onStarted?.(payload))
    socket.on('processing:progress', (payload) => handlersRef.current.onProgress?.(payload))
    socket.on('processing:done', (payload) => handlersRef.current.onDone?.(payload))
    socket.on('processing:error', (payload) => handlersRef.current.onError?.(payload))

    return () => {
      socket.disconnect()
    }
  }, [])
}
