"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const time_1 = require("../utils/time");
const logger_1 = require("../utils/logger");
const booking_dao_1 = require("../dao/booking-dao");
async function handler(event) {
    logger_1.logger.info(`Processing ${event.Records.length} booking requests`);
    const results = await Promise.allSettled(event.Records.map((record) => processBooking(record)));
    // Log failures
    results.forEach((result, index) => {
        if (result.status === "rejected") {
            logger_1.logger.error(`Failed to process record ${index}:`, result.reason);
        }
    });
}
async function processBooking(record) {
    const message = JSON.parse(record.body);
    logger_1.logger.info("Processing booking:", { message });
    const { bookingId, providerId, slotId, userId } = message;
    try {
        // Create booking record (slot is already held)
        const expiresAt = (0, time_1.generateExpirationTime)(5);
        await booking_dao_1.bookingDao.createPendingBooking({
            bookingId,
            providerId,
            slotId,
            userId,
            expiresAt
        });
        logger_1.logger.info(`Booking ${bookingId} created successfully`);
    }
    catch (error) {
        logger_1.logger.error(`Error processing booking ${bookingId}:`, error);
        throw error; // Let SQS handle retry
    }
}
//# sourceMappingURL=booking-processor.js.map