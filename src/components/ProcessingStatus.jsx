import { useApp } from '../context/AppContext'
import ProgressBar from './ProgressBar'

const RESULT_META = {
  matched: { icon: '✓', className: 'text-green-600' },
  failed: { icon: '✗', className: 'text-red-600' },
}

function ProcessingStatus() {
  const {
    isProcessing,
    processingProgress,
    processingService,
    processingStats,
    processingLog,
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
            Masquer
          </button>
        </div>

        <ProgressBar
          progress={processingProgress}
          stats={processingStats}
        />

        {processingLog.length > 0 && (
          <div className="mt-3 max-h-24 overflow-y-auto text-xs text-gray-600 space-y-0.5">
            {processingLog.map((entry, i) => {
              const meta = RESULT_META[entry.result] || { icon: '…', className: 'text-gray-400' }
              return (
                <div key={`${entry.at}-${i}`} className="flex items-center gap-2">
                  <span className={meta.className}>{meta.icon}</span>
                  <span className="truncate">{entry.title} — {entry.artist}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default ProcessingStatus
