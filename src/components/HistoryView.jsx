import { useState, useEffect, useCallback } from 'react'
import { getProcessingRuns, getProcessingRunTracks } from '../api/client'
import { useApp } from '../context/AppContext'
import TracksTable from './TracksTable'
import TrackDetailsModal from './TrackDetailsModal'

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

const TRIGGER_LABEL = { cron: 'Cron', manual: 'Manuel' }

function RunPicker({ runs, selectedRunId, onSelect }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-100 max-h-96 overflow-y-auto">
      {runs.map(run => (
        <button
          key={run.id}
          onClick={() => onSelect(run.id)}
          className={`w-full text-left px-4 py-3 text-sm transition-colors ${
            run.id === selectedRunId ? 'bg-blue-50' : 'hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-gray-900">{formatDate(run.started_at)}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {TRIGGER_LABEL[run.trigger] || run.trigger}
            </span>
          </div>
          <div className="mt-1 text-gray-500">
            {run.finished_at ? (
              <>
                <span className="text-green-700">{run.matched} trouvé{run.matched > 1 ? 's' : ''}</span>
                {' · '}
                <span className="text-red-600">{run.failed} non trouvé{run.failed > 1 ? 's' : ''}</span>
                {' · '}
                {run.processed} vérifiés
              </>
            ) : (
              <span className="italic">en cours…</span>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

function HistoryView() {
  const { addNotification } = useApp()
  const [runs, setRuns] = useState([])
  const [selectedRunId, setSelectedRunId] = useState(null)
  const [tracks, setTracks] = useState([])
  const [loadingRuns, setLoadingRuns] = useState(true)
  const [loadingTracks, setLoadingTracks] = useState(false)
  const [selectedTrack, setSelectedTrack] = useState(null)
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' })

  useEffect(() => {
    (async () => {
      try {
        setLoadingRuns(true)
        const data = await getProcessingRuns()
        setRuns(data)
        if (data.length > 0) setSelectedRunId(data[0].id)
      } catch (err) {
        addNotification('error', `Erreur: ${err.message}`)
      } finally {
        setLoadingRuns(false)
      }
    })()
  }, [addNotification])

  useEffect(() => {
    if (!selectedRunId) return
    (async () => {
      try {
        setLoadingTracks(true)
        const data = await getProcessingRunTracks(selectedRunId)
        setTracks(data.map(track => ({
          ...track,
          date: track.created_at ? new Date(track.created_at).getTime() : null
        })))
      } catch (err) {
        addNotification('error', `Erreur: ${err.message}`)
      } finally {
        setLoadingTracks(false)
      }
    })()
  }, [selectedRunId, addNotification])

  const requestSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc'
    setSortConfig({ key, direction })
  }

  const sortedTracks = [...tracks].sort((a, b) => {
    const aValue = a[sortConfig.key]
    const bValue = b[sortConfig.key]
    if (sortConfig.key === 'date') {
      const diff = (aValue || 0) - (bValue || 0)
      return sortConfig.direction === 'asc' ? diff : -diff
    }
    const strA = (aValue || '').toString().toLowerCase()
    const strB = (bValue || '').toString().toLowerCase()
    if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1
    if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })

  const handleTrackUpdated = useCallback((updatedTrack) => {
    if (!updatedTrack) return
    setTracks(prev => prev.map(t =>
      t.source === updatedTrack.source && t.source_track_id === updatedTrack.source_track_id
        ? { ...t, ...updatedTrack, date: updatedTrack.created_at ? new Date(updatedTrack.created_at).getTime() : t.date }
        : t
    ))
  }, [])

  const handleTrackDeleted = useCallback((deletedTrack) => {
    setTracks(prev => prev.filter(t =>
      !(t.source === deletedTrack.source && t.source_track_id === deletedTrack.source_track_id)
    ))
  }, [])

  if (loadingRuns) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (runs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center text-gray-500">
        Aucun run de processing enregistré pour l'instant.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-1">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Derniers runs</h2>
        <RunPicker runs={runs} selectedRunId={selectedRunId} onSelect={setSelectedRunId} />
      </div>

      <div className="lg:col-span-3">
        {loadingTracks ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : tracks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center text-gray-500">
            Aucun nouveau résultat pendant ce run (rien à traiter, ou tout était déjà connu).
          </div>
        ) : (
          <TracksTable
            tracks={sortedTracks}
            onSelectTrack={setSelectedTrack}
            sortConfig={sortConfig}
            onSort={requestSort}
          />
        )}
      </div>

      {selectedTrack && (
        <TrackDetailsModal
          track={selectedTrack}
          onClose={() => setSelectedTrack(null)}
          onUpdateDiscogs={handleTrackUpdated}
          onDeleted={handleTrackDeleted}
        />
      )}
    </div>
  )
}

export default HistoryView
