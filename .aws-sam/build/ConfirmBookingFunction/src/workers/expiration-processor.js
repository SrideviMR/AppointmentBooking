"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const booking_dao_1 = require("../dao/booking-dao");
const slot_dao_1 = require("../dao/slot-dao");
const logger_1 = require("../utils/logger");
async function handler(event) {
    logger_1.logger.info(`Processing ${event.Records.length} stream records`);
    const results = await Promise.allSettled(event.Records.map(record => processStreamRecord(record)));
    const succeeded = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;
    logger_1.logger.info(`Stream processing completed: ${succeeded} succeeded, ${failed} failed`);
    // Log failures for monitoring
    results.forEach((result, index) => {
        if (result.status === "rejected") {
            logger_1.logger.error(`Stream record ${index} failed:`, result.reason);
        }
    });
}
async function processStreamRecord(record) {
    // Only process TTL deletions of expiration triggers
    if (record.eventName !== "REMOVE" ||
        !record.dynamodb?.OldImage ||
        record.dynamodb.OldImage.SK?.S !== "EXPIRATION_TRIGGER") {
        return;
    }
    const oldImage = record.dynamodb.OldImage;
    const bookingId = oldImage.bookingId?.S;
    const providerId = oldImage.providerId?.S;
    const slotId = oldImage.slotId?.S;
    if (!bookingId || !providerId || !slotId) {
        logger_1.logger.warn("Missing required fields in stream record", { oldImage });
        return;
    }
    logger_1.logger.info(`Processing expiration for booking ${bookingId}`);
    try {
        // Update booking to EXPIRED (only if still PENDING)
        await booking_dao_1.bookingDao.expire(bookingId);
        // Release slot (only if still held by this booking)
        await slot_dao_1.slotDao.releaseSlot(providerId, slotId, bookingId);
        logger_1.logger.info(`Successfully expired booking ${bookingId} and released slot`);
    }
    catch (error) {
        if (error.name === "ConditionalCheckFailedException") {
            logger_1.logger.info(`Booking ${bookingId} already processed or slot not held`);
            return;
        }
        logger_1.logger.error(`Failed to process expiration for booking ${bookingId}:`, error);
        throw error; // Re-throw to trigger retry
    }
}
//# sourceMappingURL=expiration-processor.js.map