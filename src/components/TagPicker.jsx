import { useMemo, useState } from 'react'
import Tag from './Tag'

/**
 * Multi-select à autocomplete sur une liste de suggestions (styles/genres connus),
 * avec possibilité de créer une valeur qui n'existe pas encore.
 * Réutilisé pour le tag manuel (TrackDetailsModal) et la liste d'alertes (SettingsView).
 */
function TagPicker({ value, onChange, suggestions = [], placeholder = 'Ajouter un tag...' }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const filteredSuggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    return suggestions
      .filter(s => !value.includes(s))
      .filter(s => !q || s.toLowerCase().includes(q))
      .slice(0, 20)
  }, [suggestions, value, query])

  const addTag = (tag) => {
    const clean = tag.trim()
    if (!clean || value.includes(clean)) return
    onChange([...value, clean])
    setQuery('')
    setOpen(false)
  }

  const removeTag = (tag) => onChange(value.filter(t => t !== tag))

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1 mb-2">
        {value.map(tag => (
          <div key={tag} className="flex items-center bg-blue-100 rounded-full pl-2 pr-1 py-0.5">
            <Tag tag={tag} />
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 text-blue-600 hover:text-blue-800 text-xs"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            addTag(query)
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {open && (query || filteredSuggestions.length > 0) && (
        <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-300 rounded-md shadow-lg">
          {filteredSuggestions.map(s => (
            <button
              type="button"
              key={s}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(s)}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100"
            >
              {s}
            </button>
          ))}
          {query.trim() && !suggestions.includes(query.trim()) && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(query)}
              className="w-full text-left px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 border-t border-gray-100"
            >
              Créer "{query.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default TagPicker
