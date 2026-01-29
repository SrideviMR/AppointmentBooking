"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const db_keys_1 = require("../../types/db-keys");
const dynamodb_1 = require("../../utils/dynamodb");
const response_1 = require("../../utils/response");
const time_1 = require("../../utils/time");
async function handler(event) {
    try {
        const providerId = event.pathParameters?.providerId;
        if (!providerId) {
            return (0, response_1.validationError)("providerId is required");
        }
        if (!event.body) {
            return (0, response_1.validationError)("Request body is required");
        }
        const body = JSON.parse(event.body);
        // Validation
        if (!body.date || !body.startTime || !body.endTime || !body.slotDurationMinutes) {
            return (0, response_1.validationError)("date, startTime, endTime, and slotDurationMinutes are required");
        }
        // Verify provider exists
        const providerKeys = db_keys_1.Keys.provider(providerId);
        const provider = await (0, dynamodb_1.getItem)(providerKeys);
        if (!provider) {
            return (0, response_1.notFoundError)("Provider");
        }
        // Create availability window
        const availabilityKeys = db_keys_1.Keys.availability(providerId, body.date);
        const availability = {
            ...availabilityKeys,
            startTime: body.startTime,
            endTime: body.endTime,
            slotDurationMinutes: body.slotDurationMinutes,
            createdAt: (0, time_1.getCurrentTimestamp)(),
        };
        await (0, dynamodb_1.putItem)(availability);
        // Generate time slots
        const timeSlots = (0, time_1.generateTimeSlots)(body.startTime, body.endTime, body.slotDurationMinutes);
        // Create slot items
        const slotItems = timeSlots.map((time) => {
            const slotKeys = db_keys_1.Keys.slot(providerId, body.date, time);
            return {
                ...slotKeys,
                status: "AVAILABLE",
            };
        });
        // Batch write slots
        await (0, dynamodb_1.batchWriteItems)(slotItems);
        return (0, response_1.successResponse)({
            providerId,
            date: body.date,
            startTime: body.startTime,
            endTime: body.endTime,
            slotDurationMinutes: body.slotDurationMinutes,
            slotsCreated: timeSlots.length,
            slots: timeSlots,
        }, 201);
    }
    catch (error) {
        console.error("Error creating availability:", error);
        return (0, response_1.internalError)(error.message);
    }
}
//# sourceMappingURL=create-availability.js.map