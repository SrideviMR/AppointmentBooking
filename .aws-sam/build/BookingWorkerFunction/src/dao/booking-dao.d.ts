import { Booking, BookingState } from "../types/booking";
export declare const bookingDao: {
    createPendingBooking: ({ bookingId, providerId, slotId, userId, expiresAt }: {
        bookingId: string;
        providerId: string;
        slotId: string;
        userId: string;
        expiresAt: string;
    }) => Promise<import("@aws-sdk/lib-dynamodb").PutCommandOutput>;
    updateBookingState: ({ bookingId, from, to, extraUpdates, }: {
        bookingId: string;
        from: BookingState | BookingState[];
        to: BookingState;
        extraUpdates?: Record<string, any>;
    }) => Promise<import("@aws-sdk/lib-dynamodb").UpdateCommandOutput>;
    getBookingById: (bookingId: string) => Promise<Booking | undefined>;
    confirm: (bookingId: string) => Promise<void>;
    cancel: (bookingId: string) => Promise<import("@aws-sdk/lib-dynamodb").UpdateCommandOutput>;
    expire: (bookingId: string) => Promise<import("@aws-sdk/lib-dynamodb").UpdateCommandOutput>;
};
//# sourceMappingURL=booking-dao.d.ts.map