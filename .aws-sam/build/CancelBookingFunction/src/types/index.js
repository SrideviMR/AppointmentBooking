"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Keys = void 0;
// DynamoDB Key Builders
exports.Keys = {
    provider: (providerId) => ({
        PK: `PROVIDER#${providerId}`,
        SK: "METADATA",
    }),
    availability: (providerId, date) => ({
        PK: `PROVIDER#${providerId}`,
        SK: `AVAILABILITY#${date}`,
    }),
    slot: (providerId, date, time) => ({
        PK: `PROVIDER#${providerId}`,
        SK: `SLOT#${date}#${time}`,
    }),
    booking: (bookingId) => ({
        PK: `BOOKING#${bookingId}`,
        SK: "METADATA",
    }),
};
//# sourceMappingURL=index.js.map