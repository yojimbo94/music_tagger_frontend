import { useState } from 'react'

const SERVICES = [
  { value: 'all', label: 'Tout' },
  { value: 'spotify', label: 'Spotify' },
  { value: 'ytmusic', label: 'YouTube Music' },
]

/**
 * Panneau de lancement du processing : choix de la source et de la config
 * (relance des échecs uniquement pour l'instant, cf. TrackProcessingService).
 */
function ProcessingLauncher({ onLaunch, disabled }) {
  const [service, setService] = useState('all')
  const [retryFailed, setRetryFailed] = useState(false)

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col sm:flex-row sm:items-end gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
        <div className="flex rounded-md border border-gray-300 overflow-hidden">
          {SERVICES.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => setService(s.value)}
              className={`px-3 py-2 text-sm ${service === s.value ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={retryFailed}
          onChange={(e) => setRetryFailed(e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        Réessayer les échecs uniquement (au lieu des titres en attente)
      </label>

      <button
        onClick={() => onLaunch(service, { retryFailed })}
        disabled={disabled}
        className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Lancer le processing
      </button>
    </div>
  )
}

export default ProcessingLauncher
