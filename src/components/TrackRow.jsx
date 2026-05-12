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

const PLACEHOLDER_THUMBNAIL = 'https://via.placeholder.com/64x64?text=♫'

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

    const title = isMatched ? (track.discogs_album || track.source_title) : track.source_title
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
      thumbnailUrl: track.thumbnail_url || PLACEHOLDER_THUMBNAIL
    }
  }, [track])

  return (
    <tr
      onClick={() => onClick(track)}
      className="cursor-pointer hover:bg-gray-50 transition-colors"
    >
      <td className="px-6 py-4 whitespace-nowrap align-middle">
        <span className={`font-medium ${statusClass}`}>{statusIcon}</span>
      </td>

      <td className="px-6 py-4 whitespace-nowrap align-middle">
        <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs">
          {track.source}
        </span>
      </td>

      <td className="px-6 py-4 whitespace-nowrap align-middle">
        <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-200 flex-shrink-0">
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      </td>

      <td className="px-6 py-4 align-middle">
        <div className="min-w-0">
          <div
            className="font-medium text-gray-900 text-sm truncate max-w-xs"
            title={title}
          >
            {title}
          </div>
          <div
            className="text-sm text-gray-500 truncate max-w-xs"
            title={artist}
          >
            {artist}
          </div>
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap align-middle">
        {track.status === 'matched' ? (
          <div className="truncate max-w-xs text-sm text-gray-700" title={album}>
            {album}
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>

      <td className="px-6 py-4 align-middle">
        <div className="flex flex-wrap gap-1">
          {allTags.slice(0, 3).map((tag, index) => (
            <Tag key={`${tag}-${index}`} tag={tag} />
          ))}
          {allTags.length > 3 && (
            <Tag tag={`+${allTags.length - 3}`} isCount={true} />
          )}
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-middle">
        {formattedDate}
      </td>
    </tr>
  )
}

export default memo(TrackRow)