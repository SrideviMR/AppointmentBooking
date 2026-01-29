export type SlotStatus = "AVAILABLE" | "HELD" | "BOOKED";
export interface Slot {
    PK: string;
    SK: string;
    status: SlotStatus;
    reservedBy?: string;
    reservedAt?: string;
    heldBy?: string;
    holdExpiresAt?: string;
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