"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const types_1 = require("../../types");
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
        const input = JSON.parse(event.body);
        // Validation
        if (!input.date || !input.startTime || !input.endTime || !input.slotDurationMinutes) {
            return (0, response_1.validationError)("date, startTime, endTime, and slotDurationMinutes are required");
        }
        // Verify provider exists
        const providerKeys = types_1.Keys.provider(providerId);
        const provider = await (0, dynamodb_1.getItem)(providerKeys);
        if (!provider) {
            return (0, response_1.notFoundError)("Provider");
        }
        // Create availability window
        const availabilityKeys = types_1.Keys.availability(providerId, input.date);
        const availability = {
            ...availabilityKeys,
            startTime: input.startTime,
            endTime: input.endTime,
            slotDurationMinutes: input.slotDurationMinutes,
            createdAt: (0, time_1.getCurrentTimestamp)(),
        };
        await (0, dynamodb_1.putItem)(availability);
        // Generate time slots
        const timeSlots = (0, time_1.generateTimeSlots)(input.startTime, input.endTime, input.slotDurationMinutes);
        // Create slot items
        const slotItems = timeSlots.map((time) => {
            const slotKeys = types_1.Keys.slot(providerId, input.date, time);
            return {
                ...slotKeys,
                status: "AVAILABLE",
            };
        });
        // Batch write slots
        await (0, dynamodb_1.batchWriteItems)(slotItems);
        return (0, response_1.successResponse)({
            providerId,
            date: input.date,
            startTime: input.startTime,
            endTime: input.endTime,
            slotDurationMinutes: input.slotDurationMinutes,
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