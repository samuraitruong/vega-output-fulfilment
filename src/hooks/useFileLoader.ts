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
        } catch (err) {
            console.error(`Failed to load file from ${filePath}:`, err);
            setError((err as Error).message || 'An unknown error occurred');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e: ProgressEvent<FileReader>) => {
                setText((e.target as FileReader).result as string);
            };
            reader.readAsText(file);
        }
    };

    return { text, setText, loadFile, isLoading, error, handleFileChange };
}; 