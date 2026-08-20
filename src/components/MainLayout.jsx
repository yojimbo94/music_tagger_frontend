import { useState, useEffect, useCallback, useMemo, useDeferredValue } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useProcessingSocket } from '../hooks/useProcessingSocket';
import { getTracks, startProcessing as apiStartProcessing } from '../api/client';
import TracksTable from './TracksTable';
import TrackDetailsModal from './TrackDetailsModal';
import ProcessingStatus from './ProcessingStatus';
import ProcessingLauncher from './ProcessingLauncher';
import FilterBar from './FilterBar';
import SettingsView from './SettingsView';
import BlindTestView from './BlindTestView';
import HistoryView from './HistoryView';
import PlaylistsView from './PlaylistsView';
import { LogOut } from 'lucide-react';

const TABS = [
    { key: 'tracks', label: 'Tracks' },
    { key: 'history', label: 'Historique' },
    { key: 'playlists', label: 'Playlists' },
    { key: 'settings', label: 'Paramètres' },
    { key: 'blindtest', label: 'Blind test' },
];

function MainLayout() {
    const [activeTab, setActiveTab] = useState('tracks');
    const [tracks, setTracks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTrack, setSelectedTrack] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
    const [filters, setFilters] = useState({ search: '', status: 'all', tags: [], alertsOnly: false });
    const [allTags, setAllTags] = useState([]);

    const {
        startProcessing,
        addNotification,
        setIsLoading,
        handleProcessingStarted,
        handleProcessingProgress,
        handleProcessingDone
    } = useApp();

    const { logout, isAdmin } = useAuth();

    // --- Suivi temps réel du processing (Socket.IO) ---
    useProcessingSocket({
        onStarted: handleProcessingStarted,
        onProgress: handleProcessingProgress,
        onDone: (payload) => {
            handleProcessingDone(payload);
            if (payload.total > 0) {
                addNotification('success', 'Processing terminé !');
                fetchTracks();
            }
        },
        onError: (payload) => {
            addNotification('error', `Processing (${payload.source}) impossible : ${payload.message}`, 10000);
        }
    });

    // --- Récupération des tracks ---
    const fetchTracks = useCallback(async () => {
        try {
            setIsLoading(true);
            setLoading(true);
            const data = await getTracks();
            const nextTracks = (data.tracks || []).map(track => ({
                ...track,
                date: track.created_at ? new Date(track.created_at).getTime() : null
            }));
            setTracks(nextTracks);

            const tagsSet = new Set();
            nextTracks.forEach(track => {
                track.styles?.forEach(tag => tagsSet.add(tag));
                track.genres?.forEach(tag => tagsSet.add(tag));
            });
            setAllTags(Array.from(tagsSet));
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

    // --- Tri ---
    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedTracks = useMemo(() => {
        if (!sortConfig.key) return tracks;
        return [...tracks].sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (sortConfig.key === 'date') {
                const aDate = aValue || 0;
                const bDate = bValue || 0;
                return sortConfig.direction === 'asc' ? aDate - bDate : bDate - aDate;
            }

            const strA = (aValue || '').toString().toLowerCase();
            const strB = (bValue || '').toString().toLowerCase();
            if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [tracks, sortConfig]);

    // --- Filtrage ---
    // La recherche texte est différée (useDeferredValue) : la frappe met à jour
    // `filters.search`/l'input instantanément, mais le filtrage des ~3700 tracks
    // (coûteux à chaque caractère) tourne sur une valeur "en retard d'une frame",
    // React le priorise en dessous de l'input pour que la saisie reste fluide.
    const deferredSearch = useDeferredValue(filters.search);

    const filteredTracks = useMemo(() => {
        const searchLower = deferredSearch.trim().toLowerCase();
        return sortedTracks.filter(track => {
            if (filters.status !== 'all' && track.status !== filters.status) return false;
            if (filters.alertsOnly && !track.has_alert) return false;
            if (searchLower) {
                const searchableText = [
                    track.source_title,
                    track.source_artist,
                    track.discogs_album,
                    track.discogs_artist,
                    track.discogs_track_artist,
                    track.source,
                    track.source_album,
                ].filter(Boolean).join(' ').toLowerCase();
                if (!searchableText.includes(searchLower)) return false;
            }
            if (filters.tags.length > 0) {
                const trackTags = [...(track.styles || []), ...(track.genres || [])];
                if (!filters.tags.some(tag => trackTags.includes(tag))) return false;
            }
            return true;
        });
    }, [sortedTracks, filters.status, filters.alertsOnly, filters.tags, deferredSearch]);

    // --- Modale ---
    const handleSelectTrack = useCallback((track) => {
        setSelectedTrack(track);
    }, []);

    const handleCloseModal = useCallback(() => {
        setSelectedTrack(null);
    }, []);

    // Callback partagé par la modale (match Discogs OU tag manuel) : la track renvoyée
    // par l'API fait foi, on met juste à jour l'état local sans tout recharger.
    const handleTrackUpdated = useCallback((updatedTrack) => {
        if (!updatedTrack) return;
        setTracks(prev => prev.map(t =>
            t.source === updatedTrack.source && t.source_track_id === updatedTrack.source_track_id
                ? { ...t, ...updatedTrack, date: updatedTrack.created_at ? new Date(updatedTrack.created_at).getTime() : t.date }
                : t
        ));
    }, []);

    const handleTrackDeleted = useCallback((deletedTrack) => {
        setTracks(prev => prev.filter(t =>
            !(t.source === deletedTrack.source && t.source_track_id === deletedTrack.source_track_id)
        ));
    }, []);

    const handleStartProcessing = async (service, { retryFailed = false } = {}) => {
        startProcessing(service);
        try {
            await apiStartProcessing(service, { retryFailed });
            addNotification('info', `Démarrage du processing pour ${service === 'all' ? 'tous les services' : service}`);
        } catch (error) {
            addNotification('error', `Erreur: ${error.message}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-14 sm:h-16">
                        <div className="flex items-center gap-2 min-w-0">
                            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Music Processing</h1>
                            {!isAdmin && (
                                <span
                                    className="shrink-0 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-full"
                                    title="Consultation uniquement : les actions de modification sont désactivées"
                                >
                                    Visiteur
                                </span>
                            )}
                        </div>
                        <button
                            onClick={logout}
                            className="ml-4 shrink-0 grid place-items-center h-10 w-10 sm:h-auto sm:w-auto sm:px-3 sm:py-2 text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                            title="Se déconnecter"
                        >
                            <LogOut className="h-5 w-5 sm:hidden" />
                            <span className="hidden sm:inline">Déconnexion</span>
                        </button>
                    </div>
                    {/* Onglets : sur mobile ça déborde vite (4 onglets + titre + logout sur
                        une ligne), on les fait défiler horizontalement sur leur propre ligne
                        plutôt que de les laisser se tasser ou passer à la ligne. */}
                    <nav className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1 sm:pb-3">
                        {TABS.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`shrink-0 whitespace-nowrap px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                    activeTab === tab.key
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
                {activeTab === 'tracks' && (
                    <>
                        <ProcessingLauncher onLaunch={handleStartProcessing} disabled={!isAdmin} />

                        <FilterBar
                            filters={filters}
                            setFilters={setFilters}
                            allTags={allTags}
                        />

                        {(filters.search || filters.status !== 'all' || filters.tags.length > 0 || filters.alertsOnly) && (
                            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                                <span className="font-medium">Filtres actifs:</span>
                                {filters.search && <span className="ml-2">Recherche: "{filters.search}"</span>}
                                {filters.status !== 'all' && <span className="ml-2">Statut: {filters.status}</span>}
                                {filters.tags.length > 0 && <span className="ml-2">Tags: {filters.tags.join(', ')}</span>}
                                {filters.alertsOnly && <span className="ml-2">⚠️ Alertes uniquement</span>}
                                {filteredTracks.length < tracks.length && (
                                    <span className="ml-2">({filteredTracks.length} / {tracks.length} tracks)</span>
                                )}
                            </div>
                        )}

                        {loading ? (
                            <div className="flex justify-center items-center h-64">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                            </div>
                        ) : error ? (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                                Erreur: {error}
                            </div>
                        ) : (
                            <TracksTable
                                tracks={filteredTracks}
                                onSelectTrack={handleSelectTrack}
                                sortConfig={sortConfig}
                                onSort={requestSort}
                            />
                        )}

                        {selectedTrack && (
                            <TrackDetailsModal
                                track={selectedTrack}
                                onClose={handleCloseModal}
                                onUpdateDiscogs={handleTrackUpdated}
                                onDeleted={handleTrackDeleted}
                                isAdmin={isAdmin}
                            />
                        )}
                    </>
                )}
                {activeTab === 'history' && <HistoryView isAdmin={isAdmin} />}
                {activeTab === 'playlists' && <PlaylistsView isAdmin={isAdmin} />}
                {activeTab === 'settings' && <SettingsView isAdmin={isAdmin} />}
                {activeTab === 'blindtest' && <BlindTestView />}
            </main>

            <ProcessingStatus />
        </div>
    );
}

export default MainLayout;
