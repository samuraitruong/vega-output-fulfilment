'use client';

import { useState, useEffect, useRef } from 'react';
import { parseInputText, searchFidePlayer, formatOutputText, findNameKeys } from '@/utils/fideParser';
import { ProcessedRow } from '@/types/fide';
import { cleanupOldCache } from '@/utils/cache';
import LoadingSpinner from '@/components/LoadingSpinner';
import FideDataCell from '@/components/FideDataCell';

export default function Home() {
  const [inputText, setInputText] = useState('');
  const [processedData, setProcessedData] = useState<ProcessedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [concurrency, setConcurrency] = useState(5);
  const [loadingRows, setLoadingRows] = useState<Set<number>>(new Set());
  const [ratingType, setRatingType] = useState<'standard' | 'rapid' | 'blitz'>('standard');
  const [showCopyTooltip, setShowCopyTooltip] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    cleanupOldCache();
    const loadSample = async () => {
      try {
        const response = await fetch('/sample.txt');
        if (response.ok) {
          const text = await response.text();
          setInputText(text);
        }
      } catch (error) {
        console.error("Failed to load sample file:", error);
      }
    };
    loadSample();
  }, []);

  const handleFileSelectClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setInputText(text);
      };
      reader.readAsText(file);
    }
  };

  const handleProcessClick = async ({ forceRefresh = false }: { forceRefresh?: boolean }) => {
    setIsProcessing(true);
    const { headers: parsedHeaders, rows } = parseInputText(inputText);
    setHeaders(parsedHeaders);
    const { firstNameKey, lastNameKey } = findNameKeys(parsedHeaders);

    const initialData: ProcessedRow[] = rows.map((row, index) => ({
      ...row,
      originalIndex: index,
    }));
    setProcessedData(initialData);
    setLoadingRows(new Set(rows.map((_, index) => index)));

    const BATCH_SIZE = concurrency;
    const chunks = [];
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      chunks.push(rows.slice(i, i + BATCH_SIZE).map((row, j) => ({ row, index: i + j })));
    }

    for (const chunk of chunks) {
      await Promise.all(chunk.map(async ({ row, index }) => {
        const firstName = firstNameKey ? row[firstNameKey] : undefined;
        const lastName = lastNameKey ? row[lastNameKey] : undefined;

        let processedResult;
        if (firstName || lastName) {
          const searchTerm = [lastName, firstName].filter(Boolean).join(', ');
          const { players, isAccurate, searchOrder } = await searchFidePlayer(searchTerm, { forceRefresh });
          processedResult = {
            fideData: isAccurate && players.length > 0 ? players[0] : undefined,
            isAccurate,
            searchOrder,
          };
        } else {
          processedResult = { fideData: undefined, isAccurate: false, searchOrder: 'Name not found' };
        }
        
        setProcessedData(prev => prev.map(pRow =>
          pRow.originalIndex === index ? { ...pRow, ...processedResult } : pRow
        ));
        
        setLoadingRows(prev => {
          const newSet = new Set(prev);
          newSet.delete(index);
          return newSet;
        });
      }));
    }

    setIsProcessing(false);
  };

  const handleCopyToClipboard = () => {
    const outputText = formatOutputText(processedData, headers, ratingType);
    navigator.clipboard.writeText(outputText);
    setShowCopyTooltip(true);
    setTimeout(() => setShowCopyTooltip(false), 2000); // Hide after 2 seconds
  };

  const handleSyncBack = () => {
    const outputText = formatOutputText(processedData, headers, ratingType);
    setInputText(outputText);
  };

  const getHeaderValue = (header: string, row: ProcessedRow) => {
    const value = row[header];
    return typeof value === 'string' ? value : '';
  };

  return (
    <div className="min-h-screen bg-gray-100">
       <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="w-24"></div> 
            <div className="flex-1 text-center">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                FIDE Player Data Processor
              </h1>
            </div>
            <div className="w-24 flex justify-end">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".txt,.text"
              />
              <button
                onClick={handleFileSelectClick}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm cursor-pointer"
              >
                Open File
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 md:p-8">
        <div className="z-10 w-full max-w-7xl mx-auto items-start justify-between font-mono text-sm lg:flex flex-col">
          <textarea
            className="w-full h-64 p-4 mb-4 bg-slate-50 border border-slate-300 text-slate-800 placeholder-slate-500 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste your tab-separated player data here or open a file..."
          />

          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={() => handleProcessClick({ forceRefresh: false })}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400 cursor-pointer disabled:cursor-not-allowed"
              disabled={isProcessing || !inputText}
            >
              {isProcessing ? <LoadingSpinner /> : 'Process'}
            </button>
            <button
              onClick={() => handleProcessClick({ forceRefresh: true })}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400 cursor-pointer disabled:cursor-not-allowed"
              disabled={isProcessing || !inputText}
            >
              Force Refresh
            </button>
            <label htmlFor="concurrency" className="text-sm font-medium text-gray-700">
              Concurrency:
            </label>
            <input
              id="concurrency"
              type="range"
              min="1"
              max="10"
              value={concurrency}
              onChange={(e) => setConcurrency(parseInt(e.target.value, 10))}
              className="w-32 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm font-medium text-gray-700">{concurrency}</span>
          </div>

          {(processedData.length > 0 || isProcessing) && (
            <div className="w-full mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">Processed Data</h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Rating to Sync:</span>
                    <select
                      value={ratingType}
                      onChange={(e) => setRatingType(e.target.value as 'standard' | 'rapid' | 'blitz')}
                      className="px-3 py-1 bg-slate-50 border border-slate-300 text-slate-800 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="standard">Standard</option>
                      <option value="rapid">Rapid</option>
                      <option value="blitz">Blitz</option>
                    </select>
                  </div>
                  <button
                    onClick={handleSyncBack}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-medium cursor-pointer"
                  >
                    Sync Back
                  </button>
                  <div className="relative">
                    <button
                      onClick={handleCopyToClipboard}
                      className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 font-medium cursor-pointer"
                    >
                      Copy
                    </button>
                    {showCopyTooltip && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md shadow-lg">
                        Copied!
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto bg-white rounded-lg shadow">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {headers.map((header) => (
                        <th
                          key={header}
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        FIDE Data
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {processedData.map((row) => (
                      <tr key={row.originalIndex}>
                        {headers.map((header) => (
                          <td key={header} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {getHeaderValue(header, row)}
                          </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {loadingRows.has(row.originalIndex) ? (
                              <LoadingSpinner />
                          ) : (
                            row.fideData ? <FideDataCell player={row.fideData} /> : null
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
