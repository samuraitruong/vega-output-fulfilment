const AccuracyIndicator = ({ isAccurate, searchOrder }: { isAccurate?: boolean, searchOrder?: string }) => {
    // If the match is accurate or undefined, display nothing.
    if (isAccurate === undefined || isAccurate) {
        return null;
    }
    
    // Otherwise, show the "Multiple Results" indicator.
    return (
      <div className="flex items-center gap-1 mb-2">
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <span className="w-2 h-2 bg-yellow-400 rounded-full mr-1"></span>
            Multiple Results
        </span>
        <span className="text-xs text-gray-500">({searchOrder})</span>
      </div>
    );
};

export default AccuracyIndicator; 