function RecapRow({ entry }) {
  const stateClass = entry.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'

  return (
    <div className={`flex items-center gap-3 rounded-lg border p-3 ${stateClass}`}>
      <span className={`text-lg ${entry.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
        {entry.isCorrect ? '✓' : '✗'}
      </span>
      {entry.reveal.image && (
        <img
          src={entry.reveal.image}
          alt=""
          className="h-10 w-10 rounded-md object-cover bg-gray-100 flex-shrink-0"
          loading="lazy"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-gray-900">{entry.reveal.title}</div>
        <div className="truncate text-xs text-gray-500">
          {entry.reveal.artist}
          {entry.reveal.year ? ` · ${entry.reveal.year}` : ''}
        </div>
      </div>
      {entry.reveal.url && (
        <a
          href={entry.reveal.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs text-blue-600 font-medium hover:text-blue-700"
        >
          ▶ Écouter
        </a>
      )}
    </div>
  )
}

function MultiplayerLeaderboard({ scoreboard, history, myPid, onExit, onReplay, replaying, error }) {
  return (
    <div className="mx-auto max-w-md space-y-6 py-10">
      <div className="text-center space-y-4">
        <div className="text-5xl">🏆</div>
        <h2 className="text-2xl font-semibold text-gray-900">Partie terminée</h2>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 text-left">{error}</div>
        )}

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

        <div className="flex gap-3 justify-center">
          {onReplay && (
            <button
              onClick={onReplay}
              disabled={replaying}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {replaying ? 'Relance...' : 'Rejouer'}
            </button>
          )}
          <button
            onClick={onExit}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            Quitter la session
          </button>
        </div>
      </div>

      {history?.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">Récapitulatif des manches</div>
          {history.map((entry, i) => (
            <RecapRow key={i} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}

export default MultiplayerLeaderboard
