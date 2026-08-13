import { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import TracksTable from './TracksTable'; // ← Remplace TrackList
import TrackDetailsModal from './TrackDetailsModal'; // ← À importer
import ProcessingStatus from './ProcessingStatus';
import FilterBar from './FilterBar';

function MainLayout() {
    const [activeTab, setActiveTab] = useState('tracks');
    const [tracks, setTracks] = useState([]); // ← État des tracks
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTrack, setSelectedTrack] = useState(null); // ← Pour la modale
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [filters, setFilters] = useState({ search: '', status: 'all', tags: [] }); // ← Pour les filtres
    const [allTags, setAllTags] = useState([]);

    const { startProcessing, addNotification, setIsLoading } = useApp();

    // --- 1. Récupération des tracks (ancienne logique de TrackList) ---
    const fetchTracks = useCallback(async () => {
        try {
            setIsLoading(true);
            setLoading(true);
            const response = await fetch('http://127.0.0.1:5000/api/tracks');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            const nextTracks = (data.tracks || []).map(track => ({
            ...track,
            date: track.created_at ? new Date(track.created_at).getTime() : null
            }));
            setTracks(nextTracks);

            // Extraire les tags
            const tagsSet = new Set();
            nextTracks.forEach(track => {
                track.styles?.forEach(tag => tagsSet.add(tag));
                track.genres?.forEach(tag => tagsSet.add(tag));
            });
            setAllTags(Array.from(tagsSet));

            addNotification('success', `${nextTracks.length} tracks chargés`);
        } catch (err) {
            setError(err.message);
            addNotification('error', `Erreur: ${err.message}`);
        } finally {
            setIsLoading(false);
            setLoading(false);
        }
    }, [setIsLoading, addNotification]);

    useEffect(() => {
        fetchTracks();
    }, [fetchTracks]);

    // --- 2. Logique de tri ---
    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // --- 3. Tri des tracks ---
    const sortedTracks = useMemo(() => {
    if (!sortConfig.key) return tracks;
    return [...tracks].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        // Cas spécial pour la date (comparaison numérique)
        if (sortConfig.key === 'date') {
        const aDate = aValue || 0;
        const bDate = bValue || 0;
        return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
        }

        // Cas général (chaînes)
        const strA = (aValue || '').toString().toLowerCase();
        const strB = (bValue || '').toString().toLowerCase();
        if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
    }, [tracks, sortConfig]);

    // --- 4. Filtrage des tracks (optionnel, si tu veux garder les filtres) ---
    const filteredTracks = useMemo(() => {
        return sortedTracks.filter(track => {
            // Filtre par statut
            if (filters.status !== 'all' && track.status !== filters.status) return false;
            // Filtre par recherche
            if (filters.search) {
                const searchLower = filters.search.trim().toLowerCase();
                const searchableText = [
                    track.source_title,
                    track.source_artist,
                    track.discogs_album,
                    track.discogs_artist,
                    track.source,
                    track.source_album,
                ].filter(Boolean).join(' ').toLowerCase();
                if (!searchableText.includes(searchLower)) return false;
            }
            // Filtre par tags
            if (filters.tags.length > 0) {
                const trackTags = [...(track.styles || []), ...(track.genres || [])];
                if (!filters.tags.some(tag => trackTags.includes(tag))) return false;
            }
            return true;
        });
    }, [sortedTracks, filters]);

    // --- 5. Gestion de la modale ---
    const handleSelectTrack = useCallback((track) => {
        setSelectedTrack(track);
    }, []);

    const handleCloseModal = useCallback(() => {
        setSelectedTrack(null);
    }, []);

    // --- 6. Mise à jour Discogs (optionnel) ---
    const handleUpdateDiscogs = useCallback(async (track, discogsUrl) => {
        try {
            // TODO: Appeler l'API pour mettre à jour
            addNotification('success', `Track ${track.source_title} mise à jour`);
            setSelectedTrack(null);
            // Mise à jour locale (à adapter)
            setTracks(prev => prev.map(t =>
                t.source === track.source && t.source_track_id === track.source_track_id
                    ? { ...t, discogs_url: discogsUrl, status: 'matched' }
                    : t
            ));
        } catch (error) {
            addNotification('error', `Erreur: ${error.message}`);
        }
    }, [addNotification]);

    const handleStartProcessing = async (service) => {
        startProcessing(service);
        addNotification('info', `Démarrage du processing pour ${service || 'tous les services'}`);

        try {
            // 1. D'abord synchroniser les playlists (si service spécifique)
            if (service && service !== 'all') {
                const syncResponse = await fetch(`/process/sync/${service}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const syncData = await syncResponse.json();
                addNotification('success', `${syncData.tracks_synced} tracks synchronisées depuis ${service}`);
            } else if (service === 'all') {
                // Synchroniser les deux services
                const syncResponse = await fetch('http://127.0.0.1:5000/api/process', { method: 'POST' });
                const syncData = await syncResponse.json();
                addNotification('success', `${syncData.total} tracks synchronisées au total`);
            }

            // 2. Lancer le processing
            const processResponse = await fetch(`/process/${service || 'all'}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ retry_failed: false })
            });

            if (!processResponse.ok) {
                throw new Error('Erreur lors du démarrage du processing');
            }

            // 3. Suivre la progression avec polling
            const interval = setInterval(async () => {
                const statusResponse = await fetch('/process/status');
                const statusData = await statusResponse.json();

                if (!statusData.is_processing) {
                    clearInterval(interval);
                    addNotification('success', 'Processing terminé!');
                    // Recharger les tracks
                    fetchTracks();
                    return;
                }

                // Mettre à jour la progression dans le contexte
                // (À implémenter dans ton contexte AppContext)
                const total = Object.values(statusData.services).reduce(
                    (sum, s) => sum + s.total, 0
                );
                const processed = Object.values(statusData.services).reduce(
                    (sum, s) => sum + s.processed, 0
                );
                const progress = total > 0 ? (processed / total) * 100 : 0;

                updateProcessingProgress(progress, {
                    total,
                    processed,
                    matched: Object.values(statusData.services).reduce(
                        (sum, s) => sum + s.matched, 0
                    ),
                    failed: Object.values(statusData.services).reduce(
                        (sum, s) => sum + s.failed, 0
                    )
                });

            }, 1000);

        } catch (error) {
            addNotification('error', `Erreur: ${error.message}`);
        }
    };
    // --- 8. Constante pour le tri (à ajouter) ---
    const SORTABLE_COLUMNS = {
    status: 'status',
    source: 'source',
    title: 'source_title',
    album: 'discogs_album',
    tags: 'styles',
    date: 'date', // ← Utilise la nouvelle propriété
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <h1 className="text-xl font-bold text-gray-900">Music Processing</h1>
                        <div className="flex items-center space-x-4">
                            {/* Boutons de processing */}
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handleStartProcessing('all')}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Lancer le processing (All)
                                </button>
                                <button
                                    onClick={() => handleStartProcessing('spotify')}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Spotify
                                </button>
                                <button
                                    onClick={() => handleStartProcessing('ytmusic')}
                                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    YouTube Music
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
            {/* Contenu principal */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {activeTab === 'tracks' && (
                    <>
                        {/* Barre de filtres (optionnelle) */}
                        <FilterBar
                            filters={filters}
                            setFilters={setFilters}
                            allTags={allTags}
                        />

                        {/* Affichage des filtres actifs */}
                        {(filters.search || filters.status !== 'all' || filters.tags.length > 0) && (
                            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 mb-4">
                                <span className="font-medium">Filtres actifs:</span>
                                {filters.search && <span className="ml-2">Recherche: "{filters.search}"</span>}
                                {filters.status !== 'all' && <span className="ml-2">Statut: {filters.status}</span>}
                                {filters.tags.length > 0 && <span className="ml-2">Tags: {filters.tags.join(', ')}</span>}
                                {filteredTracks.length < tracks.length && (
                                    <span className="ml-2">({filteredTracks.length} / {tracks.length} tracks)</span>
                                )}
                            </div>
                        )}

                        {/* Tableau des tracks */}
                        <TracksTable
                            tracks={filteredTracks} // ← Tracks filtrés et triés
                            onSelectTrack={handleSelectTrack} // ← Gestion de la sélection
                            sortConfig={sortConfig} // ← Configuration du tri
                            onSort={requestSort} // ← Fonction de tri
                        />

                        {/* Modale de détails */}
                        {selectedTrack && (
                            <TrackDetailsModal
                                track={selectedTrack}
                                onClose={handleCloseModal}
                                onUpdateDiscogs={handleUpdateDiscogs}
                            />
                        )}
                    </>
                )}
                {activeTab === 'stats' && <div>Statistiques à implémenter</div>}
                {activeTab === 'settings' && <div>Paramètres à implémenter</div>}
            </main>

            {/* Barre de statut */}
            <ProcessingStatus />
        </div>
    );
}

export default MainLayout;