import { useEffect, useState } from 'react'
import { getBlindTestConfig } from '../api/client'

/**
 * Squelette : valide juste que l'API répond. La logique de jeu (sélection de style,
 * nombre de choix, etc.) viendra plus tard.
 */
function BlindTestView() {
  const [config, setConfig] = useState(null)

  useEffect(() => {
    getBlindTestConfig().then(setConfig).catch(() => {})
  }, [])

  return (
    <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
      <div className="text-4xl mb-3">🎧</div>
      <h2 className="text-lg font-medium text-gray-900">Blind test — bientôt disponible</h2>
      <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">
        Sélection de styles, nombre de choix, sources incluses... la configuration du blind test
        arrivera dans une prochaine itération.
      </p>
      {config && (
        <p className="mt-4 text-xs text-gray-400">
          {config.available_styles?.length || 0} styles disponibles côté serveur.
        </p>
      )}
    </div>
  )
}

export default BlindTestView
