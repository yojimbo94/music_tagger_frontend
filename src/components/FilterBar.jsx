import { useState } from 'react'
import Tag from './Tag'

function FilterBar({ filters, setFilters, allTags }) {
  const [showTagDropdown, setShowTagDropdown] = useState(false)

  const handleSearchChange = (e) => {
    setFilters({ ...filters, search: e.target.value })
  }

  const handleStatusChange = (status) => {
    setFilters({ ...filters, status })
  }

  const toggleTag = (tag) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag]
    setFilters({ ...filters, tags: newTags })
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Recherche textuelle */}
        <div className="flex-1">
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Rechercher
          </label>
          <input
            id="search"
            type="text"
            value={filters.search}
            onChange={handleSearchChange}
            placeholder="Rechercher par titre, artiste, album..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filtre par statut */}
        <div className="flex-shrink-0">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Statut
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous</option>
            <option value="matched">Matchés</option>
            <option value="failed">Échoués</option>
          </select>
        </div>

        {/* Filtre par tags */}
        <div className="flex-shrink-0 relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags
          </label>
          <button
            onClick={() => setShowTagDropdown(!showTagDropdown)}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          >
            {filters.tags.length > 0 
              ? `${filters.tags.length} tag(s) sélectionné(s)` 
              : 'Filtrer par tags'}
          </button>
          
          {showTagDropdown && (
            <div className="absolute z-10 mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-2 w-48 max-h-60 overflow-y-auto">
              <div className="space-y-2">
                {allTags.map((tag) => (
                  <div key={tag} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`tag-${tag}`}
                      checked={filters.tags.includes(tag)}
                      onChange={() => toggleTag(tag)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label 
                      htmlFor={`tag-${tag}`}
                      className="ml-2 text-sm text-gray-700 cursor-pointer"
                    >
                      <Tag tag={tag} />
                    </label>
                  </div>
                ))}
              </div>
              {filters.tags.length > 0 && (
                <button
                  onClick={() => setFilters({ ...filters, tags: [] })}
                  className="mt-2 w-full text-sm text-red-600 hover:text-red-800"
                >
                  Effacer tous les tags
                </button>
              )}
            </div>
          )}
          
          {/* Tags sélectionnés */}
          {filters.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {filters.tags.map((tag) => (
                <div 
                  key={tag}
                  className="flex items-center bg-blue-100 rounded-full px-2 py-1"
                >
                  <Tag tag={tag} />
                  <button
                    onClick={() => toggleTag(tag)}
                    className="ml-1 text-blue-600 hover:text-blue-800 text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bouton pour effacer tous les filtres */}
        {(filters.search || filters.status !== 'all' || filters.tags.length > 0) && (
          <div className="flex-shrink-0 flex items-end">
            <button
              onClick={() => setFilters({
                search: '',
                status: 'all',
                tags: []
              })}
              className="text-gray-600 hover:text-gray-800 text-sm underline"
            >
              Effacer tout
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default FilterBar
