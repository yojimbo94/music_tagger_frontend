import { useEffect, useState, useCallback } from 'react'
import { getPlaylists } from '../api/client'
import { useApp } from '../context/AppContext'
import { ExternalLink } from 'lucide-react'

const SOURCES = [
  { value: 'spotify', label: 'Spotify' },
  { value: 'ytmusic', label: 'YouTube Music' },
]

function PlaylistsView() {
  const [source, setSource] = useState('spotify')
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const { addNotification } = useApp()

  const fetchPlaylists = useCallback(async (src) => {
    setLoading(true)
    try {
      const data = await getPlaylists(src)
      setPlaylists(data.playlists || [])
    } catch (err) {
      addNotification('error', `Erreur playlists: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [addNotification])

  // Chargement initial uniquement ; le changement de source est déclenché
  // explicitement par le clic sur l'onglet (cf. handleSelectSource), pas par un effect.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial des playlists au montage
    fetchPlaylists(source)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSelectSource = (value) => {
    setSource(value)
    fetchPlaylists(value)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between">
        <div className="flex rounded-md border border-gray-300 overflow-hidden">
          {SOURCES.map(s => (
            <button
              key={s.value}
              onClick={() => handleSelectSource(s.value)}
              className={`px-3 py-2 text-sm ${source === s.value ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => fetchPlaylists(source)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Rafraîchir
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md divide-y divide-gray-200">
          {playlists.length === 0 && (
            <div className="px-6 py-4 text-center text-gray-500">Aucune playlist trouvée</div>
          )}
          {playlists.map(pl => (
            <a
              key={pl.id}
              href={pl.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-6 py-3 hover:bg-gray-50"
            >
              <span className="font-medium text-gray-900">{pl.name}</span>
              <span className="flex items-center gap-3 text-sm text-gray-500">
                {pl.track_count != null ? `${pl.track_count} titres` : '—'}
                <ExternalLink className="h-4 w-4" />
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export default PlaylistsView
