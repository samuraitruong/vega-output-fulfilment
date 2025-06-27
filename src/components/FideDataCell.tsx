import React from 'react';
import { FidePlayer } from '@/types/fide';
import { setInvalidMatch, removeInvalidMatch } from '@/utils/cache';

interface FideDataCellProps {
  player: FidePlayer;
  searchTerm: string;
  isValid?: boolean;
  onInvalidate?: (fideId: string) => void;
}

const FideDataCell: React.FC<FideDataCellProps> = ({ player, searchTerm, isValid = true, onInvalidate }) => {
  if (!player) {
    return null;
  }

  const { name, federation, birthYear, title, standard, rapid, blitz, fideId } = player;

  const getRatingDisplay = (rating: string) => rating || <span className="text-gray-400">Unrated</span>;

  const handleInvalidate = () => {
    if (onInvalidate) {
      onInvalidate(fideId);
      setInvalidMatch(searchTerm, fideId);
    }
  };

  return (
    <div className="text-xs relative group">
      <div className="font-bold text-gray-800 flex items-center justify-between gap-2">
        <span>{name} ({federation})</span>
        {isValid && (
          <button
            onClick={handleInvalidate}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-800 px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1"
            title="Mark as incorrect match"
          >
            <span>Invalid Match</span>
            <span className="text-base">✕</span>
          </button>
        )}
      </div>
      <div className="text-gray-600">
        Born: {birthYear}, Title: {title || 'None'}
      </div>
      <div>
        Std: <strong>{getRatingDisplay(standard)}</strong>, 
        Rpd: <strong>{getRatingDisplay(rapid)}</strong>, 
        Blz: <strong>{getRatingDisplay(blitz)}</strong>
      </div>
      {!isValid && (
        <div className="text-red-600 text-xs mt-1">
          ⚠️ Marked as incorrect match
        </div>
      )}
    </div>
  );
};

export default FideDataCell; 