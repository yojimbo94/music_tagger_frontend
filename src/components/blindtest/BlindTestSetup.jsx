import { useEffect, useState } from 'react'
import { getBlindTestConfig } from '../../api/client'
import TagPicker from '../TagPicker'

const SOURCES = [
  { value: 'spotify', label: 'Spotify' },
  { value: 'ytmusic', label: 'YouTube Music' },
]

const INFO_FIELDS = [
  { value: 'title', label: 'Titre' },
  { value: 'artist', label: 'Artiste' },
  { value: 'album', label: 'Album' },
]

const DEFAULT_SETTINGS = {
  sources: ['spotify', 'ytmusic'],
  styles: [],
  genres: [],
  mode: 'track',
  questionCount: 10,
  choicesCount: 4,
  infoFields: ['title', 'artist'],
  showCover: false,
  blurredCoverHint: false,
  maxResponseSeconds: 15,
  volume: 70,
}

function SectionLabel({ children }) {
  return <div className="text-sm font-medium text-gray-700 mb-2">{children}</div>
}

function BlindTestSetup({ onStart, starting, error }) {
  const [availableStyles, setAvailableStyles] = useState([])
  const [availableGenres, setAvailableGenres] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)

  useEffect(() => {
    getBlindTestConfig().then((cfg) => {
      setAvailableStyles(cfg.available_styles || [])
      setAvailableGenres(cfg.available_genres || [])
    }).catch(() => {})
  }, [])

  const toggleSource = (value) => {
    setSettings((s) => {
      const has = s.sources.includes(value)
      const next = has ? s.sources.filter((v) => v !== value) : [...s.sources, value]
      return { ...s, sources: next.length > 0 ? next : s.sources }
    })
  }

  const toggleInfoField = (value) => {
    setSettings((s) => {
      const has = s.infoFields.includes(value)
      const next = has ? s.infoFields.filter((v) => v !== value) : [...s.infoFields, value]
      return { ...s, infoFields: next.length > 0 ? next : s.infoFields }
    })
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-2">🎧</div>
        <h2 className="text-xl font-semibold text-gray-900">Blind test</h2>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-6">
        {/* Sources */}
        <div>
          <SectionLabel>Sources</SectionLabel>
          <div className="flex gap-2">
            {SOURCES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => toggleSource(s.value)}
                className={`px-3 py-2 rounded-md border text-sm transition-colors ${
                  settings.sources.includes(s.value)
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Styles */}
        <div>
          <SectionLabel>Styles (vide = tous)</SectionLabel>
          <TagPicker
            value={settings.styles}
            onChange={(styles) => setSettings((s) => ({ ...s, styles }))}
            suggestions={availableStyles}
            placeholder="Ajouter un style..."
          />
        </div>

        {/* Genres */}
        <div>
          <SectionLabel>Genres (vide = tous)</SectionLabel>
          <TagPicker
            value={settings.genres}
            onChange={(genres) => setSettings((s) => ({ ...s, genres }))}
            suggestions={availableGenres}
            placeholder="Ajouter un genre..."
          />
        </div>

        {/* Mode */}
        <div>
          <SectionLabel>Mode de jeu</SectionLabel>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSettings((s) => ({ ...s, mode: 'track' }))}
              className={`flex-1 px-3 py-2 rounded-md border text-sm transition-colors ${
                settings.mode === 'track'
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Deviner le titre
            </button>
            <button
              type="button"
              onClick={() => setSettings((s) => ({ ...s, mode: 'search' }))}
              className={`flex-1 px-3 py-2 rounded-md border text-sm transition-colors ${
                settings.mode === 'search'
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Rechercher le titre
            </button>
            <button
              type="button"
              onClick={() => setSettings((s) => ({ ...s, mode: 'year' }))}
              className={`flex-1 px-3 py-2 rounded-md border text-sm transition-colors ${
                settings.mode === 'year'
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Deviner l'année de sortie
            </button>
          </div>
        </div>

        {/* Indice pochette floutée (mode search uniquement) */}
        {settings.mode === 'search' && (
          <div>
            <SectionLabel>Facilité</SectionLabel>
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-300 text-sm text-gray-600 cursor-pointer hover:bg-gray-50 w-fit">
              <input
                type="checkbox"
                checked={settings.blurredCoverHint}
                onChange={(e) => setSettings((s) => ({ ...s, blurredCoverHint: e.target.checked }))}
                className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              Pochette floutée
            </label>
          </div>
        )}

        {/* Infos affichées dans les choix (mode track uniquement) */}
        {settings.mode === 'track' && (
          <div>
            <SectionLabel>Informations affichées dans les choix</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {INFO_FIELDS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => toggleInfoField(f.value)}
                  className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                    settings.infoFields.includes(f.value)
                      ? 'bg-blue-100 border-blue-300 text-blue-800'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-300 text-sm text-gray-600 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={settings.showCover}
                  onChange={(e) => setSettings((s) => ({ ...s, showCover: e.target.checked }))}
                  className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                Pochette
              </label>
            </div>
          </div>
        )}

        {/* Réglages numériques */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de manches</label>
            <input
              type="number"
              min={1}
              max={100}
              value={settings.questionCount}
              onChange={(e) => setSettings((s) => ({ ...s, questionCount: Number(e.target.value) || 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {settings.mode !== 'search' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de choix</label>
              <input
                type="number"
                min={2}
                max={8}
                value={settings.choicesCount}
                onChange={(e) => setSettings((s) => ({ ...s, choicesCount: Number(e.target.value) || 2 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Temps de réponse max (secondes, 0 = illimité)
            </label>
            <input
              type="number"
              min={0}
              max={120}
              value={settings.maxResponseSeconds}
              onChange={(e) => setSettings((s) => ({ ...s, maxResponseSeconds: Number(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Volume */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Volume ({settings.volume}%)
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={settings.volume}
            onChange={(e) => setSettings((s) => ({ ...s, volume: Number(e.target.value) }))}
            className="w-full accent-blue-600"
          />
        </div>

        <button
          onClick={() => onStart(settings)}
          disabled={starting}
          className="w-full py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {starting ? 'Préparation...' : 'Démarrer le blind test'}
        </button>
      </div>
    </div>
  )
}

export default BlindTestSetup
