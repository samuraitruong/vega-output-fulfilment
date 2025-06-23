import { ProcessedRow } from '@/types/fide';
import LoadingSpinner from './LoadingSpinner';

const FideDataCell = ({ row, isLoading }: { row: ProcessedRow; isLoading: boolean }) => {
    if (isLoading) {
        return <LoadingSpinner />;
    }

    // If the match is not accurate, or if there is no data, display a clean message.
    if (!row.isAccurate || !row.fideData || row.fideData.length === 0) {
      return <span className="text-gray-500 italic">No accurate match found</span>;
    }

    // Since the match is accurate, we are guaranteed to have a best player.
    // We will display only this single, accurate result.
    const player = row.fideData[0];
    
    return (
      <div className="space-y-2">
        <div key={player.fideId} className="text-sm bg-blue-50 p-2 rounded border border-blue-200">
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
      </div>
    );
};

export default FideDataCell; 