import { memo, useMemo } from 'react'
import Tag from './Tag'

const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
})

const STATUS_META = {
  matched: { className: 'text-green-600', icon: '✓', label: 'Matché' },
  manual: { className: 'text-blue-600', icon: '✎', label: 'Tag manuel' },
  failed: { className: 'text-red-600', icon: '✗', label: 'Échec' },
  default: { className: 'text-amber-600', icon: '⏳', label: 'En attente' }
}

const PLACEHOLDER_THUMBNAIL = 'https://via.placeholder.com/40x40?text=♫'

export const ROW_HEIGHT = 56

// Grid partagé entre l'entête (TracksTable) et chaque ligne, pour rester alignés.
export const ROW_GRID_CLASS =
  'grid grid-cols-[28px_64px_84px_56px_minmax(160px,2fr)_minmax(140px,1.5fr)_minmax(160px,1.5fr)_88px] items-center gap-2 px-3'

function TrackRow({ index, style, getTrack, onSelectTrack }) {
  // Le virtualiseur peut redemander un rendu pour `index` un tick avant que le
  // tableau tracks (recalculé par le filtrage/tri) n'ait rétréci en cohérence
  // (ex: en tapant vite dans la recherche) — sans ce garde-fou, l'accès à un
  // track undefined faisait planter tout l'arbre React (écran blanc).
  const track = getTrack(index)

  const derived = useMemo(() => {
    if (!track) return null
    const isMatched = track.status === 'matched' || track.status === 'manual'
    const title = track.source_title
    const artist = isMatched ? (track.discogs_artist || track.source_artist) : track.source_artist
    const meta = STATUS_META[track.status] || STATUS_META.default
    const allTags = [...(track.styles || []), ...(track.genres || [])]

    return {
      title,
      artist,
      album: track.discogs_album,
      statusMeta: meta,
      allTags,
      formattedDate: track.created_at ? DATE_FORMATTER.format(new Date(track.created_at)) : '—',
      thumbnailUrl: track.discogs_image || PLACEHOLDER_THUMBNAIL
    }
  }, [track])

  if (!track || !derived) {
    return <div style={style} className={ROW_GRID_CLASS} />
  }

  const { title, artist, album, statusMeta, allTags, formattedDate, thumbnailUrl } = derived

  return (
    <div
      style={style}
      onClick={() => onSelectTrack(track)}
      className={`${ROW_GRID_CLASS} cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100`}
    >
      {/* Alerte */}
      <div className="flex justify-center" title={track.has_alert ? 'Style hors de la liste attendue' : undefined}>
        {track.has_alert && <span className="text-amber-500 text-sm">⚠️</span>}
      </div>

      {/* Statut */}
      <div className="hidden md:block" title={statusMeta.label}>
        <span className={`font-medium ${statusMeta.className} text-xs`}>{statusMeta.icon}</span>
      </div>

      {/* Source */}
      <div className="hidden lg:block">
        <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-800 text-xs">
          {track.source}
        </span>
      </div>

      {/* Pochette */}
      <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-200 flex-shrink-0">
        <img
          src={thumbnailUrl}
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </div>

      {/* Titre / Artiste */}
      <div className="min-w-0">
        <div className="font-medium text-gray-900 text-sm truncate" title={title}>
          {title}
        </div>
        <div className="text-xs text-gray-500 truncate" title={artist}>
          {artist}
        </div>
      </div>

      {/* Album */}
      <div className="hidden lg:block truncate text-xs text-gray-700" title={album}>
        {(track.status === 'matched' || track.status === 'manual') && album ? album : (
          <span className="text-gray-400">—</span>
        )}
      </div>

      {/* Tags */}
      <div className="hidden xl:flex flex-wrap gap-1 overflow-hidden">
        {allTags.slice(0, 2).map((tag, i) => (
          <Tag key={`${tag}-${i}`} tag={tag} size="xs" />
        ))}
        {allTags.length > 2 && <Tag tag={`+${allTags.length - 2}`} isCount size="xs" />}
      </div>

      {/* Date */}
      <div className="hidden md:block text-xs text-gray-500">
        {formattedDate}
      </div>
    </div>
  )
}

export default memo(TrackRow)
