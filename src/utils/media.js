// Extraction d'IDs Spotify/YouTube depuis une URL ou un ID brut (les deux se
// retrouvent en base selon le champ : source_track_id est déjà un ID brut la
// plupart du temps, mais on accepte aussi une URL complète par robustesse).
// Partagé entre TrackDetailsModal (lecteur d'aperçu) et le blind test (lecteur caché).

export function extractYouTubeVideoId(value) {
  if (!value) return null
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value
  try {
    const url = new URL(value)
    const watchId = url.searchParams.get('v')
    if (watchId) return watchId
    if (url.hostname.includes('youtu.be')) {
      return url.pathname.split('/').filter(Boolean)[0] || null
    }
    const shortsMatch = url.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/)
    if (shortsMatch) return shortsMatch[1]
    const embedMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/)
    if (embedMatch) return embedMatch[1]
  } catch {
    const match = value.match(/([a-zA-Z0-9_-]{11})/)
    return match ? match[1] : null
  }
  return null
}

export function extractSpotifyTrackId(value) {
  if (!value) return null
  if (/^[a-zA-Z0-9]{22}$/.test(value)) return value
  try {
    const url = new URL(value)
    const trackMatch = url.pathname.match(/\/track\/([a-zA-Z0-9]{22})/)
    if (trackMatch) return trackMatch[1]
    const embedMatch = url.pathname.match(/\/embed\/track\/([a-zA-Z0-9]{22})/)
    if (embedMatch) return embedMatch[1]
  } catch {
    const match = value.match(/([a-zA-Z0-9]{22})/)
    return match ? match[1] : null
  }
  return null
}

const YOUTUBE_SOURCES = new Set(['youtube', 'yt', 'ytmusic', 'youtube music'])

/**
 * Normalise un couple (source, id_ou_url) en { type: 'spotify'|'youtube', id }.
 * Retourne null si l'id n'a pas pu être extrait.
 */
export function resolvePlaybackId(source, rawId) {
  const normalizedSource = (source || '').toLowerCase()
  if (normalizedSource === 'spotify') {
    const id = extractSpotifyTrackId(rawId)
    return id ? { type: 'spotify', id } : null
  }
  if (YOUTUBE_SOURCES.has(normalizedSource)) {
    const id = extractYouTubeVideoId(rawId)
    return id ? { type: 'youtube', id } : null
  }
  return null
}
