import { useCallback, useEffect, useState } from 'react'
import { startBlindTestRound, startExternalBlindTestRound, submitBlindTestAnswers, getBlindTestTrackStats, getTrack, createMultiplayerSession } from '../api/client'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import BlindTestSetup from './blindtest/BlindTestSetup'
import BlindTestGame from './blindtest/BlindTestGame'
import BlindTestStats from './blindtest/BlindTestStats'
import MultiplayerSession from './blindtest/MultiplayerSession'
import TrackDetailsModal from './TrackDetailsModal'

function RecapRow({ entry, stats, onOpen, loading, isExternal }) {
  const stateClass = entry.skipped
    ? 'border-gray-200 bg-gray-50 hover:bg-gray-100'
    : entry.isCorrect
      ? 'border-green-200 bg-green-50 hover:bg-green-100'
      : 'border-red-200 bg-red-50 hover:bg-red-100'

  const content = (
    <>
      <span className={`text-lg ${entry.skipped ? 'text-gray-400' : entry.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
        {entry.skipped ? '⏭' : entry.isCorrect ? '✓' : '✗'}
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
      {isExternal
        ? (entry.reveal.url && <span className="shrink-0 text-xs text-blue-600 font-medium">▶ Écouter</span>)
        : (stats && stats.plays > 0 && (
          <div className="shrink-0 text-right text-xs text-gray-500">
            <div>{stats.correct} / {stats.plays} au total</div>
            <div className="text-gray-400">{Math.round(stats.success_rate * 100)}% de réussite</div>
          </div>
        ))}
    </>
  )

  // Une track de playlist externe n'est pas cataloguée (pas d'infos autres que
  // titre/artiste/album) : pas de modale de détails, juste un lien direct vers
  // le titre/la vidéo plutôt qu'un appel API qui échouerait.
  if (isExternal) {
    return entry.reveal.url ? (
      <a
        href={entry.reveal.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${stateClass}`}
      >
        {content}
      </a>
    ) : (
      <div className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left ${stateClass}`}>{content}</div>
    )
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={loading}
      className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-colors disabled:cursor-wait disabled:opacity-70 ${stateClass}`}
    >
      {content}
    </button>
  )
}

function ResultsScreen({ result, onReplay, onNewSettings }) {
  const [selectedTrack, setSelectedTrack] = useState(null)
  const [loadingEntry, setLoadingEntry] = useState(null)
  const [trackStats, setTrackStats] = useState({})
  const { addNotification } = useApp()
  const { isAdmin } = useAuth()

  // Stats perso (nb d'apparitions / % de réussite, tous rounds confondus) pour
  // les titres de ce round — chargées en un seul appel groupé, pas par titre.
  // Jamais pour un round externe : ces titres ne sont pas enregistrés dans les
  // stats (cf. handleFinish dans BlindTestView), donc rien à aller chercher.
  useEffect(() => {
    if (result.isExternal || !result.history?.length) return
    const tracks = result.history.map((entry) => ({
      source: entry.source,
      source_track_id: entry.source_track_id,
    }))
    getBlindTestTrackStats(tracks)
      .then(setTrackStats)
      .catch(() => {}) // stats accessoires : un échec ne doit pas gêner l'écran de résultat
  }, [result.history, result.isExternal])

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

  // Reflète en direct dans la modale une modif Discogs / des tags manuels faite
  // depuis le blind test (le récap lui-même reste tel quel : c'est un historique
  // de ce qui a été demandé pendant la partie, pas une vue live des tracks).
  const handleTrackUpdated = useCallback((updatedTrack) => {
    if (!updatedTrack) return
    setSelectedTrack((prev) => (prev ? { ...prev, ...updatedTrack } : prev))
  }, [])

  const handleTrackDeleted = useCallback(() => {
    setSelectedTrack(null)
  }, [])

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
              stats={trackStats[`${entry.source}:${entry.source_track_id}`]}
              onOpen={() => openEntry(entry)}
              loading={loadingEntry === entry.source_track_id}
              isExternal={result.isExternal}
            />
          ))}
        </div>
      )}

      {selectedTrack && (
        <TrackDetailsModal
          track={selectedTrack}
          onClose={() => setSelectedTrack(null)}
          onUpdateDiscogs={handleTrackUpdated}
          onDeleted={handleTrackDeleted}
          isAdmin={isAdmin}
        />
      )}
    </div>
  )
}

function BlindTestView() {
  const [phase, setPhase] = useState('setup') // 'setup' | 'playing' | 'results' | 'stats' | 'multiplayer'
  const [settings, setSettings] = useState(null)
  const { role, isAdmin } = useAuth()
  const [questions, setQuestions] = useState([])
  const [searchPool, setSearchPool] = useState([])
  const [result, setResult] = useState(null)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState(null)

  // Session multijoueur créée par l'admin (host_token connu seulement de ce
  // navigateur, cf. plan multijoueur) — tant qu'elle est nulle, l'onglet
  // "Session" affiche le formulaire de création (admin) ou directement l'écran
  // de jonction (visiteur, qui ne peut pas créer de session).
  const [mpSession, setMpSession] = useState(null) // { code, hostToken } | null
  const [mpStarting, setMpStarting] = useState(false)
  const [mpError, setMpError] = useState(null)

  const launchMultiplayerSession = useCallback(async (nextSettings) => {
    setMpStarting(true)
    setMpError(null)
    try {
      const payload = nextSettings.sourceType === 'external'
        ? { source_type: 'external', tracks: nextSettings.tracks }
        : { source_type: 'library', sources: nextSettings.sources, styles: nextSettings.styles, genres: nextSettings.genres }
      const data = await createMultiplayerSession({
        ...payload,
        mode: nextSettings.mode,
        question_count: nextSettings.questionCount,
        choices_count: nextSettings.choicesCount,
        info_fields: nextSettings.infoFields,
        show_cover: nextSettings.showCover,
        max_response_seconds: nextSettings.maxResponseSeconds,
      })
      setMpSession({ code: data.code, hostToken: data.host_token })
    } catch (err) {
      setMpError(err.message)
    } finally {
      setMpStarting(false)
    }
  }, [])

  const launchRound = useCallback(async (nextSettings) => {
    setStarting(true)
    setError(null)
    try {
      // Playlist(s) externe(s) (lien Spotify/YouTube Music, sans Discogs) : le
      // pool vient des tracks déjà résolues côté front (BlindTestSetup), pas
      // des critères sources/styles/genres qui n'ont pas de sens ici.
      const data = nextSettings.sourceType === 'external'
        ? await startExternalBlindTestRound({
          tracks: nextSettings.tracks,
          mode: nextSettings.mode,
          question_count: nextSettings.questionCount,
          choices_count: nextSettings.choicesCount,
          info_fields: nextSettings.infoFields,
          show_cover: nextSettings.showCover,
        })
        : await startBlindTestRound({
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

  const handleFinish = useCallback(async (finalResult) => {
    const isExternal = settings?.sourceType === 'external'
    finalResult = { ...finalResult, isExternal }

    // Playlist externe : jamais enregistrée dans les stats de blind test (pas
    // de bibliothèque cataloguée derrière ces titres) — on n'appelle même pas
    // l'API. Les titres passés (skipped) ne sont eux non plus jamais transmis :
    // ils ne comptent ni pour ni contre (cf. src/domain/blindtest.py côté serveur).
    if (!isExternal) {
      const answers = (finalResult.history || [])
        .filter((entry) => !entry.skipped)
        .map((entry) => ({
          source: entry.source,
          source_track_id: entry.source_track_id,
          is_correct: entry.isCorrect,
        }))

      // On attend que les réponses soient bien enregistrées AVANT d'afficher
      // l'écran de résultat : celui-ci va aussitôt aller chercher les stats par
      // titre, et sans cet await la lecture partait souvent avant que
      // l'écriture soit terminée (les titres de cette manche manquaient alors
      // dans leurs propres stats). Best-effort : un échec n'empêche pas
      // d'afficher le résultat, seules les stats ne seront pas à jour.
      if (answers.length > 0) {
        try {
          await submitBlindTestAnswers(settings?.mode, answers)
        } catch {
          // ignoré : cf. commentaire ci-dessus
        }
      }
    }

    setResult(finalResult)
    setPhase('results')
  }, [settings])

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

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { key: 'setup', label: 'Jouer' },
          { key: 'multiplayer', label: 'Session' },
          { key: 'stats', label: 'Mes stats' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setPhase(tab.key)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              phase === tab.key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {phase === 'stats' && <BlindTestStats role={role} />}

      {phase === 'setup' && (
        <BlindTestSetup onStart={launchRound} starting={starting} error={error} />
      )}

      {phase === 'multiplayer' && (
        mpSession ? (
          <MultiplayerSession
            initialCode={mpSession.code}
            hostToken={mpSession.hostToken}
            onExit={() => setMpSession(null)}
          />
        ) : isAdmin ? (
          <BlindTestSetup onStart={launchMultiplayerSession} starting={mpStarting} error={mpError} />
        ) : (
          <MultiplayerSession />
        )
      )}
    </div>
  )
}

export default BlindTestView
