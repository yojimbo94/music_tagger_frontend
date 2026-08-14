// Client API centralisé : une seule source de vérité pour l'URL du serveur Flask
// et pour la forme de chaque appel. Évite les URLs relatives qui tapaient le port
// Vite au lieu du port Flask (bug historique dans MainLayout/TrackDetailsModal).
export const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  })

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await response.json() : null

  if (!response.ok) {
    throw new Error(data?.error || `HTTP ${response.status}`)
  }
  return data
}

// --- Tracks ---
export function getTracks(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ).toString()
  return request(`/api/tracks${qs ? `?${qs}` : ''}`)
}

export function getTrack(source, sourceTrackId) {
  return request(`/api/tracks/${source}/${sourceTrackId}`)
}

export function updateTrackDiscogs(source, sourceTrackId, discogsUrl) {
  return request(`/api/tracks/${source}/${sourceTrackId}`, {
    method: 'PUT',
    body: JSON.stringify({ discogs_url: discogsUrl })
  })
}

export function setManualTags(source, sourceTrackId, { styles = [], genres = [] }) {
  return request(`/api/tracks/${source}/${sourceTrackId}/tags`, {
    method: 'PUT',
    body: JSON.stringify({ styles, genres })
  })
}

export function deleteTrack(source, sourceTrackId) {
  return request(`/api/tracks/${source}/${sourceTrackId}`, { method: 'DELETE' })
}

// --- Stats / référentiels ---
export function getStats() {
  return request('/api/stats')
}

export function getStyles() {
  return request('/api/styles').then((d) => d.styles || [])
}

export function getGenres() {
  return request('/api/genres').then((d) => d.genres || [])
}

// --- Alertes ---
export function getAlertStyles() {
  return request('/api/settings/alert-styles').then((d) => d.styles || [])
}

export function setAlertStyles(styles) {
  return request('/api/settings/alert-styles', {
    method: 'PUT',
    body: JSON.stringify({ styles })
  })
}

// --- Playlists ---
export function getPlaylists(source) {
  return request(`/process/playlists?source=${source}`)
}

// --- Processing ---
export function startProcessing(service = 'all', { retryFailed = false } = {}) {
  return request(`/process/${service}`, {
    method: 'POST',
    body: JSON.stringify({ retry_failed: retryFailed })
  })
}

export function getProcessingStatus() {
  return request('/process/status')
}

export function stopProcessing() {
  return request('/process/stop', { method: 'POST' })
}

// --- Blind test ---
export function getBlindTestConfig() {
  return request('/api/blindtest/config')
}

export function startBlindTestRound(config) {
  return request('/api/blindtest/round', {
    method: 'POST',
    body: JSON.stringify(config)
  })
}
