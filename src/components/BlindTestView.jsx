import { useCallback, useState } from 'react'
import { startBlindTestRound, getTrack } from '../api/client'
import { useApp } from '../context/AppContext'
import BlindTestSetup from './blindtest/BlindTestSetup'
import BlindTestGame from './blindtest/BlindTestGame'
import TrackDetailsModal from './TrackDetailsModal'

function RecapRow({ entry, onOpen, loading }) {
  const stateClass = entry.isCorrect
    ? 'border-green-200 bg-green-50 hover:bg-green-100'
    : 'border-red-200 bg-red-50 hover:bg-red-100'

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={loading}
      className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors disabled:cursor-wait disabled:opacity-70 ${stateClass}`}
    >
      <span className={`text-lg ${entry.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
        {entry.isCorrect ? '✓' : '✗'}
      </span>
      {entry.reveal.image && (
        <img
          src={entry.reveal.image}
          alt=""
          className="h-10 w-10 rounded-md object-cover bg-gray-100 flex-shrink-0"
          loading="lazy"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-gray-900">{entry.reveal.title}</div>
        <div className="truncate text-xs text-gray-500">
          {entry.reveal.artist}
          {entry.reveal.year ? ` · ${entry.reveal.year}` : ''}
        </div>
      </div>
    </button>
  )
}

function ResultsScreen({ result, onReplay, onNewSettings }) {
  const [selectedTrack, setSelectedTrack] = useState(null)
  const [loadingEntry, setLoadingEntry] = useState(null)
  const { addNotification } = useApp()

  const ratio = result.total > 0 ? result.score / result.total : 0
  const message = ratio === 1
    ? 'Trop chaud 🏆!'
    : ratio >= 0.7
      ? 'Propre 🔥'
      : ratio >= 0.4
        ? 'Ok ok'
        : 'À chier wtf'

  const openEntry = useCallback(async (entry) => {
    setLoadingEntry(entry.source_track_id)
    try {
      const track = await getTrack(entry.source, entry.source_track_id)
      setSelectedTrack(track)
    } catch (err) {
      addNotification('error', `Impossible de charger ce titre : ${err.message}`)
    } finally {
      setLoadingEntry(null)
    }
  }, [addNotification])

  return (
    <div className="mx-auto max-w-md space-y-6 py-10">
      <div className="text-center space-y-4">
        <div className="text-5xl">{ratio === 1 ? '🏆' : '🎧'}</div>
        <h2 className="text-2xl font-semibold text-gray-900">{message}</h2>
        <p className="text-lg text-gray-700">
          Score : <span className="font-bold text-blue-600">{result.score}</span> / {result.total}
        </p>
        {result.skippedCount > 0 && (
          <p className="text-sm text-gray-400">
            {result.skippedCount} titre{result.skippedCount > 1 ? 's' : ''} passé{result.skippedCount > 1 ? 's' : ''} (non comptabilisé{result.skippedCount > 1 ? 's' : ''})
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onReplay}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Rejouer (même config)
          </button>
          <button
            onClick={onNewSettings}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            Changer la config
          </button>
        </div>
      </div>

      {result.history?.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">Récapitulatif des manches</div>
          {result.history.map((entry, i) => (
            <RecapRow
              key={`${entry.source}-${entry.source_track_id}-${i}`}
              entry={entry}
              onOpen={() => openEntry(entry)}
              loading={loadingEntry === entry.source_track_id}
            />
          ))}
        </div>
      )}

      {selectedTrack && (
        <TrackDetailsModal
          track={selectedTrack}
          onClose={() => setSelectedTrack(null)}
          onUpdateDiscogs={() => {}}
        />
      )}
    </div>
  )
}

function BlindTestView() {
  const [phase, setPhase] = useState('setup') // 'setup' | 'playing' | 'results'
  const [settings, setSettings] = useState(null)
  const [questions, setQuestions] = useState([])
  const [searchPool, setSearchPool] = useState([])
  const [result, setResult] = useState(null)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState(null)

  const launchRound = useCallback(async (nextSettings) => {
    setStarting(true)
    setError(null)
    try {
      const data = await startBlindTestRound({
        sources: nextSettings.sources,
        styles: nextSettings.styles,
        genres: nextSettings.genres,
        mode: nextSettings.mode,
        question_count: nextSettings.questionCount,
        choices_count: nextSettings.choicesCount,
        info_fields: nextSettings.infoFields,
        show_cover: nextSettings.showCover,
      })
      if (!data.questions || data.questions.length === 0) {
        setError('Aucune track ne correspond à ces critères.')
        return
      }
      setSettings(nextSettings)
      setQuestions(data.questions)
      setSearchPool(data.search_pool || [])
      setPhase('playing')
    } catch (err) {
      setError(err.message)
    } finally {
      setStarting(false)
    }
  }, [])

  const handleFinish = useCallback((finalResult) => {
    setResult(finalResult)
    setPhase('results')
  }, [])

  const handleAbort = useCallback(() => {
    setPhase('setup')
  }, [])

  if (phase === 'playing' && settings) {
    return (
      <BlindTestGame
        questions={questions}
        settings={settings}
        searchPool={searchPool}
        onFinish={handleFinish}
        onAbort={handleAbort}
      />
    )
  }

  if (phase === 'results' && result) {
    return (
      <ResultsScreen
        result={result}
        onReplay={() => launchRound(settings)}
        onNewSettings={() => setPhase('setup')}
      />
    )
  }

  return <BlindTestSetup onStart={launchRound} starting={starting} error={error} />
}

export default BlindTestView
