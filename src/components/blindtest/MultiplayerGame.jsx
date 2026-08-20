import { useEffect, useState } from 'react'
import { useHiddenPlayer } from '../../hooks/useHiddenPlayer'
import { resolvePlaybackId } from '../../utils/media'
import ChoiceCard from './ChoiceCard'
import SearchAnswer from './SearchAnswer'

function gridCols(count) {
  if (count <= 4) return 'grid-cols-1 sm:grid-cols-2'
  return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
}

/**
 * Écran de jeu multijoueur : contrairement à BlindTestGame (solo), l'avance
 * d'une question à l'autre est décidée à 100% par le serveur (cf.
 * src/domain/multiplayer.py — tous ont répondu, ou timeout) — ce composant ne
 * fait qu'afficher l'état reçu et remonter les réponses, pas de timer/index
 * local qui déciderait quoi que ce soit.
 *
 * Monté avec `key={question.id}` par MultiplayerSession (même principe que
 * QuestionRunner en solo, cf. BlindTestGame.jsx) : chaque nouvelle question
 * repart d'un état local frais sans avoir besoin d'un effect pour le
 * réinitialiser explicitement.
 */
function MultiplayerGame({ question, mode, searchPool, myPid, progress, revealData, onAnswer }) {
  const [selectedId, setSelectedId] = useState(null)
  const [timeLeft, setTimeLeft] = useState(() => (
    question.deadline ? Math.max(0, question.deadline - Date.now() / 1000) : null
  ))
  const player = useHiddenPlayer(70)
  const answered = selectedId != null
  const revealed = !!revealData

  // Charge/joue la track une fois par montage (= par question, cf. `key` ci-dessus).
  useEffect(() => {
    const playback = resolvePlaybackId(question.playback.source, question.playback.source_track_id)
    if (playback) player.load(playback)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!question.deadline) return
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, question.deadline - Date.now() / 1000))
    }, 250)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (revealed) player.fadeOutAndStop(900)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed])

  const handleAnswer = (choiceId) => {
    if (answered || revealed) return
    setSelectedId(choiceId)
    onAnswer(choiceId)
  }

  const choiceState = (choiceId) => {
    if (!revealed) return 'idle'
    if (choiceId === revealData.correct_choice_id) return 'correct'
    if (choiceId === selectedId) return 'wrong'
    return 'muted'
  }

  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <div className="text-5xl mb-2 select-none">{revealed ? '🎵' : '🔊'}</div>
        <p className="text-gray-500 text-sm">
          {mode === 'year' ? 'De quelle année est ce titre ?' : 'Quel est ce titre ?'}
        </p>
        {!revealed && timeLeft != null && (
          <p className={`text-sm mt-1 font-medium ${timeLeft <= 3 ? 'text-red-500' : 'text-gray-400'}`}>{Math.ceil(timeLeft)}s</p>
        )}
        {!revealed && (
          <p className="text-xs text-gray-400 mt-2">
            {progress?.answered ?? 0} / {progress?.total_connected ?? '?'} ont répondu
          </p>
        )}
        {revealed && (
          <div className="mt-3 text-sm text-gray-700 animate-fadeIn">
            <span className="font-medium">{revealData.reveal.title}</span>
            {revealData.reveal.artist && <span> — {revealData.reveal.artist}</span>}
            {revealData.reveal.year ? <span className="text-gray-400"> ({revealData.reveal.year})</span> : null}
            {revealData.reveal.url && (
              <a
                href={revealData.reveal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                ▶ Écouter
              </a>
            )}
          </div>
        )}
      </div>

      {mode === 'search' ? (
        <SearchAnswer pool={searchPool} disabled={answered || revealed} onSelect={handleAnswer} />
      ) : (
        <div className={`grid ${gridCols(question.choices.length)} gap-3`}>
          {question.choices.map((choice) => (
            <ChoiceCard
              key={choice.id}
              choice={choice}
              state={choiceState(choice.id)}
              disabled={answered || revealed}
              onClick={() => handleAnswer(choice.id)}
            />
          ))}
        </div>
      )}

      {revealed && revealData.scoreboard && (
        <div className="max-w-sm mx-auto space-y-1">
          <div className="text-xs font-medium text-gray-500 text-center mb-1">Classement</div>
          {revealData.scoreboard.map((p, i) => (
            <div
              key={p.pid}
              className={`flex items-center justify-between text-sm px-3 py-1.5 rounded-md ${
                p.pid === myPid ? 'bg-blue-50 font-medium text-blue-800' : 'bg-gray-50 text-gray-700'
              }`}
            >
              <span>{i + 1}. {p.nickname}{!p.connected ? ' (déco)' : ''}</span>
              <span>{p.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MultiplayerGame
