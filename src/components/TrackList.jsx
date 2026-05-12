import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import TrackRow from './TrackRow'
import TrackDetailsModal from './TrackDetailsModal'
import FilterBar from './FilterBar'

function TrackList() {
    const [tracks, setTracks] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [selectedTrack, setSelectedTrack] = useState(null)
    const [filters, setFilters] = useState({
        search: '',
        status: 'all',
        tags: []
    })
    const [allTags, setAllTags] = useState([])

    const { setIsLoading, addNotification } = useApp()

    // Charger les tracks depuis l'API
    useEffect(() => {
        const fetchTracks = async () => {
            try {
                setIsLoading(true);
                setLoading(true);

                // Appel réel à l'API
                const response = await fetch('http://127.0.1:5000/api/tracks');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setTracks(data.tracks);

                // Extraire tous les tags uniques
                const tagsSet = new Set();
                data.tracks.forEach(track => {
                    if (track.styles) track.styles.forEach(tag => tagsSet.add(tag));
                    if (track.genres) track.genres.forEach(tag => tagsSet.add(tag));
                });
                setAllTags(Array.from(tagsSet));

                addNotification('success', `${data.tracks.length} tracks chargés avec succès`);

            } catch (err) {
                setError(err.message);
                addNotification('error', `Erreur: ${err.message}`);
            } finally {
                setIsLoading(false);
                setLoading(false);
            }
        };

        fetchTracks()
    }, [setIsLoading, addNotification])

    // Filtrer les tracks
    const filteredTracks = tracks.filter(track => {
        // Filtre par statut
        if (filters.status !== 'all' && track.status !== filters.status) {
            return false
        }

        // Filtre par recherche textuelle
        const searchLower = filters.search.toLowerCase()
        const searchableText = [
            track.source_title,
            track.source_artist,
            track.discogs_album,
            track.discogs_artist,
            track.source,
            track.source_album
        ].filter(Boolean).join(' ').toLowerCase()

        if (searchLower && !searchableText.includes(searchLower)) {
            return false
        }

        // Filtre par tags
        if (filters.tags.length > 0) {
            const trackTags = [...(track.styles || []), ...(track.genres || [])]
            const hasMatchingTag = filters.tags.some(tag => trackTags.includes(tag))
            if (!hasMatchingTag) return false
        }

        return true
    })

    const handleUpdateDiscogs = async (track, discogsUrl) => {
        try {
            // TODO: Appeler l'API pour mettre à jour le lien Discogs
            // Exemple:
            // const response = await fetch(`/api/tracks/${track.source}/${track.source_track_id}`, {
            //   method: 'PUT',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify({ discogs_url: discogsUrl })
            // })
            // 
            // Si la réponse est OK, recharger les tracks
            // if (response.ok) {
            //   fetchTracks()
            //   addNotification('success', 'Track mise à jour avec succès')
            // }

            // Simulation pour démo
            addNotification('success', `Track ${track.source_title} mise à jour avec succès`)
            setSelectedTrack(null)

            // Mettre à jour localement pour la démo
            setTracks(prev => prev.map(t =>
                t.id === track.source_track_id
                    ? {
                        ...t,
                        status: 'matched',
                        discogs_url: discogsUrl,
                        discogs_album: 'Nouvel Album (Demo)',
                        discogs_artist: 'Nouvel Artiste (Demo)',
                        year: 2026,
                        genres: ['Demo'],
                        styles: ['Test']
                    }
                    : t
            ))

        } catch (error) {
            addNotification('error', `Erreur lors de la mise à jour: ${error.message}`)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                Erreur: {error}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Filtres */}
            <FilterBar
                filters={filters}
                setFilters={setFilters}
                allTags={allTags}
            />

            {/* Résumé des filtres */}
            {(filters.search || filters.status !== 'all' || filters.tags.length > 0) && (
                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                    <span className="font-medium">Filtres actifs:</span>
                    {filters.search && <span className="ml-2">Recherche: "{filters.search}"</span>}
                    {filters.status !== 'all' && <span className="ml-2">Statut: {filters.status}</span>}
                    {filters.tags.length > 0 && (
                        <span className="ml-2">Tags: {filters.tags.join(', ')}</span>
                    )}
                    {filteredTracks.length < tracks.length && (
                        <span className="ml-2">({filteredTracks.length} / {tracks.length} tracks)</span>
                    )}
                </div>
            )}

            {/* Liste des tracks */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-medium text-gray-900">
                            Liste des tracks ({filteredTracks.length} / {tracks.length})
                        </h2>
                        <button
                            onClick={() => setFilters({ search: '', status: 'all', tags: [] })}
                            className="text-sm text-blue-600 hover:text-blue-800"
                        >
                            Effacer tous les filtres
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y dividesxray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                                    Statut
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                                    Source
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                                    Pochette
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Titre / Artiste
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Album (Discogs)
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                                    Tags
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                                    Date
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredTracks.length > 0 ? (
                                filteredTracks.map((track) => (
                                    <TrackRow
                                        key={`${track.source}_${track.source_track_id}`}
                                        track={track}
                                        onClick={() => setSelectedTrack(track)}
                                    />
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                                        Aucune track trouvée
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de détails */}
            {selectedTrack && (
                <TrackDetailsModal
                    track={selectedTrack}
                    onClose={() => setSelectedTrack(null)}
                    onUpdateDiscogs={handleUpdateDiscogs}
                />
            )}
        </div>
    )
}

export default TrackList
