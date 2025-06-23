import { ProcessedRow } from '@/types/fide';
import AccuracyIndicator from './AccuracyIndicator';
import LoadingSpinner from './LoadingSpinner';

const FideDataCell = ({ row, isLoading }: { row: ProcessedRow; isLoading: boolean }) => {
    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (!row.fideData || row.fideData.length === 0) {
      return <span className="text-gray-500 italic">No results</span>;
    }

    // For accurate matches, show only 1 record
    const playersToShow = row.isAccurate ? row.fideData.slice(0, 1) : row.fideData.slice(0, 3);
    
    return (
      <div className="space-y-2">
        <AccuracyIndicator isAccurate={row.isAccurate} searchOrder={row.searchOrder} />
        {playersToShow.map((player, playerIndex) => (
          <div key={playerIndex} className="text-sm bg-blue-50 p-2 rounded border border-blue-200">
            <div className="text-gray-900">
              <strong>{player.name}</strong> 
              <span className="text-blue-700"> ({player.federation})</span>
              {player.fideId && (
                <a 
                  href={`https://ratings.fide.com/profile/${player.fideId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-blue-600 hover:text-blue-800 underline text-xs"
                >
                  ID: {player.fideId}
                </a>
              )}
            </div>
            <div className="text-gray-700 text-xs mt-1">
              Standard: <span className="font-medium">{player.standard || 'Unrated'}</span> | 
              Rapid: <span className="font-medium">{player.rapid || 'Unrated'}</span> | 
              Blitz: <span className="font-medium">{player.blitz || 'Unrated'}</span>
            </div>
          </div>
        ))}
        {!row.isAccurate && row.fideData.length > 3 && (
          <div className="text-xs text-gray-600 font-medium">
            +{row.fideData.length - 3} more results
          </div>
        )}
      </div>
    );
};

export default FideDataCell; 