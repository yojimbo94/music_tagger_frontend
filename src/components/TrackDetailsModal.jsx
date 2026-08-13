import { memo, useMemo, useState, useCallback, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { updateTrackDiscogs, setManualTags, getStyles, getGenres } from '../api/client'
import Tag from './Tag'
import TagPicker from './TagPicker'
import {
    X,
    ChevronRight,
} from 'lucide-react'

function extractYouTubeVideoId(value) {
    if (!value) return null
    if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value
    try {
        const url = new URL(value)
        const watchId = url.searchParams.get('v')
        if (watchId) return watchId
        if (url.hostname.includes('youtu.be')) {
            return url.pathname.split('/').filter(Boolean)[0] || null
        }
        const shortsMatch = url.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/)
        if (shortsMatch) return shortsMatch[1]
        const embedMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/)
        if (embedMatch) return embedMatch[1]
    } catch {
        const match = value.match(/([a-zA-Z0-9_-]{11})/)
        return match ? match[1] : null
    }
    return null
}

function extractSpotifyTrackId(value) {
    if (!value) return null
    if (/^[a-zA-Z0-9]{22}$/.test(value)) return value
    try {
        const url = new URL(value)
        const trackMatch = url.pathname.match(/\/track\/([a-zA-Z0-9]{22})/)
        if (trackMatch) return trackMatch[1]
        const embedMatch = url.pathname.match(/\/embed\/track\/([a-zA-Z0-9]{22})/)
        if (embedMatch) return embedMatch[1]
    } catch {
        const match = value.match(/([a-zA-Z0-9]{22})/)
        return match ? match[1] : null
    }
    return null
}

function getMediaPlayer(track) {
    const source = (track.source || '').toLowerCase()
    const rawId = track.source_track_id || track.id_source || ''
    if (source === 'spotify') {
        const spotifyId = extractSpotifyTrackId(rawId)
        if (!spotifyId) return null
        return {
            type: 'spotify',
            src: `https://open.spotify.com/embed/track/${spotifyId}?utm_source=generator`,
            title: 'Lecteur Spotify',
            height: 152
        }
    }
    if (source === 'youtube' || source === 'yt' || source === 'ytmusic' || source === 'youtube music') {
        const youtubeId = extractYouTubeVideoId(rawId)
        if (!youtubeId) return null
        return {
            type: 'youtube',
            src: `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`,
            title: 'Lecteur YouTube',
            height: 315
        }
    }
    return null
}

function DetailRow({ label, children, className = '' }) {
    return (
        <div className={`rounded-lg border border-gray-200 bg-white p-3 ${className}`}>
            <div className="mb-1 text-xs font-medium uppercase text-gray-500">{label}</div>
            <div className="text-sm text-gray-800">{children}</div>
        </div>
    )
}

const STATUS_LABEL = {
    matched: { text: '✓ Matché', className: 'text-green-600' },
    manual: { text: '✎ Tag manuel', className: 'text-blue-600' },
    failed: { text: '✗ Échoué', className: 'text-red-600' },
}

function TrackDetailsModal({ track, onClose, onUpdateDiscogs }) {
    const [discogsUrl, setDiscogsUrl] = useState('')
    const [isSearching, setIsSearching] = useState(false)
    const [searchResults, setSearchResults] = useState([])
    const [manualStyles, setManualStyles] = useState(track.styles || [])
    const [manualGenres, setManualGenres] = useState(track.genres || [])
    const [isSavingTags, setIsSavingTags] = useState(false)
    const [knownStyles, setKnownStyles] = useState([])
    const [knownGenres, setKnownGenres] = useState([])
    const { addNotification } = useApp()

    const mediaPlayer = useMemo(() => getMediaPlayer(track), [track])
    const isTaggable = track.status === 'failed' || track.status === 'manual'

    useEffect(() => {
        if (!isTaggable) return
        getStyles().then(setKnownStyles).catch(() => {})
        getGenres().then(setKnownGenres).catch(() => {})
    }, [isTaggable])

    const handleSearchDiscogs = useCallback(async () => {
        if (!discogsUrl) {
            addNotification('warning', 'Veuillez entrer une URL Discogs')
            return
        }
        if (!discogsUrl.includes('discogs.com/release/')) {
            addNotification('error', 'URL Discogs invalide. Format attendu: https://www.discogs.com/release/12345')
            return
        }
        setIsSearching(true)
        setSearchResults([])
        try {
            const data = await updateTrackDiscogs(track.source, track.source_track_id, discogsUrl)
            const updatedTrack = data.track
            onUpdateDiscogs?.(updatedTrack, discogsUrl)
            setSearchResults([
                {
                    id: updatedTrack.discogs_release_id,
                    title: updatedTrack.discogs_album,
                    artist: updatedTrack.discogs_artist,
                    year: updatedTrack.year,
                    url: updatedTrack.discogs_url,
                    thumbnail: updatedTrack.discogs_image || 'https://via.placeholder.com/150x150?text=Album',
                    genres: updatedTrack.genres || [],
                    styles: updatedTrack.styles || []
                }
            ])
            addNotification('success', 'Track mise à jour depuis Discogs')
        } catch (error) {
            addNotification('error', `Erreur lors de la recherche: ${error.message}`)
        } finally {
            setIsSearching(false)
        }
    }, [discogsUrl, track.source, track.source_track_id, onUpdateDiscogs, addNotification])

    const handleSelectResult = useCallback(async (result) => {
        try {
            const data = await updateTrackDiscogs(track.source, track.source_track_id, result.url)
            onUpdateDiscogs?.(data.track || track, result.url)
            addNotification('success', 'Track mise à jour avec succès!')
            onClose()
        } catch (error) {
            addNotification('error', `Erreur: ${error.message}`)
        }
    }, [track, onUpdateDiscogs, addNotification, onClose])

    const handleSaveManualTags = useCallback(async () => {
        if (manualStyles.length === 0 && manualGenres.length === 0) {
            addNotification('warning', 'Ajoutez au moins un style ou un genre')
            return
        }
        setIsSavingTags(true)
        try {
            const data = await setManualTags(track.source, track.source_track_id, {
                styles: manualStyles,
                genres: manualGenres
            })
            onUpdateDiscogs?.(data.track, null)
            addNotification('success', 'Tags enregistrés et titre ajouté aux playlists correspondantes')
            onClose()
        } catch (error) {
            addNotification('error', `Erreur: ${error.message}`)
        } finally {
            setIsSavingTags(false)
        }
    }, [track, manualStyles, manualGenres, onUpdateDiscogs, addNotification, onClose])

    const trackInfo = useMemo(() => {
        const baseRows = [
            { type: 'row', key: 'source', label: 'Source', value: <span className="px-2 py-1 bg-gray-100 rounded-full text-sm">{track.source}</span> },
            { type: 'row', key: 'id-source', label: 'ID Source', value: track.source_track_id },
            { type: 'row', key: 'title-source', label: 'Titre (Source)', value: track.source_title },
            { type: 'row', key: 'artist-source', label: 'Artiste (Source)', value: track.source_artist },
            { type: 'row', key: 'album-source', label: 'Album (Source)', value: track.source_album || '—' },
            { type: 'row', key: 'created-at', label: 'Date de création', value: track.created_at ? new Date(track.created_at).toLocaleString('fr-FR') : '—' }
        ]

        const statusMeta = STATUS_LABEL[track.status]
        const statusRow = statusMeta
            ? { type: 'row', key: 'status', label: 'Statut', value: <span className={`font-medium ${statusMeta.className}`}>{statusMeta.text}</span> }
            : null

        if (track.status === 'matched') {
            return [
                ...baseRows,
                statusRow,
                { type: 'separator', key: 'separator-discogs' },
                { type: 'section', key: 'discogs-title', value: 'Informations Discogs' },
                { type: 'row', key: 'artist', label: 'Artiste', value: track.discogs_artist },
                { type: 'row', key: 'album', label: 'Album', value: track.discogs_album },
                { type: 'row', key: 'year', label: 'Année', value: track.year },
                { type: 'row', key: 'release-id', label: 'ID Release', value: track.discogs_release_id },
                { type: 'row', key: 'master-id', label: 'ID Master', value: track.discogs_master_id },
                {
                    type: 'row',
                    key: 'url',
                    label: 'URL Discogs',
                    value: (
                        <a href={track.discogs_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            Ouvrir sur Discogs →
                        </a>
                    )
                },
                { type: 'row', key: 'genres', label: 'Genres', value: track.genres?.join(', ') || '—' },
                { type: 'row', key: 'styles', label: 'Styles', value: track.styles?.join(', ') || '—' }
            ]
        }

        if (track.status === 'manual') {
            return [
                ...baseRows,
                statusRow,
                { type: 'row', key: 'genres', label: 'Genres (manuel)', value: track.genres?.join(', ') || '—' },
                { type: 'row', key: 'styles', label: 'Styles (manuel)', value: track.styles?.join(', ') || '—' }
            ]
        }

        return [...baseRows, statusRow]
    }, [track])

    const title = (track.status === 'matched' || track.status === 'manual') ? (track.discogs_album || track.source_title) : track.source_title
    const subtitle = `${track.discogs_artist || track.source_artist || 'Artiste inconnu'}${track.year ? ` · ${track.year}` : ''}`
    const tags = [...(track.styles || []), ...(track.genres || [])]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/30 backdrop-blur-sm">
            <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="truncate text-xl font-semibold text-gray-900">{title}</h2>
                            {track.has_alert && (
                                <span title="Style hors de la liste attendue" className="text-amber-500">⚠️</span>
                            )}
                        </div>
                        <p className="mt-1 truncate text-sm text-gray-500">{subtitle}</p>
                    </div>
                    <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Main Content */}
                <div className="relative grid flex-1 overflow-hidden lg:grid-cols-[360px_1fr]">
                    {/* Sidebar */}
                    <aside className="border-b border-gray-200 bg-gray-50 p-5 lg:border-b-0 lg:border-r lg:border-gray-200">
                        <div className="space-y-4">
                            {/* Album Cover */}
                            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                                <div className="aspect-square w-full bg-gray-100">
                                    {track.discogs_image ? (
                                        <img
                                            src={track.discogs_image}
                                            alt="Pochette"
                                            className="h-full w-full object-cover"
                                            loading="lazy"
                                            onError={(e) => {
                                                e.currentTarget.onerror = null
                                                e.currentTarget.src = 'https://via.placeholder.com/600x600?text=No+Image'
                                            }}
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-sm text-gray-500">Pas d'image</div>
                                    )}
                                </div>
                            </div>

                            {/* Media Player */}
                            {mediaPlayer && (
                                <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm w-full">
                                    <div className="mb-2 text-sm font-medium text-gray-600">{mediaPlayer.title}</div>
                                    <div className="flex justify-center">
                                        {mediaPlayer.type === 'spotify' ? (
                                            <div className="w-full max-w-[280px]">
                                                <iframe
                                                    src={mediaPlayer.src}
                                                    width="100%"
                                                    height={mediaPlayer.height}
                                                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                                    loading="lazy"
                                                    style={{ border: 0, borderRadius: '8px' }}
                                                    title={mediaPlayer.title}
                                                />
                                            </div>
                                        ) : (
                                            <div className="aspect-video w-full max-w-[300px] overflow-hidden rounded-lg">
                                                <iframe
                                                    src={mediaPlayer.src}
                                                    width="100%"
                                                    height="100%"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                                                    loading="lazy"
                                                    style={{ border: 0, borderRadius: '8px' }}
                                                    title={mediaPlayer.title}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Tags */}
                            {tags.length > 0 && (
                                <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                                    <div className="mb-2 text-sm font-medium text-gray-600">Tags</div>
                                    <div className="flex flex-wrap gap-2">
                                        {tags.map((tag, index) => (
                                            <Tag key={`${tag}-${index}`} tag={tag} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* Main Content Area */}
                    <main className="min-w-0 overflow-y-auto p-5">
                        <div className="grid gap-4 sm:grid-cols-2">
                            {trackInfo.filter(Boolean).map((item) => {
                                if (item.type === 'separator') {
                                    return <div key={item.key} className="sm:col-span-2 my-1 border-t border-gray-200" />
                                }
                                if (item.type === 'section') {
                                    return (
                                        <div key={item.key} className="sm:col-span-2 mt-2">
                                            <div className="text-sm font-semibold text-gray-700">{item.value}</div>
                                        </div>
                                    )
                                }
                                return (
                                    <DetailRow key={item.key} label={item.label}>
                                        {item.value}
                                    </DetailRow>
                                )
                            })}
                        </div>

                        {/* Tag manuel — pour les tracks sans match Discogs */}
                        {isTaggable && (
                            <section className="mt-6 rounded-lg border border-gray-200 bg-blue-50/50 p-4 shadow-sm">
                                <div className="mb-4">
                                    <h3 className="text-base font-semibold text-gray-900">
                                        Tag manuel
                                    </h3>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium uppercase text-gray-500">Styles</label>
                                        <TagPicker value={manualStyles} onChange={setManualStyles} suggestions={knownStyles} placeholder="Ex: Deep House" />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium uppercase text-gray-500">Genres</label>
                                        <TagPicker value={manualGenres} onChange={setManualGenres} suggestions={knownGenres} placeholder="Ex: Electronic" />
                                    </div>
                                    <button
                                        onClick={handleSaveManualTags}
                                        disabled={isSavingTags}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isSavingTags ? 'Enregistrement...' : 'Valider les tags'}
                                    </button>
                                </div>
                            </section>
                        )}

                        {/* Discogs Update Section */}
                        <section className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-sm">
                            <div className="mb-4">
                                <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                    </svg>
                                    Fix manuel release discogs
                                </h3>
                                <p className="mt-1 text-sm text-gray-600">
                                    URL release discogs
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex flex-col gap-3 md:flex-row">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            value={discogsUrl}
                                            onChange={(e) => setDiscogsUrl(e.target.value)}
                                            placeholder="https://www.discogs.com/release/12345"
                                            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSearchDiscogs}
                                        disabled={!discogsUrl || isSearching}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isSearching ? 'Recherche...' : 'Rechercher'}
                                    </button>
                                </div>

                                {isSearching && (
                                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                                        Recherche en cours...
                                    </div>
                                )}

                                {searchResults.length > 0 && (
                                    <div className="space-y-3">
                                        <p className="text-sm font-medium text-gray-700">Résultat(s) trouvé(s)</p>
                                        {searchResults.map((result) => (
                                            <button
                                                key={result.id}
                                                onClick={() => handleSelectResult(result)}
                                                className="w-full rounded-lg border border-gray-200 bg-white p-3 text-left hover:bg-gray-50"
                                            >
                                                <div className="flex gap-4">
                                                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                                        <img
                                                            src={result.thumbnail}
                                                            alt="Pochette"
                                                            className="h-full w-full object-cover"
                                                            loading="lazy"
                                                        />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="truncate text-sm font-medium text-gray-900">{result.title}</div>
                                                        <div className="truncate text-sm text-gray-600">{result.artist}</div>
                                                        <div className="mt-1 text-xs text-gray-500">
                                                            {result.year} • {result.genres?.join(', ') || '—'}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center text-gray-400">
                                                        <ChevronRight className="h-5 w-5" />
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>
                    </main>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4">
                    <button
                        onClick={onClose}
                        className="inline-flex items-center justify-center rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    )
}

export default memo(TrackDetailsModal)
