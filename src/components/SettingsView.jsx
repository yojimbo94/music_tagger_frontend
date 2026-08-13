import { useEffect, useState, useCallback } from 'react'
import { getAlertStyles, setAlertStyles, getStyles } from '../api/client'
import { useApp } from '../context/AppContext'
import TagPicker from './TagPicker'

function SettingsView() {
  const [selected, setSelected] = useState([])
  const [allStyles, setAllStyles] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { addNotification } = useApp()

  useEffect(() => {
    Promise.all([getAlertStyles(), getStyles()])
      .then(([alertStyles, styles]) => {
        setSelected(alertStyles)
        setAllStyles(styles)
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
        </p>
        <TagPicker
          value={selected}
          onChange={setSelected}
          suggestions={allStyles}
          placeholder="Ajouter un style attendu..."
        />
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}

export default SettingsView
