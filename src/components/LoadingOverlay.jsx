function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-75 z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
        <p className="text-lg text-gray-700">Chargement en cours...</p>
      </div>
    </div>
  )
}

export default LoadingOverlay