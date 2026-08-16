import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'

const MAX_RESULTS = 8

function normalize(str) {
  return (str || '').toLowerCase()
}

/**
 * Mode "search" du blind test : recherche libre dans le pool de la manche
 * (title/artist/pochette) au lieu d'un choix multiple. Le pool entier est déjà
 * côté client (envoyé une fois par la manche, cf. BlindTestView) donc le filtrage
 * est instantané, pas d'appel réseau par frappe.
 */
function SearchAnswer({ pool, disabled, onSelect }) {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const q = normalize(query).trim()
    if (!q) return []
    return pool
      .filter((entry) => normalize(entry.title).includes(q) || normalize(entry.artist).includes(q))
      .slice(0, MAX_RESULTS)
  }, [pool, query])

  return (
    <div className="max-w-lg mx-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled}
          placeholder="Rechercher un titre ou un artiste..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
          autoFocus
        />
      </div>

      {results.length > 0 && (
        <div className="mt-2 rounded-md border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden shadow-sm">
          {results.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => onSelect(entry.id)}
              disabled={disabled}
              className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 disabled:cursor-not-allowed transition-colors"
            >
              {entry.image && (
                <img
                  src={entry.image}
                  alt=""
                  className="h-9 w-9 rounded object-cover bg-gray-100 flex-shrink-0"
                  loading="lazy"
                />
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-gray-900">{entry.title}</div>
                <div className="truncate text-xs text-gray-500">{entry.artist}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default SearchAnswer
