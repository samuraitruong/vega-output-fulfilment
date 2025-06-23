import React from 'react';
import { FidePlayer } from '@/types/fide';

interface FideDataCellProps {
  player: FidePlayer;
}

const FideDataCell: React.FC<FideDataCellProps> = ({ player }) => {
  if (!player) {
    return null;
  }

  const { name, federation, birthYear, title, standard, rapid, blitz } = player;

  const getRatingDisplay = (rating: string) => rating || <span className="text-gray-400">Unrated</span>;

  return (
    <div className="text-xs">
      <div className="font-bold text-gray-800">{name} ({federation})</div>
      <div className="text-gray-600">
        Born: {birthYear}, Title: {title || 'None'}
      </div>
      <div>
        Std: <strong>{getRatingDisplay(standard)}</strong>, 
        Rpd: <strong>{getRatingDisplay(rapid)}</strong>, 
        Blz: <strong>{getRatingDisplay(blitz)}</strong>
      </div>
    </div>
  );
};

export default FideDataCell; 