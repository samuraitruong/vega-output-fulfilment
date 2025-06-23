import { FidePlayer, ProcessedRow } from '@/types/fide';

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

export async function searchFidePlayer(searchTerm: string): Promise<{ players: FidePlayer[], isAccurate: boolean, searchOrder: string }> {
    
    // Helper function to perform a single FIDE search and return players if found.
    const performFideSearch = async (term: string): Promise<FidePlayer[] | null> => {
        console.log("term", term)
        const url = `https://ratings.fide.com/incl_search_l.php?search=${encodeURIComponent(term)}&simple=1`;
        const response = await fetch('https://no-cors.fly.dev/cors/' + url, { 
            headers: { 'X-Requested-With': 'XMLHttpRequest' } 
        });

        if (response.ok) {
            const html = await response.text();
            const players = parseFideTable(html);
            if (players.length > 0) {
                return players;
            }
        }
        return null;
    }

    // Helper to determine if a result is considered "accurate".
    const checkAccuracy = (players: FidePlayer[]) => {
        const ausPlayers = players.filter(p => p.federation === 'AUS');
        return ausPlayers.length > 0 || players.length === 1;
    }

    try {
        // First try: The default search term (e.g., "Lastname, Firstname")
        let players = await performFideSearch(searchTerm);
        if (players) {
            return {
                players,
                isAccurate: checkAccuracy(players),
                searchOrder: 'lastName, firstName'
            };
        }
        
        // Second try: The reverse order (e.g., "Firstname Lastname")
        const nameParts = searchTerm.split(' ');
        if (nameParts.length >= 2) {
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ');
            const reversedSearchTerm = `${lastName}, ${firstName}`;
            
            players = await performFideSearch(reversedSearchTerm);
            if (players) {
                return {
                    players,
                    isAccurate: checkAccuracy(players),
                    searchOrder: 'firstName lastName (reversed)'
                };
            }
        }
        
        // If both attempts fail, return no results.
        return { players: [], isAccurate: false, searchOrder: 'none' };
        
    } catch (error) {
        console.error('Error searching FIDE player:', error);
        return { players: [], isAccurate: false, searchOrder: 'error' };
    }
}

export async function processRowsInParallel(
    rows: any[], 
    concurrency: number = 4,
    onProgress?: (index: number, result: { players: FidePlayer[], isAccurate: boolean, searchOrder: string }) => void
): Promise<ProcessedRow[]> {
    const processed: ProcessedRow[] = [];
    
    // Initialize all rows with empty data first
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const { firstName, lastName } = findNameFields(row);
        
        processed.push({
            ...row,
            searchTerm: firstName && lastName ? `${firstName} ${lastName}` : '',
            fideData: []
        });
    }

    // Process in batches with concurrency limit
    for (let i = 0; i < rows.length; i += concurrency) {
        const batch = rows.slice(i, i + concurrency);
        const promises = batch.map(async (row, batchIndex) => {
            const actualIndex = i + batchIndex;
            const { firstName, lastName } = findNameFields(row);
            
            if (firstName && lastName) {
                let searchTerm = `${lastName}, ${firstName}`;
                let result = await searchFidePlayer(searchTerm);
                if(result.players.length ==0) {
                 result = await searchFidePlayer(`${firstName}, ${lastName}`);
                }
                processed[actualIndex] = {
                    ...row,
                    searchTerm,
                    fideData: result.players,
                    isAccurate: result.isAccurate,
                    searchOrder: result.searchOrder
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

export function parseInputText(text: string): { headers: string[], rows: any[] } {
    const lines = text.trim().split('\n');
    if (lines.length < 1) {
        return { headers: [], rows: [] };
    }

    // 1. Analyze the header to find the start of each column based on its text.
    const headerLine = lines[0];
    const headerCells = headerLine.split('\t');
    const headerConfig: { name: string, index: number }[] = [];
    headerCells.forEach((h, i) => {
        const name = h.trim();
        if (name) {
            headerConfig.push({ name, index: i });
        }
    });
    
    const displayHeaders = headerConfig.map(h => h.name);

    // 2. Parse data rows by slicing between the header start indices.
    const rows = lines.slice(1).map((line, index) => {
        const dataCells = line.split('\t');
        const row: any = { id: (index + 1).toString() };

        for (let i = 0; i < headerConfig.length; i++) {
            const currentHeader = headerConfig[i];
            const nextHeader = headerConfig[i + 1];

            const startIndex = currentHeader.index;
            const endIndex = nextHeader ? nextHeader.index : dataCells.length;

            const value = dataCells.slice(startIndex, endIndex).join(' ').trim();
            row[currentHeader.name] = value;
        }
        
        return row;
    });

    return { headers: displayHeaders, rows };
}

export function findNameFields(row: any) {
    const firstName = row.firstName || row['First Name'] || row['firstname'] || row['first_name'] || row['First'] || row['FirstName'] ||'';
    const lastName = row.lastName || row['Last Name'] || row['lastname'] || row['last_name'] || row['Last'] || row['LastName'] ||'';
    return { firstName, lastName };
};

export function formatOutputText(processedRows: any[], headers: string[], ratingType: 'standard' | 'rapid' | 'blitz'): string {
    const outputLines = [];
    
    // Add header line, including the new "FRtg" column
    const newHeaders = [...headers, 'FRtg'];
    outputLines.push(newHeaders.join('\t'));
    
    // Add data rows
    processedRows.forEach(row => {
        // Find the best player match (the first one, as they are pre-sorted)
        const bestPlayer = row.fideData?.[0];
        const rating = bestPlayer ? bestPlayer[ratingType] : '';
        const frtgValue = rating && rating.trim() !== '' ? rating : '0';

        const lineData = [...headers.map(header => row[header] || ''), frtgValue];
        outputLines.push(lineData.join('\t'));
    });
    
    return outputLines.join('\n');
} 