export type SlotStatus = "AVAILABLE" | "RESERVED" | "BOOKED";
export interface Slot {
    PK: string;
    SK: string;
    status: SlotStatus;
    reservedBy?: string;
    reservedAt?: string;
}
export interface GetSlotsQuery {
    date: string;
}
export interface TimeSlot {
    time: string;
    available: boolean;
    reservedBy?: string;
}
//# sourceMappingURL=slot.d.ts.map