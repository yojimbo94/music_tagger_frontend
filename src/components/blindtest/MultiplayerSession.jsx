import { useCallback, useEffect, useRef, useState } from 'react'
import { useMultiplayerSocket } from '../../hooks/useMultiplayerSocket'
import MultiplayerGame from './MultiplayerGame'
import MultiplayerLeaderboard from './MultiplayerLeaderboard'

const PID_KEY_PREFIX = 'bt_mp_pid_'

function storedPid(code) {
  return localStorage.getItem(PID_KEY_PREFIX + code)
}
function storePid(code, pid) {
  localStorage.setItem(PID_KEY_PREFIX + code, pid)
}

/**
 * Orchestrateur de session multijoueur — même composant pour l'hôte (créé
 * depuis BlindTestView, avec `hostToken`) et pour un invité arrivé via un
 * lien `?join=CODE` (aucun compte requis, cf. src/server/multiplayer_events.py
 * et App.jsx qui monte ce composant hors de tout écran authentifié dans ce
 * cas) : la seule différence entre les deux est la présence de `hostToken`,
 * qui fait apparaître le bouton "Démarrer" dans la salle d'attente.
 */
function MultiplayerSession({ initialCode = '', hostToken = null, onExit }) {
  const [phase, setPhase] = useState('join') // 'join' | 'lobby' | 'game' | 'finished'
  const [code, setCode] = useState(initialCode)
  const [nickname, setNickname] = useState(hostToken ? 'Hôte' : '')
  const [pid, setPid] = useState(null)
  const [participants, setParticipants] = useState([])
  const [mode, setMode] = useState('track')
  const [searchPool, setSearchPool] = useState([])
  const [question, setQuestion] = useState(null)
  const [progress, setProgress] = useState(null)
  const [revealData, setRevealData] = useState(null)
  const [finalScoreboard, setFinalScoreboard] = useState(null)
  // Récapitulatif des titres de la manche en cours (comme l'écran de résultat
  // solo, cf. BlindTestView.jsx) — un élément par question, accumulé au fil
  // des `mp:reveal`, vidé à chaque "Rejouer" (mp:restarted).
  const [history, setHistory] = useState([])
  const [error, setError] = useState(null)
  const [joining, setJoining] = useState(false)
  const [replaying, setReplaying] = useState(false)

  const codeRef = useRef(code)
  const pidRef = useRef(pid)
  useEffect(() => { codeRef.current = code }, [code])
  useEffect(() => { pidRef.current = pid }, [pid])

  const { join, start, answer, restart, leave } = useMultiplayerSocket({
    onLobby: (data) => setParticipants(data.participants || []),
    onQuestion: (q) => {
      setQuestion(q)
      setRevealData(null)
      setProgress(null)
      setPhase('game')
    },
    onProgress: (p) => setProgress(p),
    onReveal: (data) => {
      setRevealData(data)
      setHistory((h) => [...h, {
        reveal: data.reveal,
        isCorrect: data.per_participant.find((p) => p.pid === pidRef.current)?.correct ?? false,
      }])
    },
    onFinished: (data) => {
      setFinalScoreboard(data.scoreboard || [])
      setPhase('finished')
    },
    onRestarted: (data) => {
      setParticipants(data.participants || [])
      setHistory([])
      setFinalScoreboard(null)
      setQuestion(null)
      setRevealData(null)
      setProgress(null)
      setPhase('lobby')
    },
  })

  const doJoin = useCallback(async () => {
    const trimmedCode = code.trim().toUpperCase()
    if (!trimmedCode || !nickname.trim()) return
    setJoining(true)
    setError(null)
    try {
      const existingPid = storedPid(trimmedCode)
      const data = await join(trimmedCode, nickname, existingPid)
      setCode(trimmedCode)
      setPid(data.pid)
      storePid(trimmedCode, data.pid)
      setParticipants(data.participants || [])
      setMode(data.mode)
      setSearchPool(data.search_pool || [])
      if (data.state === 'finished') {
        setPhase('finished')
      } else if (data.question) {
        setQuestion(data.question)
        setPhase('game')
      } else {
        setPhase('lobby')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setJoining(false)
    }
  }, [code, nickname, join])

  const handleStart = useCallback(async () => {
    try {
      await start(code, hostToken)
    } catch (err) {
      setError(err.message)
    }
  }, [start, code, hostToken])

  const handleAnswer = useCallback((choiceId) => {
    answer(codeRef.current, pidRef.current, choiceId).catch(() => {})
  }, [answer])

  const handleReplay = useCallback(async () => {
    setReplaying(true)
    setError(null)
    try {
      await restart(code, hostToken)
      // La transition vers 'lobby' est pilotée par mp:restarted (diffusé à
      // toute la room, y compris l'hôte) plutôt que faite ici directement :
      // ça garde un seul chemin de mise à jour pour tout le monde.
    } catch (err) {
      setError(err.message)
    } finally {
      setReplaying(false)
    }
  }, [restart, code, hostToken])

  const handleExit = useCallback(() => {
    if (codeRef.current && pidRef.current) leave(codeRef.current, pidRef.current)
    onExit?.()
  }, [leave, onExit])

  // Prévient le serveur si on quitte la page en cours de partie (bouton
  // "Quitter" appelle déjà leave() explicitement — ce cleanup ne fait rien de
  // plus dans ce cas, set_connected(False) est idempotent côté serveur).
  useEffect(() => {
    return () => {
      if (codeRef.current && pidRef.current) leave(codeRef.current, pidRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (phase === 'join') {
    return (
      <div className="mx-auto max-w-sm space-y-4 py-10">
        <div className="text-center">
          <div className="text-4xl mb-2">🎉</div>
          <h2 className="text-xl font-semibold text-gray-900">Rejoindre une session</h2>
        </div>
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        <div className="space-y-3">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Code de session"
            maxLength={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-center text-lg tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doJoin()}
            placeholder="Ton pseudo"
            maxLength={24}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={doJoin}
            disabled={joining || !code.trim() || !nickname.trim()}
            className="w-full py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {joining ? 'Connexion...' : 'Rejoindre'}
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'lobby') {
    const shareUrl = `${window.location.origin}${window.location.pathname}?join=${code}`
    return (
      <div className="mx-auto max-w-md space-y-6 py-10">
        <div className="text-center space-y-2">
          <div className="text-4xl">⏳</div>
          <h2 className="text-xl font-semibold text-gray-900">Salle d'attente</h2>
          <p className="text-sm text-gray-500">
            Code : <span className="font-mono font-semibold text-gray-800">{code}</span>
          </p>
          {hostToken && (
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(shareUrl)}
              className="text-xs text-blue-600 hover:text-blue-700 underline"
            >
              Copier le lien à partager
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="space-y-1.5">
          {participants.map((p) => (
            <div
              key={p.pid}
              className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${
                p.connected ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 text-gray-400'
              }`}
            >
              <span>{p.nickname}{p.pid === pid ? ' (toi)' : ''}</span>
              {!p.connected && <span className="text-xs">déconnecté</span>}
            </div>
          ))}
        </div>

        {hostToken ? (
          <button
            onClick={handleStart}
            className="w-full py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Démarrer la partie
          </button>
        ) : (
          <p className="text-center text-sm text-gray-400">En attente que l'hôte démarre la partie...</p>
        )}
      </div>
    )
  }

  if (phase === 'game') {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Question <span className="font-semibold text-gray-900">{(question?.index ?? 0) + 1}</span> / {question?.total ?? '?'}</span>
          <button onClick={handleExit} className="text-gray-500 hover:text-gray-700 underline">Quitter</button>
        </div>
        {question ? (
          <MultiplayerGame
            key={question.id}
            question={question}
            mode={mode}
            searchPool={searchPool}
            myPid={pid}
            progress={progress}
            revealData={revealData}
            onAnswer={handleAnswer}
          />
        ) : (
          <div className="text-center text-gray-500 py-10">En attente de la prochaine question…</div>
        )}
      </div>
    )
  }

  if (phase === 'finished') {
    return (
      <MultiplayerLeaderboard
        scoreboard={finalScoreboard || participants}
        history={history}
        myPid={pid}
        onExit={handleExit}
        onReplay={hostToken ? handleReplay : null}
        replaying={replaying}
        error={error}
      />
    )
  }

  return null
}

export default MultiplayerSession
