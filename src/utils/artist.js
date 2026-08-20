// Artiste à afficher pour une track : pour une compilation dont Discogs ne
// renvoie que "Various" comme artiste global, on préfère l'artiste spécifique
// retrouvé pour ce morceau précis (discogs_track_artist, cf. côté serveur
// providers/discogs.py) quand il est disponible. Pas de lien ici, juste du
// texte — et discogs_artist n'est jamais modifié en base.
const VARIOUS_NAMES = new Set(['various', 'various artists'])

export function displayArtist(track) {
  const artist = track?.discogs_artist || track?.source_artist
  if (artist && VARIOUS_NAMES.has(artist.trim().toLowerCase())) {
    return track.discogs_track_artist || artist
  }
  return artist
}
