import { useApp } from '../context/AppContext'
import ProgressBar from './ProgressBar'

function ProcessingStatus() {
  const { 
    isProcessing, 
    processingProgress, 
    processingService,
    processingStats,
    stopProcessing 
  } = useApp()

  if (!isProcessing) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="font-medium">
              Processing en cours pour : <strong>{processingService || 'tous les services'}</strong>
            </span>
          </div>
          <button
            onClick={stopProcessing}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            Annuler
          </button>
        </div>
        
        {/* Barre de progression */}
        <ProgressBar 
          progress={processingProgress} 
          stats={processingStats}
        />
      </div>
    </div>
  )
}

export default ProcessingStatus
