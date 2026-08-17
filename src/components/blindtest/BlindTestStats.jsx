import { useEffect, useState } from 'react'
import { getBlindTestStats } from '../../api/client'
import { useApp } from '../../context/AppContext'

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="text-2xl font-semibold text-gray-900">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

function TrackRow({ entry }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-b-0">
      {entry.image && (
        <img
          src={entry.image}
          alt=""
          className="h-9 w-9 rounded-md object-cover bg-gray-100 flex-shrink-0"
          loading="lazy"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-gray-900">{entry.title || '?'}</div>
        <div className="truncate text-xs text-gray-500">{entry.artist}</div>
      </div>
      <div className="shrink-0 text-right text-xs text-gray-500">
        <div>{entry.correct} / {entry.plays}</div>
        <div className="text-gray-400">{Math.round(entry.success_rate * 100)}%</div>
      </div>
    </div>
  )
}

function TagRow({ entry }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-gray-100 last:border-b-0">
      <span className="text-sm text-gray-900 truncate">{entry.name}</span>
      <div className="shrink-0 text-right text-xs text-gray-500">
        <span>{entry.plays} question{entry.plays > 1 ? 's' : ''}</span>
        <span className="text-gray-400"> · {Math.round(entry.success_rate * 100)}%</span>
      </div>
    </div>
  )
}

function Section({ title, empty, children }) {
  return (
    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-sm font-medium text-gray-900 mb-3">{title}</h3>
      {empty ? <p className="text-sm text-gray-400">Pas encore assez de données.</p> : children}
    </div>
  )
}

const MODE_TABS = [
  { key: '', label: 'Tous les modes' },
  { key: 'track', label: 'Choix multiples' },
  { key: 'search', label: 'Recherche' },
  { key: 'year', label: 'Année' },
]

function BlindTestStats({ role }) {
  const [mode, setMode] = useState('')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const { addNotification } = useApp()

  useEffect(() => {
    setLoading(true)
    getBlindTestStats(mode || undefined)
      .then(setStats)
      .catch((err) => addNotification('error', `Erreur: ${err.message}`))
      .finally(() => setLoading(false))
  }, [mode, addNotification])

  const modeTabs = (
    <div className="flex gap-1 flex-wrap">
      {MODE_TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => setMode(tab.key)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            mode === tab.key
              ? 'bg-blue-100 text-blue-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )

  if (loading) {
    return (
      <div className="space-y-6">
        {modeTabs}
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  if (!stats || stats.total_answers === 0) {
    return (
      <div className="space-y-6">
        {modeTabs}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 text-center text-sm text-gray-500">
          Aucune partie jouée pour l'instant{role ? ` en tant que ${role === 'admin' ? 'admin' : 'visiteur'}` : ''}.
          Lance un blind test pour commencer à accumuler des stats.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {modeTabs}

      <p className="text-xs text-gray-400">
        Stats {role === 'admin' ? 'admin' : 'visiteur'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Réponses données" value={stats.total_answers} />
        <StatCard label="Bonnes réponses" value={stats.total_correct} />
        <StatCard
          label="Taux de réussite"
          value={`${Math.round(stats.success_rate * 100)}%`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Titres les plus joués" empty={stats.most_played.length === 0}>
          {stats.most_played.map((entry) => (
            <TrackRow key={`${entry.source}-${entry.source_track_id}`} entry={entry} />
          ))}
        </Section>

        <Section
          title="Titres les moins réussis"
          empty={stats.hardest.length === 0}
        >
          {stats.hardest.length === 0 ? null : (
            <>
              <p className="text-xs text-gray-400 mb-2">Au moins 3 apparitions</p>
              {stats.hardest.map((entry) => (
                <TrackRow key={`${entry.source}-${entry.source_track_id}`} entry={entry} />
              ))}
            </>
          )}
        </Section>

        <Section title="Styles les plus représentés" empty={stats.styles.length === 0}>
          {stats.styles.map((entry) => (
            <TagRow key={entry.name} entry={entry} />
          ))}
        </Section>

        <Section title="Genres les plus représentés" empty={stats.genres.length === 0}>
          {stats.genres.map((entry) => (
            <TagRow key={entry.name} entry={entry} />
          ))}
        </Section>
      </div>
    </div>
  )
}

export default BlindTestStats