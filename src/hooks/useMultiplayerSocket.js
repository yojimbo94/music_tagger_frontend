import { useCallback, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { API_BASE } from '../api/client'

// Namespace dédié, séparé du socket de processing (authentifié par JWT) :
// rejoindre une session de blind test ne demande aucun compte, juste le code
// partagé par l'hôte — cf. src/server/multiplayer_events.py côté serveur.
const NAMESPACE = '/blindtest-mp'

/**
 * Connexion Socket.IO au namespace multijoueur du blind test. Expose les
 * actions (join/start/answer/leave) en `emit` + callback ack (retourne une
 * Promise), et les événements poussés par le serveur via les callbacks
 * fournies (mêmes conventions que useProcessingSocket.js).
 */
export function useMultiplayerSocket({ onLobby, onQuestion, onProgress, onReveal, onFinished } = {}) {
  const socketRef = useRef(null)
  const handlersRef = useRef({ onLobby, onQuestion, onProgress, onReveal, onFinished })

  useEffect(() => {
    handlersRef.current = { onLobby, onQuestion, onProgress, onReveal, onFinished }
  })

  useEffect(() => {
    const socket = io(`${API_BASE}${NAMESPACE}`, { transports: ['polling'] })
    socketRef.current = socket

    socket.on('mp:lobby', (payload) => handlersRef.current.onLobby?.(payload))
    socket.on('mp:question', (payload) => handlersRef.current.onQuestion?.(payload))
    socket.on('mp:progress', (payload) => handlersRef.current.onProgress?.(payload))
    socket.on('mp:reveal', (payload) => handlersRef.current.onReveal?.(payload))
    socket.on('mp:finished', (payload) => handlersRef.current.onFinished?.(payload))

    return () => {
      socket.disconnect()
    }
  }, [])

  // Chaque action renvoie une Promise résolue avec l'ack du serveur, rejetée
  // si l'ack contient `{ error }` — évite de dupliquer ce contrôle à chaque
  // appelant.
  const call = useCallback((event, data) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) {
        reject(new Error('Non connecté.'))
        return
      }
      socketRef.current.emit(event, data, (response) => {
        if (response?.error) reject(new Error(response.error))
        else resolve(response)
      })
    })
  }, [])

  const join = useCallback((code, nickname, pid) => call('mp:join', { code, nickname, pid }), [call])
  const start = useCallback((code, hostToken) => call('mp:start', { code, host_token: hostToken }), [call])
  const answer = useCallback((code, pid, choiceId) => call('mp:answer', { code, pid, choice_id: choiceId }), [call])
  const leave = useCallback((code, pid) => {
    socketRef.current?.emit('mp:leave', { code, pid })
  }, [])

  return { join, start, answer, leave }
}
