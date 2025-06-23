const LoadingSpinner = () => (
    <div className="flex items-center justify-center p-2">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
      <span className="ml-2 text-xs text-gray-600">Loading...</span>
    </div>
);

export default LoadingSpinner; 