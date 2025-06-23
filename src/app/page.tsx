'use client';

import { useState, useEffect } from 'react';
import { ProcessedRow } from '@/types/fide';
import { parseInputText, processRowsInParallel, formatOutputText, findNameFields } from '@/utils/fideParser';
import { useFileLoader } from '@/hooks/useFileLoader';
import FideDataCell from '@/components/FideDataCell';

export default function Home() {
  const { text: inputText, setText: setInputText, loadFile } = useFileLoader();
  const [processedRows, setProcessedRows] = useState<ProcessedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputText, setOutputText] = useState('');
  const [concurrency, setConcurrency] = useState(4);
  const [loadingRows, setLoadingRows] = useState<Set<number>>(new Set());
  const [ratingType, setRatingType] = useState<'standard' | 'rapid' | 'blitz'>('standard');

  // Load sample data on component mount
  useEffect(() => {
    loadFile('/sample.txt');
  }, [loadFile]);

  const handleUpdate = async () => {
    if (!inputText.trim()) return;
    
    setIsProcessing(true);
    setLoadingRows(new Set());
    
    try {
      const { headers: parsedHeaders, rows } = parseInputText(inputText);
      setHeaders(parsedHeaders);
      
      // Initialize table immediately with empty data
      const initialProcessed: ProcessedRow[] = rows.map((row) => {
        const { firstName, lastName } = findNameFields(row);
        
        return {
          ...row,
          searchTerm: firstName && lastName ? `${firstName} ${lastName}` : '',
          fideData: []
        };
      });
      
      setProcessedRows(initialProcessed);
      
      // Set the loading state for all rows that are about to be processed.
      setLoadingRows(new Set(rows.map((r, i) => i)));
      
      // Process with progress callback
      const processed = await processRowsInParallel(
        rows, 
        concurrency,
        (index, result) => {
          // Update individual row as it completes
          setProcessedRows(prev => {
            const updated = [...prev];
            updated[index] = {
              ...updated[index],
              fideData: result.players,
              isAccurate: result.isAccurate,
              searchOrder: result.searchOrder
            };
            return updated;
          });
          
          // Remove from loading set
          setLoadingRows(prev => {
            const newSet = new Set(prev);
            newSet.delete(index);
            return newSet;
          });
        }
      );
      
      setProcessedRows(processed);
    } catch (error) {
      console.error('Error processing data:', error);
    } finally {
      setIsProcessing(false);
      setLoadingRows(new Set());
    }
  };

  const handleSyncBack = () => {
    const output = formatOutputText(processedRows, headers, ratingType);
    setOutputText(output);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(outputText);
      alert('Copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const getCellValue = (row: ProcessedRow, header: string): string => {
    const value = row[header];
    return typeof value === 'string' ? value : '';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">FIDE Data Processor</h1>
        
        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Input Data</h2>
          <div className="mb-2">
            <p className="text-sm text-gray-600 mb-2">
              Paste your tab-separated data here. The format should be: ID | Ticket Type | First Name | Last Name
            </p>
            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border">
              <strong>Example format:</strong><br/>
              #	Ticket Type	First Name	Last Name<br/>
              1	U10 Girls	Kaylin	Zhang<br/>
              2	U10 Girls	Lana	Ram
            </div>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste your tab-separated data here..."
            className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 font-mono text-sm leading-relaxed"
            style={{ 
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
              whiteSpace: 'pre',
              tabSize: 2
            }}
          />
          <div className="mt-4 flex gap-4 items-center">
            <button
              onClick={handleUpdate}
              disabled={isProcessing || !inputText.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {isProcessing ? 'Processing...' : 'Update'}
            </button>
            
            <button
              onClick={() => loadFile('/sample.txt')}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
            >
              Load Sample
            </button>

            <button
              onClick={() => setInputText('')}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              Clear
            </button>
            
            <div className="flex items-center gap-2">
              <label htmlFor="concurrency" className="text-sm font-medium text-gray-700">
                Concurrency:
              </label>
              <select
                id="concurrency"
                value={concurrency}
                onChange={(e) => setConcurrency(Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
                disabled={isProcessing}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
                <option value={6}>6</option>
                <option value={8}>8</option>
                <option value={10}>10</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {processedRows.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Results</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    {headers.map((header, index) => (
                      <th key={index} className="border border-gray-300 px-4 py-2 text-left text-gray-900 font-semibold">
                        {header}
                      </th>
                    ))}
                    <th className="border border-gray-300 px-4 py-2 text-left text-gray-900 font-semibold">FIDE Data</th>
                  </tr>
                </thead>
                <tbody>
                  {processedRows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      {headers.map((header, colIndex) => (
                        <td key={colIndex} className="border border-gray-300 px-4 py-2 text-gray-900">
                          {getCellValue(row, header)}
                        </td>
                      ))}
                      <td className="border border-gray-300 px-4 py-2">
                        <FideDataCell row={row} isLoading={loadingRows.has(rowIndex)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Output Section */}
        {processedRows.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Output Data</h2>
            
            <div className="flex items-center gap-6 mb-4">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">Rating Type:</span>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-1 text-gray-800">
                            <input type="radio" value="standard" checked={ratingType === 'standard'} onChange={() => setRatingType('standard')} />
                            Standard
                        </label>
                        <label className="flex items-center gap-1 text-gray-800">
                            <input type="radio" value="rapid" checked={ratingType === 'rapid'} onChange={() => setRatingType('rapid')} />
                            Rapid
                        </label>
                        <label className="flex items-center gap-1 text-gray-800">
                            <input type="radio" value="blitz" checked={ratingType === 'blitz'} onChange={() => setRatingType('blitz')} />
                            Blitz
                        </label>
                    </div>
                </div>
            </div>

            <div className="flex gap-4 mb-4">
              <button
                onClick={handleSyncBack}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Sync Back
              </button>
              <button
                onClick={handleCopy}
                disabled={!outputText}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                Copy
              </button>
              <button
                onClick={() => setOutputText('')}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Clear Output
              </button>
            </div>
            <textarea
              value={outputText}
              onChange={(e) => setOutputText(e.target.value)}
              placeholder="Output data will appear here after clicking 'Sync Back'"
              className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-500 font-mono text-sm leading-relaxed"
              style={{ 
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                whiteSpace: 'pre',
                tabSize: 2
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
