import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import {
  getManagedPlaylists,
  importLegacyPlaylists,
  previewPlaylist,
  createPlaylist,
  setPlaylistActive,
  deletePlaylist,
  getPlaylistSync,
  reconcilePlaylist,
  getStyles
} from '../api/client'
import { useApp } from '../context/AppContext'
import TagPicker from './TagPicker'
import { ExternalLink, RefreshCw, Trash2, Plus } from 'lucide-react'

const SOURCES = [
  { value: 'spotify', label: 'Spotify' },
  { value: 'ytmusic', label: 'YouTube Music' },
]

function PlaylistsView({ isAdmin }) {
  const [source, setSource] = useState('spotify')
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [syncPlaylist, setSyncPlaylist] = useState(null)
  const { addNotification } = useApp()

  const fetchPlaylists = useCallback(async (src) => {
    setLoading(true)
    try {
      const data = await getManagedPlaylists(src)
      setPlaylists(data)
    } catch (err) {
      addNotification('error', `Erreur playlists: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [addNotification])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement initial au montage
    fetchPlaylists(source)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSelectSource = (value) => {
    setSource(value)
    setShowForm(false)
    setSyncPlaylist(null)
    fetchPlaylists(value)
  }

  const handleImport = async () => {
    setImporting(true)
    try {
      const res = await importLegacyPlaylists(source)
      addNotification('success', `${res.imported} playlist(s) importée(s)`)
      fetchPlaylists(source)
    } catch (err) {
      addNotification('error', `Erreur import: ${err.message}`)
    } finally {
      setImporting(false)
    }
  }

  const handleToggleActive = async (pl) => {
    try {
      await setPlaylistActive(pl.id, !pl.active)
      fetchPlaylists(source)
    } catch (err) {
      addNotification('error', `Erreur: ${err.message}`)
    }
  }

  const handleDelete = async (pl) => {
    const deleteExternal = window.confirm(
      `Supprimer aussi la playlist "${pl.name}" sur ${pl.source === 'spotify' ? 'Spotify' : 'YouTube Music'} ?\n\n` +
      `OK = supprimer partout, Annuler = juste arrêter de la gérer ici (elle reste sur la plateforme, tu peux annuler complètement avec Échap).`
    )
    try {
      const res = await deletePlaylist(pl.id, deleteExternal)
      if (res.warning) addNotification('error', res.warning)
      else addNotification('success', 'Playlist supprimée')
      fetchPlaylists(source)
    } catch (err) {
      addNotification('error', `Erreur: ${err.message}`)
    }
  }

  const handleCreated = () => {
    setShowForm(false)
    fetchPlaylists(source)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center justify-between flex-wrap gap-2">
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
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
              title="Détecte les playlists existantes créées par l'ancienne convention de nom et les enregistre ici"
            >
              {importing ? 'Import...' : 'Importer les existantes'}
            </button>
          )}
          <button
            onClick={() => fetchPlaylists(source)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Rafraîchir
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> Nouvelle playlist
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <NewPlaylistForm
          source={source}
          onCreated={handleCreated}
          onCancel={() => setShowForm(false)}
        />
      )}

      {syncPlaylist && (
        <SyncPanel
          playlist={syncPlaylist}
          isAdmin={isAdmin}
          onClose={() => setSyncPlaylist(null)}
          onReconciled={() => fetchPlaylists(source)}
        />
      )}

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md divide-y divide-gray-200">
          {playlists.length === 0 && (
            <div className="px-6 py-4 text-center text-gray-500">
              Aucune playlist gérée pour l'instant — utilise "Importer les existantes" ou crée-en une nouvelle.
            </div>
          )}
          {playlists.map(pl => (
            <div key={pl.id} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 truncate">{pl.name}</span>
                  {!pl.active && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600">inactive</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {pl.styles.map(s => (
                    <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">{s}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500 shrink-0">
                {pl.track_count != null ? `${pl.track_count} titres` : '—'}
                <a href={pl.url} target="_blank" rel="noopener noreferrer" title="Ouvrir la playlist">
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button onClick={() => setSyncPlaylist(pl)} title="Vérifier la synchro" className="text-gray-500 hover:text-blue-600">
                  <RefreshCw className="h-4 w-4" />
                </button>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => handleToggleActive(pl)}
                      className={`text-xs px-2 py-1 rounded-md border ${pl.active ? 'border-gray-300 text-gray-700 hover:bg-gray-100' : 'border-blue-300 text-blue-700 hover:bg-blue-50'}`}
                    >
                      {pl.active ? 'Désactiver' : 'Activer'}
                    </button>
                    <button onClick={() => handleDelete(pl)} title="Supprimer" className="text-gray-500 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NewPlaylistForm({ source, onCreated, onCancel }) {
  const [allStyles, setAllStyles] = useState([])
  const [styles, setStyles] = useState([])
  const [name, setName] = useState('')
  const [nameTouched, setNameTouched] = useState(false)
  const [preview, setPreview] = useState({ count: 0, tracks: [] })
  const [previewLoading, setPreviewLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const debounceRef = useRef(null)
  const { addNotification } = useApp()

  useEffect(() => {
    getStyles().then(setAllStyles).catch(() => {})
  }, [])

  // Nom auto-généré à partir des styles choisis tant que l'utilisateur n'a pas
  // édité le champ lui-même.
  useEffect(() => {
    if (!nameTouched) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- dérivé de `styles`, pas d'effet de bord externe
      setName(styles.join(' + '))
    }
  }, [styles, nameTouched])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (styles.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- réinitialisation synchrone, pas d'appel réseau à débouncer
      setPreview({ count: 0, tracks: [] })
      return
    }
    debounceRef.current = setTimeout(() => {
      setPreviewLoading(true)
      previewPlaylist(source, styles)
        .then(setPreview)
        .catch((err) => addNotification('error', `Erreur prévisualisation: ${err.message}`))
        .finally(() => setPreviewLoading(false))
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [source, styles, addNotification])

  const handleCreate = async () => {
    if (styles.length === 0 || !name.trim()) return
    setCreating(true)
    try {
      const res = await createPlaylist(source, name.trim(), styles)
      if (res.warning) addNotification('error', res.warning)
      addNotification('success', `Playlist créée, ${res.tracks_added} titre(s) ajouté(s)`)
      onCreated()
    } catch (err) {
      addNotification('error', `Erreur création: ${err.message}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-3">
      <h3 className="text-sm font-medium text-gray-900">
        Nouvelle playlist {source === 'spotify' ? 'Spotify' : 'YouTube Music'}
      </h3>

      <div>
        <label className="block text-xs text-gray-600 mb-1">
          Styles requis (un seul = playlist classique, plusieurs = combinaison en ET logique)
        </label>
        <TagPicker
          value={styles}
          onChange={setStyles}
          suggestions={allStyles}
          placeholder="Ajouter un style..."
        />
      </div>

      <div>
        <label className="block text-xs text-gray-600 mb-1">Nom de la playlist</label>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setNameTouched(true) }}
          className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <div className="text-sm text-gray-700">
          {previewLoading
            ? 'Prévisualisation...'
            : styles.length === 0
              ? 'Choisis au moins un style pour voir un aperçu.'
              : `${preview.count} titre(s) correspondant(s)`}
        </div>
        {preview.tracks.length > 0 && (
          <ul className="mt-2 max-h-40 overflow-y-auto text-xs text-gray-600 space-y-0.5">
            {preview.tracks.slice(0, 50).map(t => (
              <li key={t.source_track_id}>{t.source_artist} — {t.source_title}</li>
            ))}
            {preview.count > 50 && <li className="italic">... et {preview.count - 50} de plus</li>}
          </ul>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleCreate}
          disabled={creating || styles.length === 0 || !name.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {creating ? 'Création...' : `Créer${preview.count ? ` (${preview.count} titres)` : ''}`}
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
          Annuler
        </button>
      </div>
    </div>
  )
}

function SyncPanel({ playlist, isAdmin, onClose, onReconciled }) {
  const [diff, setDiff] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reconciling, setReconciling] = useState(false)
  const { addNotification } = useApp()

  const load = useCallback(() => {
    setLoading(true)
    getPlaylistSync(playlist.id)
      .then(setDiff)
      .catch((err) => addNotification('error', `Erreur synchro: ${err.message}`))
      .finally(() => setLoading(false))
  }, [playlist.id, addNotification])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement au montage / changement de playlist
    load()
  }, [load])

  const isSynced = useMemo(() => diff && diff.missing.length === 0 && diff.extra.length === 0, [diff])

  const handleReconcile = async () => {
    setReconciling(true)
    try {
      const res = await reconcilePlaylist(playlist.id)
      addNotification('success', `${res.added} ajouté(s), ${res.removed} retiré(s)`)
      onReconciled()
      load()
    } catch (err) {
      addNotification('error', `Erreur réconciliation: ${err.message}`)
    } finally {
      setReconciling(false)
    }
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Synchro — {playlist.name}</h3>
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-900">Fermer</button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Comparaison en cours...</div>
      ) : isSynced ? (
        <div className="text-sm text-green-700">La playlist est bien synchronisée avec la base.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-medium text-gray-600 mb-1">Manquants dans la playlist ({diff.missing.length})</h4>
            <ul className="max-h-40 overflow-y-auto text-xs text-gray-600 space-y-0.5">
              {diff.missing.map(t => (
                <li key={t.source_track_id}>{t.source_artist} — {t.source_title}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-medium text-gray-600 mb-1">En trop dans la playlist ({diff.extra.length})</h4>
            <ul className="max-h-40 overflow-y-auto text-xs text-gray-600 space-y-0.5">
              {diff.extra.map(t => (
                <li key={t.source_track_id}>{t.source_artist || '?'} — {t.source_title || t.source_track_id}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {isAdmin && diff && !isSynced && (
        <button
          onClick={handleReconcile}
          disabled={reconciling}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
        >
          {reconciling ? 'Réconciliation...' : 'Réconcilier'}
        </button>
      )}
    </div>
  )
}

export default PlaylistsView
