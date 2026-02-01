export declare const slotDao: {
    holdSlot: (providerId: string, slotId: string, bookingId: string, holdExpiresAt: string) => Promise<boolean>;
    confirmSlot: (providerId: string, slotId: string, bookingId: string) => Promise<boolean>;
    releaseSlot: (providerId: string, slotId: string, bookingId: string) => Promise<boolean>;
    cancelBookingAndReleaseSlot: (bookingId: string, providerId: string, slotId: string) => Promise<void>;
};
//# sourceMappingURL=slot-dao.d.ts.map