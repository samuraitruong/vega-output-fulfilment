export interface FidePlayer {
    fideId: string;
    name: string;
    title: string;
    trainerTitle: string;
    federation: string;
    standard: string;
    rapid: string;
    blitz: string;
    birthYear: string;
}

export interface InputRow {
    id: string;
    ticketType?: string;
    firstName: string;
    lastName: string;
    [key: string]: string | undefined;
}

export interface ProcessedRow {
    [key: string]: string | FidePlayer | boolean | number | undefined;
    fideData?: FidePlayer;
    searchOrder?: string;
    isAccurate?: boolean;
    originalIndex: number;
    isValid?: boolean;
    invalidReason?: string;
} 