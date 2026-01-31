"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingDao = void 0;
const dynamodb_1 = require("../utils/dynamodb");
const db_keys_1 = require("../types/db-keys");
const time_1 = require("../utils/time");
const createPendingBooking = async ({ bookingId, providerId, slotId, userId, expiresAt }) => {
    const ttlTimestamp = Math.floor(new Date(expiresAt).getTime() / 1000);
    // Create main booking record (no TTL)
    await (0, dynamodb_1.putItem)({
        ...db_keys_1.Keys.booking(bookingId),
        providerId,
        slotId,
        userId,
        state: "PENDING",
        createdAt: (0, time_1.getCurrentTimestamp)(),
        expiresAt,
        GSI1PK: `USER#${userId}`,
        GSI1SK: `BOOKING#${(0, time_1.getCurrentTimestamp)()}`,
        GSI2PK: `PROVIDER#${providerId}`,
        GSI2SK: `BOOKING#${(0, time_1.getCurrentTimestamp)()}`,
    });
    // Create TTL trigger record
    return (0, dynamodb_1.putItem)({
        PK: `BOOKING#${bookingId}`,
        SK: "EXPIRATION_TRIGGER",
        bookingId,
        providerId,
        slotId,
        ttl: ttlTimestamp, // Exact expiration time
    });
};
const getBookingById = async (bookingId) => {
    return (0, dynamodb_1.getItem)(db_keys_1.Keys.booking(bookingId));
};
const updateBookingState = async ({ bookingId, from, to, extraUpdates = {}, }) => {
    const allowedStates = Array.isArray(from) ? from : [from];
    return (0, dynamodb_1.updateItem)(db_keys_1.Keys.booking(bookingId), `
        SET #state = :to
        ${Object.keys(extraUpdates).length > 0 ? `, ${Object.keys(extraUpdates).map(k => `${k} = :${k}`).join(", ")}` : ""}
      `, {
        ":to": to,
        ...Object.fromEntries(Object.entries(extraUpdates).map(([k, v]) => [`:${k}`, v])),
        ...allowedStates.reduce((acc, s, i) => ({ ...acc, [`:from${i}`]: s }), {}),
    }, { "#state": "state" }, `#state IN (${allowedStates.map((_, i) => `:from${i}`).join(", ")})`);
};
exports.bookingDao = {
    createPendingBooking,
    updateBookingState,
    getBookingById,
    confirm: async (bookingId) => {
        await updateBookingState({
            bookingId,
            from: "PENDING",
            to: "CONFIRMED",
            extraUpdates: { confirmedAt: (0, time_1.getCurrentTimestamp)() },
        });
    },
    cancel: async (bookingId) => await updateBookingState({
        bookingId,
        from: ["PENDING", "CONFIRMED"],
        to: "CANCELLED",
        extraUpdates: { cancelledAt: (0, time_1.getCurrentTimestamp)() },
    }),
    expire: async (bookingId) => await updateBookingState({
        bookingId,
        from: "PENDING",
        to: "EXPIRED",
    }),
};
//# sourceMappingURL=booking-dao.js.map