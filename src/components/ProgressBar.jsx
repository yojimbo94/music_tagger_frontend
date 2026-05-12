function ProgressBar({ progress, stats }) {
  return (
    <div className="w-full">
      {/* Barre de progression */}
      <div className="h-4 bg-gray-200 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      {/* Statistiques */}
      <div className="flex justify-between text-xs text-gray-600">
        <span>{stats.processed} / {stats.total} traités</span>
        <span className="text-green-600">{stats.matched} ✓</span>
        <span className="text-red-600">{stats.failed} ✗</span>
        <span>{Math.round(progress)}%</span>
      </div>
    </div>
  )
}

export default ProgressBar