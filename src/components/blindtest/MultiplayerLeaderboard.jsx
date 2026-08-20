function MultiplayerLeaderboard({ scoreboard, myPid, onExit }) {
  return (
    <div className="mx-auto max-w-md space-y-6 py-10 text-center">
      <div className="text-5xl">🏆</div>
      <h2 className="text-2xl font-semibold text-gray-900">Partie terminée</h2>

      <div className="space-y-2 text-left">
        {(scoreboard || []).map((p, i) => (
          <div
            key={p.pid}
            className={`flex items-center justify-between rounded-lg border p-3 ${
              p.pid === myPid ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
            }`}
          >
            <span className="font-medium text-gray-900">
              {i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : `${i + 1}. `}
              {p.nickname}{p.pid === myPid ? ' (toi)' : ''}
            </span>
            <span className="text-blue-600 font-semibold">{p.score}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onExit}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        Quitter la session
      </button>
    </div>
  )
}

export default MultiplayerLeaderboard
