import { memo, useMemo } from 'react';
import { List } from 'react-window';
import TrackRow, { ROW_HEIGHT, ROW_GRID_CLASS } from './TrackRow';

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

  // Référence stable tant que `tracks`/`onSelectTrack` ne changent pas vraiment,
  // pour éviter de refaire un cycle de mesure react-window à chaque frappe.
  const rowProps = useMemo(() => ({ tracks, onSelectTrack }), [tracks, onSelectTrack]);

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
        <div className="min-w-[900px]">
          {/* Entête, calé sur la même grille que les lignes virtualisées */}
          <div className={`${ROW_GRID_CLASS} py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider`}>
            <div />
            <div className="hidden md:block">{headerButton('Statut', SORTABLE_COLUMNS.status)}</div>
            <div className="hidden lg:block">{headerButton('Source', SORTABLE_COLUMNS.source)}</div>
            <div>Pochette</div>
            <div>{headerButton('Titre / Artiste', SORTABLE_COLUMNS.title)}</div>
            <div className="hidden lg:block">{headerButton('Album', SORTABLE_COLUMNS.album)}</div>
            <div className="hidden xl:block">{headerButton('Tags', SORTABLE_COLUMNS.tags)}</div>
            <div className="hidden md:block">{headerButton('Date', SORTABLE_COLUMNS.date)}</div>
          </div>

          {/* Corps virtualisé : ne rend que les lignes visibles, indispensable au-delà
              de quelques centaines de tracks (bibliothèque actuelle : ~3700 titres). */}
          {tracks.length > 0 ? (
            <List
              key={tracks.length}
              rowComponent={TrackRow}
              rowCount={tracks.length}
              rowHeight={ROW_HEIGHT}
              rowProps={rowProps}
              defaultHeight={Math.min(tracks.length * ROW_HEIGHT, 640)}
            />
          ) : (
            <div className="px-6 py-4 text-center text-gray-500">
              Aucune track trouvée
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default TracksTable;
