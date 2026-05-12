import { useState } from 'react'
import { useApp } from '../context/AppContext'
import TrackList from './TrackList'
import ProcessingStatus from './ProcessingStatus'

function MainLayout() {
    const [activeTab, setActiveTab] = useState('tracks')
    const { startProcessing, addNotification } = useApp()

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
                const syncResponse = await fetch('/process/sync/all', { method: 'POST' });
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

    // Simulation du processing pour démo
    const simulateProcessing = async (service) => {
        const total = service ? 50 : 100
        let processed = 0

        while (processed < total) {
            await new Promise(resolve => setTimeout(resolve, 100))
            processed += Math.floor(Math.random() * 5) + 1
            // Mettre à jour la progression via le contexte
            // En vrai, ces données viendraient de l'API
            const progress = Math.min((processed / total) * 100, 100)
            const matched = processed - Math.floor(processed * 0.1) // 90% de succès
            const failed = processed - matched

            // Ici tu mettras à jour le contexte avec les vraies données de l'API
            // updateProcessingProgress(progress, { total, processed, matched, failed })
        }
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
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

            {/* Onglets */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('tracks')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'tracks' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                            Tracks
                        </button>
                        <button
                            onClick={() => setActiveTab('stats')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'stats' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                            Statistiques
                        </button>
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'settings' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                            Paramètres
                        </button>
                    </nav>
                </div>
            </div>

            {/* Contenu principal */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {activeTab === 'tracks' && <TrackList />}
                {activeTab === 'stats' && <div>Statistiques à implémenter</div>}
                {activeTab === 'settings' && <div>Paramètres à implémenter</div>}
            </main>

            {/* Barre de statut de processing */}
            <ProcessingStatus />
        </div>
    )
}

export default MainLayout
