import { memo } from 'react';
import TrackRow from './TrackRow';

const SORTABLE_COLUMNS = {
  status: 'status',
  source: 'source',
  title: 'source_title',
  album: 'discogs_album',
  tags: 'styles',
  date: 'date',
};

const TracksTable = memo(function TracksTable({ tracks, onSelectTrack, sortConfig, onSort }) {
  const renderSortMark = (columnKey) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
  };

  const sortableHeaderClass = 'cursor-pointer select-none hover:text-gray-700 transition-colors';

  const headerButton = (label, columnKey) => (
    <button
      type="button"
      onClick={() => onSort(columnKey)}
      className={sortableHeaderClass}
      aria-sort={
        sortConfig.key === columnKey
          ? sortConfig.direction === 'asc'
            ? 'ascending'
            : 'descending'
          : 'none'
      }
    >
      {label}
      {renderSortMark(columnKey)}
    </button>
  );

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">
          Liste des tracks ({tracks.length})
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12 hidden md:table-cell">
                {headerButton('Statut', SORTABLE_COLUMNS.status)}
              </th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20 hidden lg:table-cell">
                {headerButton('Source', SORTABLE_COLUMNS.source)}
              </th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                Pochette
              </th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {headerButton('Titre / Artiste', SORTABLE_COLUMNS.title)}
              </th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                {headerButton('Album', SORTABLE_COLUMNS.album)}
              </th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                {headerButton('Tags', SORTABLE_COLUMNS.tags)}
              </th>
              <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                {headerButton('Date', SORTABLE_COLUMNS.date)}
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {tracks.length > 0 ? (
              tracks.map(track => (
                <TrackRow
                  key={`${track.source}_${track.source_track_id}`}
                  track={track}
                  onClick={onSelectTrack}
                />
              ))
            ) : (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                  Aucune track trouvée
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default TracksTable;