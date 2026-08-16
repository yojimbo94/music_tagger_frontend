import { useEffect, useState, useCallback, useMemo } from 'react'
import { getAlertStyles, setAlertStyles, getStyles, getStyleCounts } from '../api/client'
import { useApp } from '../context/AppContext'
import TagPicker from './TagPicker'

function SettingsView({ isAdmin }) {
  const [selected, setSelected] = useState([])
  const [allStyles, setAllStyles] = useState([])
  const [styleCounts, setStyleCounts] = useState([])
  const [threshold, setThreshold] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { addNotification } = useApp()

  useEffect(() => {
    Promise.all([getAlertStyles(), getStyles(), getStyleCounts()])
      .then(([alertStyles, styles, counts]) => {
        setSelected(alertStyles)
        setAllStyles(styles)
        setStyleCounts(counts)
      })
      .catch((err) => addNotification('error', `Erreur: ${err.message}`))
      .finally(() => setLoading(false))
  }, [addNotification])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      await setAlertStyles(selected)
      addNotification('success', 'Liste des styles attendus mise à jour')
    } catch (err) {
      addNotification('error', `Erreur: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }, [selected, addNotification])

  const toggleStyle = useCallback((name) => {
    setSelected((prev) => (
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    ))
  }, [])

  // Nombre de styles que le seuil ajouterait (déjà sélectionnés exclus) — affiché
  // à côté du bouton pour donner un retour immédiat avant de cliquer.
  const thresholdMatches = useMemo(() => {
    const min = Number(threshold)
    if (!threshold || Number.isNaN(min)) return []
    return styleCounts.filter((s) => s.count >= min && !selected.includes(s.name))
  }, [threshold, styleCounts, selected])

  const applyThreshold = useCallback(() => {
    if (thresholdMatches.length === 0) return
    setSelected((prev) => [...prev, ...thresholdMatches.map((s) => s.name)])
  }, [thresholdMatches])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-medium text-gray-900 mb-1">Styles attendus (alertes)</h2>
        <p className="text-sm text-gray-600 mb-4">
          {!isAdmin && <span className="text-amber-700">Réservé à l'administrateur — consultation seule.</span>}
        </p>
        <TagPicker
          value={selected}
          onChange={setSelected}
          suggestions={allStyles}
          placeholder="Ajouter un style attendu..."
          disabled={!isAdmin}
        />

        {isAdmin && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
            <label className="text-sm text-gray-700">
              Sélectionner automatiquement les styles avec au moins
            </label>
            <input
              type="number"
              min="1"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="ex: 10"
              className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <label className="text-sm text-gray-700">tracks</label>
            <button
              onClick={applyThreshold}
              disabled={thresholdMatches.length === 0}
              className="ml-auto px-3 py-1.5 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {thresholdMatches.length > 0 ? `Ajouter ${thresholdMatches.length} style(s)` : 'Ajouter'}
            </button>
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !isAdmin}
          title={!isAdmin ? "Réservé à l'administrateur" : undefined}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-medium text-gray-900 mb-1">Styles les plus utilisés</h2>
        <p className="text-sm text-gray-600 mb-4">
          Triés par nombre de tracks en base — {isAdmin ? 'clique sur un style pour l\'ajouter/le retirer des styles attendus ci-dessus.' : 'pour information.'}
        </p>
        {styleCounts.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun style en base pour l'instant.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto flex flex-wrap gap-2 pr-1">
            {styleCounts.map((s) => {
              const isSelected = selected.includes(s.name)
              return (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => isAdmin && toggleStyle(s.name)}
                  disabled={!isAdmin}
                  title={isAdmin ? (isSelected ? 'Retirer des styles attendus' : 'Ajouter aux styles attendus') : undefined}
                  className={`flex items-center gap-1.5 rounded-full pl-2.5 pr-1.5 py-1 text-xs border transition-colors ${
                    isSelected
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  } ${!isAdmin ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <span>{s.name}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                    {s.count}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default SettingsView
