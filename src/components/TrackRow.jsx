import Tag from './Tag'

function TrackRow({ track, onClick }) {
  const getDisplayText = () => {
    if (track.status === 'matched') {
      return {
        title: track.discogs_album || track.source_title,
        artist: track.discogs_artist || track.source_artist
      }
    }
    return {
      title: track.source_title,
      artist: track.source_artist
    }
  }

  const display = getDisplayText()

  const getStatusClass = () => {
    switch (track.status) {
      case 'matched':
        return 'text-green-600'
      case 'failed':
        return 'text-red-600'
      default:
        return 'text-amber-600'
    }
  }

  const getStatusIcon = () => {
    switch (track.status) {
      case 'matched':
        return '✓'
      case 'failed':
        return '✗'
      default:
        return '⏳'
    }
  }

  const allTags = [...(track.styles || []), ...(track.genres || [])]

  const formattedDate = new Date(track.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })

  const thumbnailUrl =
    track.thumbnail_url || 'https://via.placeholder.com/64x64?text=♫'

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer hover:bg-gray-50 transition-colors"
    >
      <td className="px-6 py-4 whitespace-nowrap align-middle">
        <span className={`font-medium ${getStatusClass()}`}>
          {getStatusIcon()}
        </span>
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
            // alt={display.title}
            className="w-full h-full object-cover"
          />
        </div>
      </td>

      <td className="px-6 py-4 align-middle">
        <div className="min-w-0">
          <div
            className="font-medium text-gray-900 text-sm truncate max-w-xs"
            title={display.title}
          >
            {display.title}
          </div>
          <div
            className="text-sm text-gray-500 truncate max-w-xs"
            title={display.artist}
          >
            {display.artist}
          </div>
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap align-middle">
        {track.status === 'matched' ? (
          <div className="truncate max-w-xs text-sm text-gray-700" title={track.discogs_album}>
            {track.discogs_album}
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>

      <td className="px-6 py-4 align-middle">
        <div className="flex flex-wrap gap-1">
          {allTags.slice(0, 3).map((tag, index) => (
            <Tag key={index} tag={tag} />
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

export default TrackRow