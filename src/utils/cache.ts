const CACHE_PREFIX = 'fide-cache-';
const INVALID_MATCHES_PREFIX = 'fide-invalid-';

/**
 * Generates a cache key that is specific to the current month and the search term.
 * This ensures that cached data automatically expires at the beginning of a new month.
 * @param searchTerm The term being searched for.
 * @returns A unique cache key string.
 */
function getCacheKey(searchTerm: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const sanitizedSearchTerm = searchTerm.replace(/\s+/g, '').toLowerCase();
    return `${CACHE_PREFIX}${year}-${month}-${sanitizedSearchTerm}`;
}

/**
 * Represents the structure of a cached entry.
 */
interface CacheEntry<T> {
    timestamp: number;
    data: T;
}

/**
 * Saves a value to the monthly cache in localStorage.
 * @param key The original search term.
 * @param data The data to be cached.
 */
export function setCache<T>(key: string, data: T): void {
    if (typeof window === 'undefined') return;

    const cacheKey = getCacheKey(key);
    const entry: CacheEntry<T> = {
        timestamp: new Date().getTime(),
        data,
    };

    try {
        localStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch (error) {
        console.error("Error setting cache. LocalStorage might be full.", error);
        // If storage is full, run a cleanup to make space.
        cleanupOldCache();
    }
}

/**
 * Retrieves a value from the cache if it exists for the current month.
 * @param key The original search term.
 * @returns The cached data, or null if not found or expired.
 */
export function getCache<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    
    const cacheKey = getCacheKey(key);
    const item = localStorage.getItem(cacheKey);

    if (!item) {
        return null;
    }

    try {
        const entry: CacheEntry<T> = JSON.parse(item);
        // The key already ensures it's for the current month.
        return entry.data;
    } catch (error) {
        console.error("Error parsing cache item:", error);
        return null;
    }
}

/**
 * Removes all cache entries that are not from the current month.
 * This prevents localStorage from filling up with stale data.
 */
export function cleanupOldCache(): void {
    if (typeof window === 'undefined') return;

    const now = new Date();
    const currentMonthKeyPart = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

    Object.keys(localStorage).forEach(key => {
        if (key && key.startsWith(CACHE_PREFIX)) {
            const keyParts = key.split('-');
            // A valid key looks like "fide-cache-YYYY-MM-searchterm"
            if (keyParts.length >= 4) {
                const keyDatePart = `${keyParts[2]}-${keyParts[3]}`;
                if (keyDatePart !== currentMonthKeyPart) {
                    localStorage.removeItem(key);
                }
            }
        }
    });
}

/**
 * Stores an invalid match in a separate cache that doesn't expire monthly
 */
export function setInvalidMatch(searchTerm: string, fideId: string): void {
    if (typeof window === 'undefined') return;
    
    const key = `${INVALID_MATCHES_PREFIX}${searchTerm.replace(/\s+/g, '').toLowerCase()}`;
    try {
        const invalidMatches = getInvalidMatches(searchTerm) || [];
        if (!invalidMatches.includes(fideId)) {
            invalidMatches.push(fideId);
            localStorage.setItem(key, JSON.stringify(invalidMatches));
        }
    } catch (error) {
        console.error("Error setting invalid match:", error);
    }
}

/**
 * Gets the list of invalid FIDE IDs for a given search term
 */
export function getInvalidMatches(searchTerm: string): string[] {
    if (typeof window === 'undefined') return [];
    
    const key = `${INVALID_MATCHES_PREFIX}${searchTerm.replace(/\s+/g, '').toLowerCase()}`;
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : [];
    } catch (error) {
        console.error("Error getting invalid matches:", error);
        return [];
    }
}

/**
 * Removes an invalid match from the cache
 */
export function removeInvalidMatch(searchTerm: string, fideId: string): void {
    if (typeof window === 'undefined') return;
    
    const key = `${INVALID_MATCHES_PREFIX}${searchTerm.replace(/\s+/g, '').toLowerCase()}`;
    try {
        const invalidMatches = getInvalidMatches(searchTerm);
        const updatedMatches = invalidMatches.filter(id => id !== fideId);
        localStorage.setItem(key, JSON.stringify(updatedMatches));
    } catch (error) {
        console.error("Error removing invalid match:", error);
    }
} 