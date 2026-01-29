export declare const slotDao: {
    holdSlot: (providerId: string, slotId: string, bookingId: string, holdExpiresAt: string) => Promise<boolean>;
    confirmSlot: (providerId: string, slotId: string, bookingId: string) => Promise<boolean>;
    releaseSlot: (providerId: string, slotId: string, bookingId: string) => Promise<boolean>;
};
//# sourceMappingURL=slot-dao.d.ts.map