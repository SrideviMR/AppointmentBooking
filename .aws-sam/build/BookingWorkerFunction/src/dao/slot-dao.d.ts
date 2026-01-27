export declare const slotDao: {
    holdSlot: (providerId: string, slotId: string, bookingId: string, holdExpiresAt: string) => Promise<import("@aws-sdk/lib-dynamodb").UpdateCommandOutput>;
    confirmSlot: (providerId: string, slotId: string, bookingId: string) => Promise<import("@aws-sdk/lib-dynamodb").UpdateCommandOutput>;
    releaseSlot: (providerId: string, slotId: string, bookingId: string) => Promise<import("@aws-sdk/lib-dynamodb").UpdateCommandOutput>;
};
//# sourceMappingURL=slot-dao.d.ts.map