export interface Availability {
    PK: string;
    SK: string;
    startTime: string;
    endTime: string;
    slotDurationMinutes: number;
    createdAt: string;
}
export interface CreateAvailabilityInput {
    date: string;
    startTime: string;
    endTime: string;
    slotDurationMinutes: number;
}
//# sourceMappingURL=availability.d.ts.map