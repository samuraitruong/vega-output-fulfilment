'use client';

import { useState, useCallback } from 'react';

export const useFileLoader = () => {
    const [text, setText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadFile = useCallback(async (filePath: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`Failed to fetch file: ${response.statusText}`);
            }
            const fileContent = await response.text();
            setText(fileContent);
        } catch (err: any) {
            console.error(`Failed to load file from ${filePath}:`, err);
            setError(err.message || 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { text, setText, loadFile, isLoading, error };
}; 