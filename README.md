# FIDE Player Data Processor

A simple web tool for processing chess player lists and fetching their FIDE ratings.

## Features
- Paste or open a tab-separated list of players (from Excel or similar)
- Fetches Standard, Rapid, and Blitz FIDE ratings for each player
- Displays results in a table with per-row loading indicators
- "Sync Back" updates the textbox with tab-separated results (ready for re-processing)
- "Copy" provides a space-aligned, pretty table for pasting elsewhere
- Supports concurrent lookups for faster processing
- Caches FIDE lookups locally for the current month

## Usage
1. **Paste or Open File**: Paste your player list (tab-separated) or use the "Open File" button to load a `.txt` file.
2. **Process**: Click "Process" to fetch FIDE ratings. Each row will show a loading spinner until complete.
3. **Sync Back**: Click "Sync Back" to update the textbox with the results (tab-separated, ready for re-processing).
4. **Copy**: Click "Copy" to copy a space-aligned table for easy pasting into emails or documents.
5. **Force Refresh**: Use this to bypass the cache and fetch fresh data from FIDE.

## Input Format
- The first row must be headers (e.g., `FirstName`, `LastName`, etc.)
- Columns must be tab-separated (as from Excel's "Copy" or a TSV file)
- Example:

```
#   TicketType   FirstName   LastName
1   U10 Girls    Kaylin      Zhang
2   U10 Girls    Lana        Ram
```

## Development
- Built with Next.js and React
- All FIDE lookups are done client-side via a CORS proxy
- No server-side code required for deployment

---

**Enjoy fast, accurate FIDE data processing for your chess events!**
