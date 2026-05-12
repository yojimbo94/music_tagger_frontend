import { useState } from 'react'
import { useApp } from '../context/AppContext'
import Tag from './Tag'

function TrackDetailsModal({ track, onClose, onUpdateDiscogs }) {
    const [discogsUrl, setDiscogsUrl] = useState('')
    const [isSearching, setIsSearching] = useState(false)
    const [searchResults, setSearchResults] = useState([])
    const { addNotification } = useApp()

    const handleSearchDiscogs = async () => {
        if (!discogsUrl) {
            addNotification('warning', 'Veuillez entrer une URL Discogs')
            return
        }

        // Vérifier que l'URL est valide
        if (!discogsUrl.includes('discogs.com/release/')) {
            addNotification(
                'error',
                'URL Discogs invalide. Format attendu: https://www.discogs.com/release/12345'
            )
            return
        }

        setIsSearching(true)
        setSearchResults([])

        try {
            const response = await fetch(
                `http://127.0.0.1:5000/api/tracks/${track.source}/${track.source_track_id}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        discogs_url: discogsUrl
                    })
                }
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors de la mise à jour Discogs')
            }

            const updatedTrack = data.track

            // Mettre à jour les infos locales directement
            // Remonter la track mise à jour au parent
            if (onUpdateDiscogs) {
                onUpdateDiscogs(updatedTrack)
            }

            // Mettre à jour le résultat affiché
            setSearchResults([
                {
                    id: updatedTrack.discogs_release_id,
                    title: updatedTrack.discogs_album,
                    artist: updatedTrack.discogs_artist,
                    year: updatedTrack.year,
                    url: updatedTrack.discogs_url,
                    thumbnail:
                        updatedTrack.thumbnail_url ||
                        'https://via.placeholder.com/150x150?text=Album',
                    genres: updatedTrack.genres || [],
                    styles: updatedTrack.styles || []
                }
            ])

            addNotification('success', 'Track mise à jour depuis Discogs')

        } catch (error) {
            addNotification(
                'error',
                `Erreur lors de la recherche: ${error.message}`
            )
        } finally {
            setIsSearching(false)
        }
    }

    const handleSelectResult = async (result) => {
        try {
            const response = await fetch(
                `/api/tracks/${track.source}/${track.source_track_id}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ discogs_url: result.url })
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur inconnue');
            }

            const data = await response.json();
            addNotification('success', 'Track mise à jour avec succès!');
            onClose();
            // Recharger les tracks
            // (Tu peux passer une callback pour recharger la liste)

        } catch (error) {
            addNotification('error', `Erreur: ${error.message}`);
        }
    };

    // Formater les informations de la track
    const getTrackInfo = () => {
        const baseInfo = {
            'Source': (
                <span className="px-2 py-1 bg-gray-100 rounded-full text-sm">
                    {track.source}
                </span>
            ),
            'ID Source': track.source_track_id,
            'Titre (Source)': track.source_title,
            'Artiste (Source)': track.source_artist,
            'Album (Source)': track.source_album || '—',
            'Date de création': new Date(track.created_at).toLocaleString('fr-FR')
        }

        if (track.status === 'matched') {
            return {
                ...baseInfo,
                'Statut': <span className="text-green-600 font-medium">✓ Matché</span>,
                '': <div className="col-span-2 border-t border-gray-200 my-2"></div>,
                'Informations Discogs': <span className="font-medium text-gray-500"></span>,
                'Artiste': track.discogs_artist,
                'Album': track.discogs_album,
                'Année': track.year,
                'ID Release': track.discogs_release_id,
                'ID Master': track.discogs_master_id,
                'URL Discogs': (
                    <a
                        href={track.discogs_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                    >
                        Ouvrir sur Discogs →
                    </a>
                ),
                'Genres': track.genres?.join(', ') || '—',
                'Styles': track.styles?.join(', ') || '—'
            }
        } else {
            return {
                ...baseInfo,
                'Statut': <span className="text-red-600 font-medium">✗ Échoué</span>
            }
        }
    }

    const trackInfo = getTrackInfo()

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                    <h2 className="text-xl font-bold truncate max-w-md">
                        {track.status === 'matched' ? track.discogs_album || track.source_title : track.source_title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-1"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Contenu */}
                <div className="p-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Thumbnail */}
                        <div className="flex-shrink-0">
                            <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                                {track.thumbnail_url ? (
                                    <img
                                        src={track.thumbnail_url}
                                        alt="Pochette"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.onerror = null
                                            e.target.src = 'https://via.placeholder.com/150x150?text=No+Image'
                                        }}
                                    />
                                ) : (
                                    <span className="text-gray-500 text-sm">Pas d'image</span>
                                )}
                            </div>
                            {track.status === 'matched' && track.discogs_url && (
                                <a
                                    href={track.discogs_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 block text-center text-sm text-blue-600 hover:underline"
                                >
                                    Voir sur Discogs
                                </a>
                            )}
                        </div>

                        {/* Informations */}
                        <div className="flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(trackInfo).map(([key, value]) => {
                                    // Sauter les lignes vides (utilisées pour les séparateurs)
                                    if (!key && typeof value === 'object' && value === null) return null
                                    if (!key) return (
                                        <div key={Math.random()} className="md:col-span-2">
                                            {value}
                                        </div>
                                    )

                                    return (
                                        <div key={key} className="flex">
                                            <div className="w-32 text-sm font-medium text-gray-500">{key}</div>
                                            <div className="flex-1">{value}</div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Tags */}
                            {(track.styles?.length > 0 || track.genres?.length > 0) && (
                                <div className="mt-6 pt-4 border-t border-gray-200">
                                    <div className="text-sm font-medium text-gray-500 mb-2">Tags</div>
                                    <div className="flex flex-wrap gap-2">
                                        {[...(track.styles || []), ...(track.genres || [])].map((tag, index) => (
                                            <Tag key={index} tag={tag} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Section pour mettre à jour le lien Discogs */}
                    {track.status == 'matched' && (
                        <div className="mt-6 pt-6 border-t border-gray-200 bg-gray-50 p-4 rounded-lg">
                            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                                Changer le match discogs
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Entrez l'URL d'une release Discogs pour trouver une nouvelle correspondance.
                            </p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={discogsUrl}
                                    onChange={(e) => setDiscogsUrl(e.target.value)}
                                    placeholder="https://www.discogs.com/release/12345"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={handleSearchDiscogs}
                                    disabled={!discogsUrl || isSearching}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    {isSearching ? 'Recherche...' : 'Rechercher'}
                                </button>
                            </div>

                            {/* Résultats de la recherche */}
                            {isSearching && (
                                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                        <span className="text-sm">Recherche en cours...</span>
                                    </div>
                                </div>
                            )}

                            {searchResults.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    <p className="text-sm font-medium text-gray-700">
                                        Résultat(s) trouvé(s) :
                                    </p>
                                    {searchResults.map((result) => (
                                        <div
                                            key={result.id}
                                            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                            onClick={() => handleSelectResult(result)}
                                        >
                                            <div className="flex gap-4">
                                                <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                                                    <img
                                                        src={result.thumbnail}
                                                        alt="Pochette"
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-medium">{result.title}</div>
                                                    <div className="text-sm text-gray-600">{result.artist}</div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {result.year} • {result.genres?.join(', ') || '—'}
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 flex justify-end bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    )
}

export default TrackDetailsModal