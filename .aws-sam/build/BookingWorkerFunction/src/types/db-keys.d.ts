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
//# sourceMappingURL=db-keys.d.ts.map