export type ProviderType = "DOCTOR" | "SALON" | "SERVICE";
export interface Provider {
    PK: string;
    SK: string;
    name: string;
    type: ProviderType;
    createdAt: string;
}
export interface CreateProviderInput {
    providerId: string;
    name: string;
    type: ProviderType;
}
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
export type BookingState = "PENDING" | "CONFIRMED" | "EXPIRED" | "CANCELLED";
export interface Booking {
    PK: string;
    SK: string;
    providerId: string;
    slotId: string;
    userId: string;
    state: BookingState;
    createdAt: string;
    expiresAt: string;
    confirmedAt?: string;
    cancelledAt?: string;
    GSI1PK: string;
    GSI1SK: string;
    GSI2PK: string;
    GSI2SK: string;
    GSI3PK: string;
    GSI3SK: string;
}
export interface CreateBookingInput {
    providerId: string;
    slotId: string;
    userId: string;
}
export interface CreateBookingResponse {
    bookingId: string;
    status: BookingState;
    expiresAt: string;
}
export interface BookingQueueMessage {
    bookingId: string;
    providerId: string;
    slotId: string;
    userId: string;
    timestamp: string;
}
export interface ApiResponse<T = any> {
    statusCode: number;
    body: string;
    headers: {
        "Content-Type": string;
        "Access-Control-Allow-Origin": string;
    };
}
export interface ErrorResponse {
    error: string;
    message: string;
}
export declare const Keys: {
    provider: (providerId: string) => {
        PK: string;
        SK: string;
    };
    availability: (providerId: string, date: string) => {
        PK: string;
        SK: string;
    };
    slot: (providerId: string, date: string, time: string) => {
        PK: string;
        SK: string;
    };
    booking: (bookingId: string) => {
        PK: string;
        SK: string;
    };
};
export interface TimeSlot {
    time: string;
    available: boolean;
    reservedBy?: string;
}
//# sourceMappingURL=index.d.ts.map