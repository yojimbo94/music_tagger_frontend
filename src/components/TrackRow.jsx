import { memo, useMemo } from 'react'
import Tag from './Tag'

const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
})

const STATUS_META = {
  matched: { className: 'text-green-600', icon: '✓' },
  failed: { className: 'text-red-600', icon: '✗' },
  default: { className: 'text-amber-600', icon: '⏳' }
}

const PLACEHOLDER_THUMBNAIL = 'https://via.placeholder.com/40x40?text=♫'

function TrackRow({ track, onClick }) {
  const {
    title,
    artist,
    album,
    statusClass,
    statusIcon,
    allTags,
    formattedDate,
    thumbnailUrl
  } = useMemo(() => {
    const isMatched = track.status === 'matched'
    const title = track.source_title
    const artist = isMatched ? (track.discogs_artist || track.source_artist) : track.source_artist
    const meta = STATUS_META[track.status] || STATUS_META.default
    const allTags = [...(track.styles || []), ...(track.genres || [])]

    return {
      title,
      artist,
      album: track.discogs_album,
      statusClass: meta.className,
      statusIcon: meta.icon,
      allTags,
      formattedDate: track.created_at ? DATE_FORMATTER.format(new Date(track.created_at)) : '—',
      thumbnailUrl: track.discord_image || PLACEHOLDER_THUMBNAIL
    }
  }, [track])

  return (
    <tr
      onClick={() => onClick(track)}
      className="cursor-pointer hover:bg-gray-50 transition-colors h-12"
    >
      {/* Statut */}
      <td className="px-2 py-1 whitespace-nowrap align-middle hidden md:table-cell">
        <span className={`font-medium ${statusClass} text-xs`}>{statusIcon}</span>
      </td>

      {/* Source */}
      <td className="px-2 py-1 whitespace-nowrap align-middle hidden lg:table-cell">
        <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-800 text-xs">
          {track.source}
        </span>
      </td>

      {/* Pochette */}
      <td className="px-2 py-1 whitespace-nowrap align-middle w-12">
        <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-200 flex-shrink-0">
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      </td>

      {/* Titre / Artiste */}
      <td className="px-2 py-1 align-middle">
        <div className="min-w-0">
          <div
            className="font-medium text-gray-900 text-sm truncate max-w-[200px] md:max-w-[300px]"
            title={title}
          >
            {title}
          </div>
          <div
            className="text-xs text-gray-500 truncate max-w-[200px] md:max-w-[300px]"
            title={artist}
          >
            {artist}
          </div>
        </div>
      </td>

      {/* Album */}
      <td className="px-2 py-1 whitespace-nowrap align-middle hidden lg:table-cell">
        {track.status === 'matched' ? (
          <div className="truncate max-w-[150px] text-xs text-gray-700" title={album}>
            {album}
          </div>
        ) : (
          <span className="text-gray-400 text-xs">—</span>
        )}
      </td>

      {/* Tags */}
      <td className="px-2 py-1 align-middle hidden xl:table-cell">
        <div className="flex flex-wrap gap-1">
          {allTags.slice(0, 3).map((tag, index) => (
            <Tag key={`${tag}-${index}`} tag={tag} size="xs" />
          ))}
          {allTags.length > 3 && (
            <Tag tag={`+${allTags.length - 3}`} isCount={true} size="xs" />
          )}
        </div>
      </td>

      {/* Date */}
      <td className="px-2 py-1 whitespace-nowrap text-xs text-gray-500 align-middle hidden md:table-cell">
        {formattedDate}
      </td>
    </tr>
  )
}

export default memo(TrackRow)