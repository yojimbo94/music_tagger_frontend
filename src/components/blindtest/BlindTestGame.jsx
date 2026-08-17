import { useCallback, useEffect, useRef, useState } from 'react'
import { useHiddenPlayer } from '../../hooks/useHiddenPlayer'
import { resolvePlaybackId } from '../../utils/media'
import ChoiceCard from './ChoiceCard'
import SearchAnswer from './SearchAnswer'
import { Volume2, VolumeX } from 'lucide-react'

const REVEAL_DELAY_MS = 2200
const FADE_MS = 900

function gridCols(count) {
  if (count <= 4) return 'grid-cols-1 sm:grid-cols-2'
  return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
}

/**
 * Une question = une nouvelle instance (montée via `key={question.id}` par le
 * parent) : chaque question repart d'un état local frais (pas besoin d'un effect
 * pour "réinitialiser" quoi que ce soit au changement de question).
 */
function QuestionRunner({ question, settings, player, searchPool, onAnswered }) {
  const [selectedId, setSelectedId] = useState(null)
  const [answered, setAnswered] = useState(false)
  const [timeLeft, setTimeLeft] = useState(settings.maxResponseSeconds || 0)

  const timerRef = useRef(null)
  const advanceTimeoutRef = useRef(null)
  const answeredRef = useRef(false)

  const handleAnswer = useCallback((choiceId) => {
    if (answeredRef.current) return
    answeredRef.current = true
    setAnswered(true)
    setSelectedId(choiceId)
    clearInterval(timerRef.current)

    const isCorrect = choiceId === question.correct_choice_id
    player.fadeOutAndStop(FADE_MS)

    advanceTimeoutRef.current = setTimeout(() => onAnswered(isCorrect), REVEAL_DELAY_MS)
  }, [question, player, onAnswered])

  // Passer le titre (ex: vidéo YouTube indisponible) : ne compte ni pour ni
  // contre le score, avance tout de suite (pas de délai de reveal).
  const handleSkip = useCallback(() => {
    if (answeredRef.current) return
    answeredRef.current = true
    clearInterval(timerRef.current)
    clearTimeout(advanceTimeoutRef.current)
    player.stop()
    onAnswered('skipped')
  }, [player, onAnswered])

  // Charge/joue la track et démarre le chrono : une fois par montage (= par question).
  useEffect(() => {
    const playback = resolvePlaybackId(question.playback.source, question.playback.source_track_id)
    if (playback) player.load(playback)

    if (settings.maxResponseSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current)
            return 0
          }
          return t - 1
        })
      }, 1000)
    }

    return () => {
      clearInterval(timerRef.current)
      clearTimeout(advanceTimeoutRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (settings.maxResponseSeconds > 0 && timeLeft === 0 && !answeredRef.current) {
      handleAnswer(null)
    }
  }, [timeLeft, settings.maxResponseSeconds, handleAnswer])

  const choiceState = (choiceId) => {
    if (!answered) return 'idle'
    if (choiceId === question.correct_choice_id) return 'correct'
    if (choiceId === selectedId) return 'wrong'
    return 'muted'
  }

  return (
    <>
      {/* Timer */}
      {settings.maxResponseSeconds > 0 && (
        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ease-linear ${timeLeft <= 3 ? 'bg-red-500' : 'bg-amber-400'}`}
            style={{
              width: `${(timeLeft / settings.maxResponseSeconds) * 100}%`,
              transitionProperty: 'width',
              transitionDuration: answered ? '0ms' : '1000ms'
            }}
          />
        </div>
      )}

      {/* Prompt */}
      <div className="text-center py-6">
        {settings.mode === 'search' && settings.blurredCoverHint && question.reveal.image ? (
          <img
            src={question.reveal.image}
            alt=""
            className={`mx-auto mb-3 h-28 w-28 rounded-lg object-cover bg-gray-100 transition-all duration-700 ${
              answered ? 'blur-none' : 'blur-sm'
            }`}
          />
        ) : (
          <div className="text-5xl mb-3 select-none">{answered ? '🎵' : '🔊'}</div>
        )}
        <p className="text-gray-500 text-sm">
          {settings.mode === 'year' ? 'De quelle année est ce titre ?' : 'Quel est ce titre ?'}
        </p>
        {answered && (
          <div className="mt-3 text-sm text-gray-700 animate-fadeIn">
            <span className={`font-medium ${settings.mode === 'search' ? (selectedId === question.correct_choice_id ? 'text-green-600' : 'text-red-600') : ''}`}>
              {settings.mode === 'search' && (selectedId === question.correct_choice_id ? '✓ ' : '✗ ')}
              {question.reveal.title}
            </span>
            {question.reveal.artist && <span> — {question.reveal.artist}</span>}
            {/* `year` vaut parfois 0 (Discogs renvoie 0, pas null, quand l'année
                est inconnue) : `year && <span>` afficherait alors "0" tel quel
                (React rend un nombre falsy littéralement) — ternaire obligatoire. */}
            {question.reveal.year ? <span className="text-gray-400"> ({question.reveal.year})</span> : null}
          </div>
        )}
        {!answered && (
          <button
            type="button"
            onClick={handleSkip}
            className="mt-3 text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Passer (bug de son)
          </button>
        )}
      </div>

      {/* Réponse */}
      {settings.mode === 'search' ? (
        <SearchAnswer pool={searchPool} disabled={answered} onSelect={handleAnswer} />
      ) : (
        <div className={`grid ${gridCols(question.choices.length)} gap-3`}>
          {question.choices.map((choice) => (
            <ChoiceCard
              key={choice.id}
              choice={choice}
              state={choiceState(choice.id)}
              disabled={answered}
              onClick={() => handleAnswer(choice.id)}
            />
          ))}
        </div>
      )}
    </>
  )
}

function BlindTestGame({ questions, settings, searchPool, onFinish, onAbort }) {
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [history, setHistory] = useState([])
  const [volume, setVolume] = useState(settings.volume)
  const [muted, setMuted] = useState(false)

  const player = useHiddenPlayer(settings.volume)
  const total = questions.length
  const question = questions[index]

  // `result` : true/false (répondu) ou 'skipped' (passé — ne compte ni pour ni
  // contre le score, cf. bouton "Passer" dans QuestionRunner).
  const handleAnswered = useCallback((result) => {
    const skipped = result === 'skipped'
    const isCorrect = result === true
    const nextScore = isCorrect ? score + 1 : score
    const nextHistory = [...history, {
      source: question.playback.source,
      source_track_id: question.playback.source_track_id,
      reveal: question.reveal,
      isCorrect,
      skipped,
    }]
    setScore(nextScore)
    setHistory(nextHistory)
    if (index + 1 < total) {
      setIndex((i) => i + 1)
    } else {
      player.stop()
      const scoredTotal = nextHistory.filter((h) => !h.skipped).length
      const skippedCount = nextHistory.filter((h) => h.skipped).length
      onFinish({ score: nextScore, total: scoredTotal, skippedCount, history: nextHistory })
    }
  }, [index, total, score, history, question, player, onFinish])

  const handleVolumeChange = (v) => {
    setVolume(v)
    setMuted(false)
    player.setVolume(v)
  }

  const toggleMute = () => {
    if (muted) {
      player.setVolume(volume)
      setMuted(false)
    } else {
      player.setVolume(0)
      setMuted(true)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header : progression + score */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Question <span className="font-semibold text-gray-900">{index + 1}</span> / {total}
        </div>
        <div className="text-sm font-medium text-gray-900">
          Score : <span className="text-blue-600">{score}</span> / {total}
        </div>
        <button onClick={onAbort} className="text-sm text-gray-500 hover:text-gray-700 underline">
          Quitter
        </button>
      </div>

      {/* Barre de progression des questions */}
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-500 ease-out"
          style={{ width: `${(index / total) * 100}%` }}
        />
      </div>

      <QuestionRunner
        key={question.id}
        question={question}
        settings={settings}
        player={player}
        searchPool={searchPool}
        onAnswered={handleAnswered}
      />

      {/* Volume */}
      <div className="flex items-center gap-3 justify-center pt-2">
        <button onClick={toggleMute} className="text-gray-500 hover:text-gray-700">
          {muted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={muted ? 0 : volume}
          onChange={(e) => handleVolumeChange(Number(e.target.value))}
          className="w-40 accent-blue-600"
        />
      </div>
    </div>
  )
}

export default BlindTestGame
