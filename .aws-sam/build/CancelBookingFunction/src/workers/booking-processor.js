"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const types_1 = require("../types");
const dynamodb_1 = require("../utils/dynamodb");
const time_1 = require("../utils/time");
const logger_1 = require("../utils/logger");
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
    const { bookingId, providerId, slotId, userId, timestamp } = message;
    const [date, time] = slotId.split("#");
    try {
        // Step 1: Reserve the slot (conditional update)
        const slotKeys = types_1.Keys.slot(providerId, date, time);
        try {
            await (0, dynamodb_1.updateItem)(slotKeys, "SET #status = :reserved, reservedBy = :bookingId, reservedAt = :reservedAt", {
                ":reserved": "RESERVED",
                ":available": "AVAILABLE",
                ":bookingId": bookingId,
                ":reservedAt": (0, time_1.getCurrentTimestamp)(),
            }, {
                "#status": "status",
            }, "#status = :available");
            console.log(`Slot ${slotId} reserved successfully`);
        }
        catch (error) {
            if (error.name === "ConditionalCheckFailedException") {
                logger_1.logger.warn(`Slot ${slotId} is not available`);
                throw new Error("Slot is not available");
            }
            throw error;
        }
        // Step 2: Create booking record
        const bookingKeys = types_1.Keys.booking(bookingId);
        const expiresAt = (0, time_1.generateExpirationTime)(5);
        const booking = {
            ...bookingKeys,
            providerId,
            slotId,
            userId,
            state: "PENDING",
            createdAt: timestamp,
            expiresAt,
            // GSI keys
            GSI1PK: `USER#${userId}`,
            GSI1SK: `BOOKING#${timestamp}`,
            GSI2PK: `PROVIDER#${providerId}`,
            GSI2SK: `BOOKING#${timestamp}`,
            GSI3PK: "STATUS#PENDING",
            GSI3SK: `EXPIRES#${expiresAt}`,
        };
        await (0, dynamodb_1.putItem)(booking);
        logger_1.logger.info(`Booking ${bookingId} created successfully`);
    }
    catch (error) {
        logger_1.logger.error(`Error processing booking ${bookingId}:`, error);
        throw error; // Let SQS handle retry
    }
}
//# sourceMappingURL=booking-processor.js.map