"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const client_sqs_1 = require("@aws-sdk/client-sqs");
const response_1 = require("../../utils/response");
const time_1 = require("../../utils/time");
const crypto_1 = require("crypto");
const logger_1 = require("../../utils/logger");
const slot_dao_1 = require("../../dao/slot-dao");
const booking_dao_1 = require("../../dao/booking-dao");
const sqsClient = new client_sqs_1.SQSClient({});
const QUEUE_URL = process.env.BOOKING_QUEUE_URL;
async function handler(event) {
    console.log("Create booking request received:", event.body);
    logger_1.logger.info("Create booking request received:", { event });
    try {
        if (!event.body) {
            return (0, response_1.validationError)("Request body is required");
        }
        const input = JSON.parse(event.body);
        // Validation
        if (!input.providerId || !input.slotId || !input.userId) {
            return (0, response_1.validationError)("providerId, slotId, and userId are required");
        }
        // Validate slotId format (date#time)
        const slotParts = input.slotId.split("#");
        if (slotParts.length !== 2) {
            return (0, response_1.validationError)("slotId must be in format date#time (e.g., 2026-02-10#10:00)");
        }
        // Generate booking ID
        const bookingId = `booking-${(0, crypto_1.randomUUID)()}`;
        const expiresAt = (0, time_1.generateExpirationTime)(5);
        try {
            await slot_dao_1.slotDao.holdSlot(input.providerId, input.slotId, bookingId, expiresAt);
        }
        catch (err) {
            if (err.name === "ConditionalCheckFailedException") {
                return (0, response_1.validationError)("Slot already booked");
            }
            throw err;
        }
        await booking_dao_1.bookingDao.createPendingBooking({
            bookingId,
            providerId: input.providerId,
            slotId: input.slotId,
            userId: input.userId,
            expiresAt
        });
        // Create SQS message
        const message = {
            bookingId,
            providerId: input.providerId,
            slotId: input.slotId,
            userId: input.userId,
            timestamp: (0, time_1.getCurrentTimestamp)(),
        };
        // Send to SQS queue
        await sqsClient.send(new client_sqs_1.SendMessageCommand({
            QueueUrl: QUEUE_URL,
            MessageBody: JSON.stringify(message),
            MessageAttributes: {
                bookingId: {
                    DataType: "String",
                    StringValue: bookingId,
                },
            },
        }));
        const response = {
            bookingId,
            status: "PENDING",
            expiresAt: (0, time_1.generateExpirationTime)(5), // 5 minutes from now
        };
        return (0, response_1.successResponse)(response, 202); // 202 Accepted
    }
    catch (error) {
        console.error("Error creating booking:", error);
        return (0, response_1.internalError)(error.message);
    }
}
//# sourceMappingURL=create-booking.js.map