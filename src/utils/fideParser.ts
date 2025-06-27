import { FidePlayer, ProcessedRow } from '@/types/fide';
import { getCache, setCache, getInvalidMatches } from './cache';

export function parseFideTable(html: string): FidePlayer[] {
    if (typeof window === "undefined" || !window.DOMParser) {
        // SSR/Node fallback: skip parsing
        return [];
    }
    const parser = new window.DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const table = doc.querySelector("#table_results");
    if (!table) return [];

    const rows = Array.from(table.querySelectorAll("tbody tr"));
    let players = rows.map((row) => {
        const cells = row.querySelectorAll("td");
        return {
            fideId: cells[0]?.textContent?.trim() || "",
            name: cells[1]?.textContent?.trim() || "",
            title: cells[2]?.textContent?.trim() || "",
            trainerTitle: cells[3]?.textContent?.trim() || "",
            federation: cells[4]?.textContent?.replace(/[\n\r]+/g, "").replace(/.*([A-Z]{3})$/, "$1").trim() || "",
            standard: cells[5]?.textContent?.trim() || "",
            rapid: cells[6]?.textContent?.trim() || "",
            blitz: cells[7]?.textContent?.trim() || "",
            birthYear: cells[8]?.textContent?.trim() || "",
        };
    });
    // Sort: AUS federation to top, then by name
    players = players.sort((a, b) => {
        if (a.federation === 'AUS' && b.federation !== 'AUS') return -1;
        if (a.federation !== 'AUS' && b.federation === 'AUS') return 1;
        return a.name.localeCompare(b.name);
    });
    return players;
}

async function performFideSearch(searchTerm: string): Promise<FidePlayer[] | null> {
    const url = `https://ratings.fide.com/incl_search_l.php?search=${encodeURIComponent(searchTerm)}&simple=1`;
    try {
        const response = await fetch('https://no-cors.fly.dev/cors/' + url, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });

        if (!response.ok) {
            console.error(`FIDE search failed with status: ${response.status}`);
            return null;
        }
        const html = await response.text();
        const players = parseFideTable(html);
        return players.length > 0 ? players : null;
    } catch (error) {
        console.error('Error fetching FIDE data:', error);
        return null;
    }
}

export async function searchFidePlayer(
    searchTerm: string,
    options: { forceRefresh?: boolean } = {}
): Promise<{ players: FidePlayer[], isAccurate: boolean, searchOrder: string }> {
    const { forceRefresh = false } = options;

    if (!forceRefresh) {
        const cachedResult = getCache<{ players: FidePlayer[], isAccurate: boolean, searchOrder: string }>(searchTerm);
        if (cachedResult) {
            return { ...cachedResult, searchOrder: `${cachedResult.searchOrder} (cached)` };
        }
    }

    const checkAccuracy = (players: FidePlayer[]) => {
        if (players.length === 0) return false;
        if (players.length === 1) return true;
        return players.some(p => p.federation === 'AUS');
    };

    const searchAttempts = [
        { term: searchTerm, order: 'lastName, firstName' },
        { term: searchTerm.split(',').reverse().join(' ').trim(), order: 'firstName lastName (reversed)' }
    ];

    try {
        for (const attempt of searchAttempts) {
            const players = await performFideSearch(attempt.term);
            if (players) {
                // Filter out invalid matches and prioritize AUS federation
                const invalidMatches = getInvalidMatches(searchTerm);
                const validPlayers = players
                    .filter(p => !invalidMatches.includes(p.fideId))
                    .sort((a, b) => {
                        // Prioritize AUS federation
                        if (a.federation === 'AUS' && b.federation !== 'AUS') return -1;
                        if (a.federation !== 'AUS' && b.federation === 'AUS') return 1;
                        // Then sort by name
                        return a.name.localeCompare(b.name);
                    });

                const result = {
                    players: validPlayers,
                    isAccurate: checkAccuracy(validPlayers),
                    searchOrder: attempt.order
                };
                
                // Don't cache inaccurate results to allow for re-tries
                if (result.isAccurate) {
                    setCache(searchTerm, result);
                }
                return result;
            }
        }
        
        return { players: [], isAccurate: false, searchOrder: 'No results found' };

    } catch (error) {
        console.error(`Error searching for ${searchTerm}:`, error);
        return { players: [], isAccurate: false, searchOrder: 'Error' };
    }
}

export async function processRowsInParallel(
    rows: Record<string, string>[], 
    concurrency: number = 4,
    onProgress?: (index: number, result: { players: FidePlayer[], isAccurate: boolean, searchOrder: string }) => void
): Promise<ProcessedRow[]> {
    const processed: ProcessedRow[] = [];
    
    // Initialize all rows with empty data first
    for (let i = 0; i < rows.length; i++) {
        const row: Record<string, string> = { id: (i + 1).toString() };
        const { firstName, lastName } = findNameFields(row);
        
        processed.push({
            ...row,
            searchTerm: firstName && lastName ? `${firstName} ${lastName}` : '',
            fideData: undefined,
            originalIndex: i
        });
    }

    // Process in batches with concurrency limit
    for (let i = 0; i < rows.length; i += concurrency) {
        const batch = rows.slice(i, i + concurrency);
        const promises = batch.map(async (row, batchIndex) => {
            const actualIndex = i + batchIndex;
            const { firstName, lastName } = findNameFields(row);
            
            if (firstName && lastName) {
                const searchTerm1 = `${lastName}, ${firstName}`;
                let result = await searchFidePlayer(searchTerm1);
                let usedSearchTerm = searchTerm1;
                if (result.players.length === 0) {
                    const searchTerm2 = `${firstName}, ${lastName}`;
                    result = await searchFidePlayer(searchTerm2);
                    usedSearchTerm = searchTerm2;
                }
                processed[actualIndex] = {
                    ...row,
                    searchTerm: usedSearchTerm,
                    fideData: result.players.length > 0 ? result.players[0] : undefined,
                    isAccurate: result.isAccurate,
                    searchOrder: result.searchOrder,
                    originalIndex: actualIndex
                };
                
                // Call progress callback
                if (onProgress) {
                    onProgress(actualIndex, result);
                }
            }
        });
        
        await Promise.all(promises);
    }
    
    return processed;
}

export function findNameKeys(headers: string[]): { firstNameKey?: string, lastNameKey?: string } {
    let firstNameKey: string | undefined;
    let lastNameKey: string | undefined;

    for (const header of headers) {
        const normalized = header.toLowerCase().replace(/\s/g, '');
        if (normalized.startsWith('firstname')) {
            firstNameKey = header;
        }
        if (normalized.startsWith('lastname')) {
            lastNameKey = header;
        }
    }
    
    // Fallback for a single "Name" column
    if (!firstNameKey && !lastNameKey) {
        for (const header of headers) {
            const normalized = header.toLowerCase().replace(/\s/g, '');
            if (normalized === 'name') {
                lastNameKey = header; // Treat it as the main name field
                break;
            }
        }
    }
    
    return { firstNameKey, lastNameKey };
}

export function parseInputText(text: string): { headers: string[], rows: Record<string, string>[] } {
    const lines = text.trim().split('\n');
    if (lines.length < 1) {
        return { headers: [], rows: [] };
    }
    const headers = lines[0].split(/\t+/).map(h => h.trim());
    const rows: Record<string, string>[] = lines.slice(1).map(line => {
        const cells = line.split(/\t+/);
        const row: Record<string, string> = {};
        headers.forEach((header, i) => {
            row[header] = cells[i] ? cells[i].trim() : '';
        });
        return row;
    });
    return { headers, rows };
}

export function findNameFields(row: Record<string, string>) {
    const firstName = row.firstName || row['First Name'] || row['firstname'] || row['first_name'] || row['First'] || row['FirstName'] ||'';
    const lastName = row.lastName || row['Last Name'] || row['lastname'] || row['last_name'] || row['Last'] || row['LastName'] ||'';
    return { firstName, lastName };
};

export function formatOutputText(
    processedRows: ProcessedRow[],
    headers: string[],
    ratingType: 'standard' | 'rapid' | 'blitz',
    align: boolean = false
): string {
    // 1. Prepare all data as strings, including the header row
    const allRows: string[][] = [];
    const headerRow = [...headers];
    if (!headerRow.includes('FRtg')) headerRow.push('FRtg');
    allRows.push(headerRow);

    processedRows.forEach(row => {
        const rowArr = headers.map(h => {
            const val = row[h];
            if (typeof val === 'string' || typeof val === 'number') return String(val);
            return '';
        });
        // Add the rating column
        let rating = '';
        if (row.fideData) {
            rating = row.fideData[ratingType] || '';
        }
        rowArr.push(rating);
        allRows.push(rowArr);
    });

    if (align) {
        // Space-aligned output
        const colWidths = allRows[0].map((_, colIdx) => {
            return Math.max(...allRows.map(row => (row[colIdx] ?? '').toString().length));
        });
        const pad = (str: string, len: number) => str.padEnd(len, ' ');
        return allRows.map(row =>
            row.map((cell, i) => pad(String(cell ?? ''), colWidths[i])).join('    ')
        ).join('\n');
    } else {
        // Tab-separated output
        return allRows.map(row => row.map(cell => String(cell ?? '')).join('\t')).join('\n');
    }
} 