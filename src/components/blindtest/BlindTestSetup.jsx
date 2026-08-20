import { useEffect, useMemo, useState } from 'react'
import { getBlindTestConfig, resolveExternalPlaylist, getCachedExternalPlaylists, getCachedExternalTracks } from '../../api/client'
import TagPicker from '../TagPicker'
import { Loader2, Plus, X, RefreshCw, Database } from 'lucide-react'

const SOURCES = [
  { value: 'spotify', label: 'Spotify' },
  { value: 'ytmusic', label: 'YouTube Music' },
]

const INFO_FIELDS = [
  { value: 'title', label: 'Titre' },
  { value: 'artist', label: 'Artiste' },
  { value: 'album', label: 'Album' },
]

const DEFAULT_SETTINGS = {
  sources: ['spotify', 'ytmusic'],
  styles: [],
  genres: [],
  mode: 'track',
  questionCount: 10,
  choicesCount: 4,
  infoFields: ['title', 'artist'],
  showCover: false,
  largeChoices: false,
  blurredCoverHint: false,
  maxResponseSeconds: 15,
  volume: 70,
}

function SectionLabel({ children }) {
  return <div className="text-sm font-medium text-gray-700 mb-2">{children}</div>
}

let nextPlaylistRowId = 0

/**
 * Ingestion d'une ou plusieurs playlists externes (Spotify + YouTube Music
 * mélangeables) : chaque lien ajouté est résolu indépendamment et garde son
 * propre statut visible (idle est impossible ici, une ligne n'existe qu'une
 * fois l'appel lancé) — pas besoin du canal Socket.IO du processing classique,
 * /resolve reste un appel HTTP synchrone assez rapide.
 */
function ExternalPlaylistPicker({
  playlists, onAdd, onRemove, onRetry,
  cachedPlaylists, checkedCachePlaylistIds, onToggleCachePlaylist, onToggleAllCachePlaylists,
}) {
  const [url, setUrl] = useState('')

  const submit = () => {
    const trimmed = url.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setUrl('')
  }

  const doneCount = playlists.filter((p) => p.status === 'done').length
  const loadingCount = playlists.filter((p) => p.status === 'loading').length
  const totalTracks = playlists.reduce((sum, p) => sum + (p.status === 'done' ? p.tracks.length : 0), 0)
  const cachedTotalTracks = cachedPlaylists.reduce((sum, p) => sum + p.track_count, 0)

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), submit())}
          placeholder="Lien de playlist Spotify ou YouTube Music..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!url.trim()}
          className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <Plus className="h-4 w-4" /> Ajouter
        </button>
      </div>

      {/* Playlists déjà rencontrées par le passé (table `external_playlists`,
          cf. backend) — cocher/décocher pour rejouer sans recoller leur lien. */}
      {cachedPlaylists.length > 0 && (
        <div className="rounded-lg border border-gray-200 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" />
              Playlists déjà en cache ({cachedPlaylists.length}, {cachedTotalTracks} titre{cachedTotalTracks > 1 ? 's' : ''} au total)
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => onToggleAllCachePlaylists(true)}
                disabled={checkedCachePlaylistIds.size === cachedPlaylists.length}
                className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Tout cocher
              </button>
              <button
                type="button"
                onClick={() => onToggleAllCachePlaylists(false)}
                disabled={checkedCachePlaylistIds.size === 0}
                className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Tout décocher
              </button>
            </div>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {cachedPlaylists.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2.5 py-1 px-1.5 rounded hover:bg-gray-50 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={checkedCachePlaylistIds.has(p.id)}
                  onChange={(e) => onToggleCachePlaylist(p.id, e.target.checked)}
                  className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded flex-shrink-0"
                />
                {p.image ? (
                  <img src={p.image} alt="" className="h-6 w-6 rounded object-cover flex-shrink-0 bg-gray-200" />
                ) : (
                  <Database className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                )}
                <span className="truncate flex-1 text-gray-800">{p.name || p.playlist_id}</span>
                <span className="flex-shrink-0 text-xs text-gray-400">{p.track_count} titre{p.track_count > 1 ? 's' : ''}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {playlists.length > 0 && (
        <div className="space-y-2">
          {playlists.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 rounded-lg border p-2.5 text-sm ${
                p.status === 'error' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              {p.status === 'loading' && <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-blue-500" />}
              {p.status === 'done' && p.image && (
                <img src={p.image} alt="" className="h-8 w-8 rounded object-cover flex-shrink-0 bg-gray-200" />
              )}
              {p.status === 'done' && !p.image && p.kind === 'cache' && (
                <Database className="h-4 w-4 flex-shrink-0 text-gray-400" />
              )}
              {p.status === 'error' && <span className="text-red-500 flex-shrink-0">✗</span>}

              <div className="min-w-0 flex-1">
                {p.status === 'loading' && <div className="text-gray-500">Récupération de la playlist…</div>}
                {p.status === 'done' && (
                  <>
                    <div className="truncate font-medium text-gray-900">{p.name || p.url}</div>
                    <div className="text-xs text-gray-500">{p.tracks.length} titre{p.tracks.length > 1 ? 's' : ''} chargé{p.tracks.length > 1 ? 's' : ''}</div>
                  </>
                )}
                {p.status === 'error' && <div className="truncate text-red-700">{p.error}</div>}
              </div>

              {p.status === 'error' && (
                <button type="button" onClick={() => onRetry(p.id)} className="text-gray-400 hover:text-gray-600 flex-shrink-0" title="Réessayer">
                  <RefreshCw className="h-4 w-4" />
                </button>
              )}
              <button type="button" onClick={() => onRemove(p.id)} className="text-gray-400 hover:text-gray-600 flex-shrink-0" title="Retirer">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}

          <div className="text-xs text-gray-500">
            {loadingCount > 0
              ? `Chargement de ${loadingCount} playlist${loadingCount > 1 ? 's' : ''}… (${doneCount} déjà prête${doneCount > 1 ? 's' : ''}, ${totalTracks} titre${totalTracks > 1 ? 's' : ''} au total)`
              : `${doneCount} playlist${doneCount > 1 ? 's' : ''} chargée${doneCount > 1 ? 's' : ''}, ${totalTracks} titre${totalTracks > 1 ? 's' : ''} au total`}
          </div>
        </div>
      )}
    </div>
  )
}

function BlindTestSetup({ onStart, starting, error }) {
  const [availableStyles, setAvailableStyles] = useState([])
  const [availableGenres, setAvailableGenres] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [sourceType, setSourceType] = useState('library') // 'library' | 'external'
  const [externalPlaylists, setExternalPlaylists] = useState([])
  const [cachedPlaylists, setCachedPlaylists] = useState([]) // playlists déjà résolues par le passé (table external_playlists)
  const [checkedCachePlaylistIds, setCheckedCachePlaylistIds] = useState(() => new Set())

  useEffect(() => {
    getBlindTestConfig().then((cfg) => {
      setAvailableStyles(cfg.available_styles || [])
      setAvailableGenres(cfg.available_genres || [])
    }).catch(() => {})
    // Chargé d'emblée (pas seulement au passage en mode externe) pour que la
    // liste des playlists en cache (et leur nombre de titres) soit déjà
    // affichée dès qu'on ouvre cet onglet.
    getCachedExternalPlaylists().then((data) => {
      setCachedPlaylists(data.playlists || [])
    }).catch(() => {})
  }, [])

  // Bascule automatique sur un mode de jeu valide (pas d'année sans Discogs) au
  // passage en playlist externe, plutôt que de laisser un mode invalide masqué.
  const selectSourceType = (value) => {
    setSourceType(value)
    if (value === 'external') {
      setSettings((s) => (s.mode === 'year' ? { ...s, mode: 'track' } : s))
    }
  }

  const resolvePlaylistRow = (id, row) => {
    setExternalPlaylists((rows) => rows.map((r) => (r.id === id ? { ...r, status: 'loading', error: null } : r)))
    const fetcher = row.kind === 'cache'
      ? getCachedExternalTracks([row.dbId]).then((data) => ({
        playlist_name: row.name, playlist_image: row.image, tracks: data.tracks || [],
      }))
      : resolveExternalPlaylist(row.url)
    fetcher
      .then((data) => {
        setExternalPlaylists((rows) => rows.map((r) => (r.id === id ? {
          ...r,
          status: 'done',
          dbId: r.dbId ?? data.playlist_db_id,
          name: data.playlist_name,
          image: data.playlist_image,
          tracks: data.tracks || [],
        } : r)))
        // Une playlist résolue via son lien vient d'être (re)mise en cache côté
        // serveur : on la fait apparaître (ou on la rafraîchit) dans la liste à
        // cocher, cochée puisqu'elle est déjà présente dans les liens ajoutés.
        if (row.kind === 'url' && data.playlist_db_id) {
          setCachedPlaylists((list) => {
            const entry = {
              id: data.playlist_db_id, source: data.source, playlist_id: data.playlist_id,
              name: data.playlist_name, image: data.playlist_image, track_count: (data.tracks || []).length,
            }
            const exists = list.some((p) => p.id === entry.id)
            return exists ? list.map((p) => (p.id === entry.id ? entry : p)) : [entry, ...list]
          })
          setCheckedCachePlaylistIds((s) => new Set(s).add(data.playlist_db_id))
        }
      })
      .catch((err) => {
        setExternalPlaylists((rows) => rows.map((r) => (r.id === id ? { ...r, status: 'error', error: err.message } : r)))
      })
  }

  const addExternalPlaylist = (url) => {
    const id = ++nextPlaylistRowId
    const row = { id, kind: 'url', url, dbId: null, status: 'loading', name: null, image: null, tracks: [], error: null }
    setExternalPlaylists((rows) => [...rows, row])
    resolvePlaylistRow(id, row)
  }

  const removeExternalPlaylist = (id) => {
    const row = externalPlaylists.find((r) => r.id === id)
    setExternalPlaylists((rows) => rows.filter((r) => r.id !== id))
    if (row?.dbId) {
      setCheckedCachePlaylistIds((s) => {
        const next = new Set(s)
        next.delete(row.dbId)
        return next
      })
    }
  }

  const retryExternalPlaylist = (id) => {
    const row = externalPlaylists.find((r) => r.id === id)
    if (row) resolvePlaylistRow(id, row)
  }

  // Coche/décoche une playlist déjà en cache : cocher ajoute une ligne (tracks
  // récupérées depuis le cache local, pas de nouvel appel à Spotify/YouTube),
  // décocher la retire — même mécanique que "retirer" sur une ligne classique.
  const toggleCachePlaylist = (dbId, checked) => {
    setCheckedCachePlaylistIds((s) => {
      const next = new Set(s)
      checked ? next.add(dbId) : next.delete(dbId)
      return next
    })
    if (checked) {
      const meta = cachedPlaylists.find((p) => p.id === dbId)
      const id = ++nextPlaylistRowId
      const row = {
        id, kind: 'cache', dbId, url: null, status: 'loading',
        name: meta?.name, image: meta?.image, tracks: [], error: null,
      }
      setExternalPlaylists((rows) => [...rows, row])
      resolvePlaylistRow(id, row)
    } else {
      setExternalPlaylists((rows) => rows.filter((r) => r.dbId !== dbId))
    }
  }

  // "Tout cocher"/"tout décocher" : rejoue toggleCachePlaylist par playlist
  // pour rester sur le même chemin (chargement individuel des tracks, retrait
  // symétrique) plutôt que de dupliquer la logique.
  const toggleAllCachePlaylists = (checked) => {
    for (const p of cachedPlaylists) {
      if (checked !== checkedCachePlaylistIds.has(p.id)) toggleCachePlaylist(p.id, checked)
    }
  }

  // Fusion dédupliquée (une même track présente dans deux playlists ne compte
  // qu'une fois) des tracks des playlists résolues avec succès.
  const externalTracks = useMemo(() => {
    const seen = new Set()
    const merged = []
    for (const p of externalPlaylists) {
      if (p.status !== 'done') continue
      for (const t of p.tracks) {
        const key = `${t.source}:${t.source_track_id}`
        if (seen.has(key)) continue
        seen.add(key)
        merged.push(t)
      }
    }
    return merged
  }, [externalPlaylists])

  const toggleSource = (value) => {
    setSettings((s) => {
      const has = s.sources.includes(value)
      const next = has ? s.sources.filter((v) => v !== value) : [...s.sources, value]
      return { ...s, sources: next.length > 0 ? next : s.sources }
    })
  }

  const toggleInfoField = (value) => {
    setSettings((s) => {
      const has = s.infoFields.includes(value)
      const next = has ? s.infoFields.filter((v) => v !== value) : [...s.infoFields, value]
      return { ...s, infoFields: next.length > 0 ? next : s.infoFields }
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-2">🎧</div>
        <h2 className="text-xl font-semibold text-gray-900">Blind test</h2>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-6">
        {/* Type de manche */}
        <div>
          <SectionLabel>Type de manche</SectionLabel>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => selectSourceType('library')}
              className={`flex-1 px-3 py-2 rounded-md border text-sm transition-colors ${
                sourceType === 'library'
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Ma bibliothèque
            </button>
            <button
              type="button"
              onClick={() => selectSourceType('external')}
              className={`flex-1 px-3 py-2 rounded-md border text-sm transition-colors ${
                sourceType === 'external'
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Playlist(s) externe(s)
            </button>
          </div>
        </div>

        {sourceType === 'external' ? (
          <div>
            <SectionLabel>Liens de playlist (Spotify et YouTube Music mélangeables)</SectionLabel>
            <ExternalPlaylistPicker
              playlists={externalPlaylists}
              onAdd={addExternalPlaylist}
              onRemove={removeExternalPlaylist}
              onRetry={retryExternalPlaylist}
              cachedPlaylists={cachedPlaylists}
              checkedCachePlaylistIds={checkedCachePlaylistIds}
              onToggleCachePlaylist={toggleCachePlaylist}
              onToggleAllCachePlaylists={toggleAllCachePlaylists}
            />
          </div>
        ) : (
          <>
            {/* Sources */}
            <div>
              <SectionLabel>Sources</SectionLabel>
              <div className="flex gap-2">
                {SOURCES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => toggleSource(s.value)}
                    className={`px-3 py-2 rounded-md border text-sm transition-colors ${
                      settings.sources.includes(s.value)
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Styles */}
            <div>
              <SectionLabel>Styles (vide = tous)</SectionLabel>
              <TagPicker
                value={settings.styles}
                onChange={(styles) => setSettings((s) => ({ ...s, styles }))}
                suggestions={availableStyles}
                placeholder="Ajouter un style..."
              />
            </div>

            {/* Genres */}
            <div>
              <SectionLabel>Genres (vide = tous)</SectionLabel>
              <TagPicker
                value={settings.genres}
                onChange={(genres) => setSettings((s) => ({ ...s, genres }))}
                suggestions={availableGenres}
                placeholder="Ajouter un genre..."
              />
            </div>
          </>
        )}

        {/* Mode */}
        <div>
          <SectionLabel>Mode de jeu</SectionLabel>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSettings((s) => ({ ...s, mode: 'track' }))}
              className={`flex-1 px-3 py-2 rounded-md border text-sm transition-colors ${
                settings.mode === 'track'
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Deviner le titre
            </button>
            <button
              type="button"
              onClick={() => setSettings((s) => ({ ...s, mode: 'search' }))}
              className={`flex-1 px-3 py-2 rounded-md border text-sm transition-colors ${
                settings.mode === 'search'
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Rechercher le titre
            </button>
            {sourceType === 'library' && (
              <button
                type="button"
                onClick={() => setSettings((s) => ({ ...s, mode: 'year' }))}
                className={`flex-1 px-3 py-2 rounded-md border text-sm transition-colors ${
                  settings.mode === 'year'
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Deviner l'année de sortie
              </button>
            )}
          </div>
        </div>

        {/* Indice pochette floutée (mode search uniquement) */}
        {settings.mode === 'search' && (
          <div>
            <SectionLabel>Facilité</SectionLabel>
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-300 text-sm text-gray-600 cursor-pointer hover:bg-gray-50 w-fit">
              <input
                type="checkbox"
                checked={settings.blurredCoverHint}
                onChange={(e) => setSettings((s) => ({ ...s, blurredCoverHint: e.target.checked }))}
                className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              Pochette floutée
            </label>
          </div>
        )}

        {/* Infos affichées dans les choix (mode track uniquement) */}
        {settings.mode === 'track' && (
          <div>
            <SectionLabel>Informations affichées dans les choix</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {INFO_FIELDS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => toggleInfoField(f.value)}
                  className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                    settings.infoFields.includes(f.value)
                      ? 'bg-blue-100 border-blue-300 text-blue-800'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-300 text-sm text-gray-600 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={settings.showCover}
                  onChange={(e) => setSettings((s) => ({
                    ...s,
                    showCover: e.target.checked,
                    largeChoices: e.target.checked ? s.largeChoices : false,
                  }))}
                  className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                Pochette
              </label>
              {settings.showCover && (
                <label className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-300 text-sm text-gray-600 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={settings.largeChoices}
                    onChange={(e) => setSettings((s) => ({ ...s, largeChoices: e.target.checked }))}
                    className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  Choix en grand format
                </label>
              )}
            </div>
          </div>
        )}

        {/* Réglages numériques */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de manches</label>
            <input
              type="number"
              min={1}
              max={100}
              value={settings.questionCount}
              onChange={(e) => setSettings((s) => ({ ...s, questionCount: Number(e.target.value) || 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {settings.mode !== 'search' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de choix</label>
              <input
                type="number"
                min={2}
                max={8}
                value={settings.choicesCount}
                onChange={(e) => setSettings((s) => ({ ...s, choicesCount: Number(e.target.value) || 2 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Temps de réponse max (secondes, 0 = illimité)
            </label>
            <input
              type="number"
              min={0}
              max={120}
              value={settings.maxResponseSeconds}
              onChange={(e) => setSettings((s) => ({ ...s, maxResponseSeconds: Number(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Volume */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Volume ({settings.volume}%)
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={settings.volume}
            onChange={(e) => setSettings((s) => ({ ...s, volume: Number(e.target.value) }))}
            className="w-full accent-blue-600"
          />
        </div>

        <button
          onClick={() => onStart(
            sourceType === 'external'
              ? { ...settings, sourceType, tracks: externalTracks }
              : { ...settings, sourceType }
          )}
          disabled={starting || (sourceType === 'external' && externalTracks.length < 2)}
          className="w-full py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {starting
            ? 'Préparation...'
            : sourceType === 'external' && externalTracks.length < 2
              ? 'Ajoute au moins une playlist avec 2 titres ou plus'
              : 'Démarrer le blind test'}
        </button>
      </div>
    </div>
  )
}

export default BlindTestSetup
