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
//# sourceMappingURL=booking.d.ts.map