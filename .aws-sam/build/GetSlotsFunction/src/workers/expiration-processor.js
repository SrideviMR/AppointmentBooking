"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const db_keys_1 = require("../types/db-keys");
const dynamodb_1 = require("../utils/dynamodb");
const time_1 = require("../utils/time");
const booking_dao_1 = require("../dao/booking-dao");
async function handler(event) {
    console.log("Running expiration worker at:", event.time);
    try {
        // Query expired PENDING bookings using GSI3
        const expiredBookings = await (0, dynamodb_1.queryItems)("GSI3PK = :status AND GSI3SK < :now", {
            ":status": "STATUS#PENDING",
            ":now": `EXPIRES#${(0, time_1.getCurrentTimestamp)()}`,
        }, undefined, undefined, "GSI3");
        console.log(`Found ${expiredBookings.length} expired bookings`);
        if (expiredBookings.length === 0) {
            return;
        }
        // Process each expired booking
        const results = await Promise.allSettled(expiredBookings.map((booking) => expireBooking(booking)));
        // Log results
        const succeeded = results.filter((r) => r.status === "fulfilled").length;
        const failed = results.filter((r) => r.status === "rejected").length;
        console.log(`Expired ${succeeded} bookings, ${failed} failures`);
    }
    catch (error) {
        console.error("Error in expiration worker:", error);
        throw error;
    }
}
async function expireBooking(booking) {
    const bookingId = booking.PK.replace("BOOKING#", "");
    console.log(`Expiring booking ${bookingId}`);
    try {
        // Step 1: Update booking state to EXPIRED
        const bookingKeys = db_keys_1.Keys.booking(bookingId);
        await booking_dao_1.bookingDao.expire(bookingId);
        // Step 2: Release the slot
        const [date, time] = booking.slotId.split("#");
        const slotKeys = db_keys_1.Keys.slot(booking.providerId, date, time);
        await (0, dynamodb_1.updateItem)(slotKeys, "SET #status = :available REMOVE heldBy, reservedAt", {
            ":available": "AVAILABLE",
            ":bookingId": bookingId,
        }, {
            "#status": "status",
        }, "heldBy = :bookingId");
        console.log(`Booking ${bookingId} expired and slot released`);
    }
    catch (error) {
        if (error.name === "ConditionalCheckFailedException") {
            console.log(`Booking ${bookingId} already processed`);
            return;
        }
        throw error;
    }
}
//# sourceMappingURL=expiration-processor.js.map