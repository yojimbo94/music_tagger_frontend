// Client API centralisé : une seule source de vérité pour l'URL du serveur Flask
// et pour la forme de chaque appel. Évite les URLs relatives qui tapaient le port
// Vite au lieu du port Flask (bug historique dans MainLayout/TrackDetailsModal).
export const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'

const ACCESS_TOKEN_KEY = 'tagger_access_token'
const REFRESH_TOKEN_KEY = 'tagger_refresh_token'
const ROLE_KEY = 'tagger_role'

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function isAuthenticated() {
  return !!getRefreshToken()
}

// Rôle du compte connecté ("admin" ou "visitor"), fixé au login (cf. routes/auth.py
// côté serveur, qui l'embarque comme claim JWT) et inchangé pour toute la session —
// /auth/refresh ne renvoie qu'un nouvel access token, pas de rôle à remettre à jour.
export function getRole() {
  return localStorage.getItem(ROLE_KEY)
}

function setTokens({ access_token, refresh_token, role } = {}) {
  if (access_token) localStorage.setItem(ACCESS_TOKEN_KEY, access_token)
  if (refresh_token) localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token)
  if (role) localStorage.setItem(ROLE_KEY, role)
}

function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(ROLE_KEY)
}

// Callback branché par AuthContext : appelé quand la session ne peut plus être
// maintenue (refresh token absent/expiré) pour ramener l'appli sur l'écran de login.
let onAuthExpired = () => {}
export function setOnAuthExpired(handler) {
  onAuthExpired = handler
}

async function rawRequest(path, options) {
  const token = getAccessToken()
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  })
  const isJson = response.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await response.json() : null
  return { response, data }
}

// Un seul refresh en vol à la fois même si plusieurs requêtes 401 en parallèle.
let refreshPromise = null
function refreshAccessToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return Promise.resolve(false)

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${refreshToken}` }
    })
      .then(async (res) => {
        if (!res.ok) return false
        const data = await res.json()
        setTokens(data)
        return true
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

async function request(path, options = {}, { isRetry = false } = {}) {
  const { response, data } = await rawRequest(path, options)

  if (response.status === 401 && !isRetry && path !== '/auth/login') {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      return request(path, options, { isRetry: true })
    }
    clearTokens()
    onAuthExpired()
    throw new Error('Session expirée, merci de vous reconnecter')
  }

  if (!response.ok) {
    throw new Error(data?.error || `HTTP ${response.status}`)
  }
  return data
}

// --- Auth ---
export async function login(username, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  })
  setTokens(data)
  return data
}

export function logout() {
  clearTokens()
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

export function resetTrack(source, sourceTrackId) {
  return request(`/api/tracks/${source}/${sourceTrackId}/reset`, { method: 'POST' })
}

// --- Stats / référentiels ---
export function getStats() {
  return request('/api/stats')
}

// --- Historique des runs de processing (cron + manuel) ---
export function getProcessingRuns(limit = 20) {
  return request(`/api/processing/runs?limit=${limit}`).then((d) => d.runs || [])
}

export function getProcessingRunTracks(runId) {
  return request(`/api/processing/runs/${runId}/tracks`).then((d) => d.tracks || [])
}

export function getStyles() {
  return request('/api/styles').then((d) => d.styles || [])
}

// Styles triés par nombre de tracks (du plus fréquent au moins fréquent) —
// aide à repérer les styles importants pour la liste des styles attendus.
export function getStyleCounts() {
  return request('/api/styles/counts').then((d) => d.styles || [])
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

// --- Playlists gérées (styles simples ou combinés) ---
export function getManagedPlaylists(source) {
  return request(`/api/playlists?source=${source}`).then((d) => d.playlists || [])
}

export function importLegacyPlaylists(source) {
  return request('/api/playlists/import', {
    method: 'POST',
    body: JSON.stringify({ source })
  })
}

export function previewPlaylist(source, styles) {
  return request('/api/playlists/preview', {
    method: 'POST',
    body: JSON.stringify({ source, styles })
  })
}

export function createPlaylist(source, name, styles) {
  return request('/api/playlists', {
    method: 'POST',
    body: JSON.stringify({ source, name, styles })
  })
}

export function setPlaylistActive(playlistId, active) {
  return request(`/api/playlists/${playlistId}`, {
    method: 'PATCH',
    body: JSON.stringify({ active })
  })
}

export function deletePlaylist(playlistId, deleteExternal = false) {
  return request(`/api/playlists/${playlistId}?delete_external=${deleteExternal}`, {
    method: 'DELETE'
  })
}

export function getPlaylistSync(playlistId) {
  return request(`/api/playlists/${playlistId}/sync`)
}

export function reconcilePlaylist(playlistId) {
  return request(`/api/playlists/${playlistId}/reconcile`, { method: 'POST' })
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

export function submitBlindTestAnswers(mode, answers) {
  return request('/api/blindtest/answers', {
    method: 'POST',
    body: JSON.stringify({ mode, answers })
  })
}

export function getBlindTestStats(mode) {
  const query = mode ? `?mode=${encodeURIComponent(mode)}` : ''
  return request(`/api/blindtest/stats${query}`)
}

export function getBlindTestTrackStats(tracks) {
  return request('/api/blindtest/stats/tracks', {
    method: 'POST',
    body: JSON.stringify({ tracks })
  })
}

// --- Blind test : playlists externes (sans Discogs, hors stats) ---
export function resolveExternalPlaylist(url) {
  return request('/api/blindtest/external/resolve', {
    method: 'POST',
    body: JSON.stringify({ url })
  })
}

export function getCachedExternalPlaylists() {
  return request('/api/blindtest/external/playlists')
}

export function getCachedExternalTracks(playlistIds) {
  const query = playlistIds?.length ? `?playlist_ids=${playlistIds.join(',')}` : ''
  return request(`/api/blindtest/external/cached${query}`)
}

export function startExternalBlindTestRound(payload) {
  return request('/api/blindtest/external/round', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}
