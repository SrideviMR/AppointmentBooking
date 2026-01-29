"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const response_1 = require("../../utils/response");
const time_1 = require("../../utils/time");
const crypto_1 = require("crypto");
const logger_1 = require("../../utils/logger");
const slot_dao_1 = require("../../dao/slot-dao");
const booking_dao_1 = require("../../dao/booking-dao");
const sqs_1 = require("../../utils/sqs");
const dynamodb_1 = require("../../utils/dynamodb");
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
        const [date, time] = input.slotId.split("#");
        // 1. Fetch the slot
        const slotItems = await (0, dynamodb_1.queryItems)("PK = :pk AND SK = :sk", {
            ":pk": `PROVIDER#${input.providerId}`,
            ":sk": `SLOT#${date}#${time}`,
        });
        if (!slotItems || slotItems.length === 0) {
            return (0, response_1.validationError)("Slot does not exist. Please create availability first.");
        }
        const slot = slotItems[0];
        // 2. Check slot status
        if (slot.status === "HELD" && slot.holdExpiresAt && new Date(slot.holdExpiresAt) > new Date()) {
            return (0, response_1.validationError)(`Slot is held by another user until ${slot.holdExpiresAt}`);
        }
        else if (slot.status === "BOOKED") {
            return (0, response_1.validationError)("Slot is already booked. Please select another slot.");
        }
        // Generate booking ID
        const bookingId = `booking-${(0, crypto_1.randomUUID)()}`;
        const expiresAt = (0, time_1.generateExpirationTime)(5);
        try {
            const held = await slot_dao_1.slotDao.holdSlot(input.providerId, input.slotId, bookingId, expiresAt);
            if (!held) {
                return (0, response_1.validationError)("Slot is held by another booking");
            }
        }
        catch (err) {
            if (err.name === "xConditionalCheckFailedException") {
                return (0, response_1.validationError)("Slot is held by another booking");
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
        await (0, sqs_1.sendMessage)({ QueueUrl: QUEUE_URL, MessageBody: JSON.stringify(message) });
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