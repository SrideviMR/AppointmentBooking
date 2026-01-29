"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const dynamodb_1 = require("../../utils/dynamodb");
const response_1 = require("../../utils/response");
const logger_1 = require("../../utils/logger");
async function handler(event) {
    const providerId = event.pathParameters?.providerId;
    const date = event.queryStringParameters?.date;
    logger_1.logger.info("GetSlots invoked", {
        providerId,
        date,
        requestId: event.requestContext?.requestId,
    });
    try {
        // --- Validation ---
        if (!providerId) {
            logger_1.logger.warn("Missing providerId");
            return (0, response_1.validationError)("providerId is required");
        }
        if (!date) {
            logger_1.logger.warn("Missing date query parameter");
            return (0, response_1.validationError)("date query parameter is required");
        }
        // Basic date format validation: YYYY-MM-DD
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            logger_1.logger.warn("Invalid date format", { date });
            return (0, response_1.validationError)("date must be in YYYY-MM-DD format");
        }
        // --- Query DynamoDB ---
        const slotsRaw = await (0, dynamodb_1.queryItems)("PK = :pk AND begins_with(SK, :sk)", {
            ":pk": `PROVIDER#${providerId}`,
            ":sk": `SLOT#${date}`,
        });
        // If no slots found
        if (!slotsRaw || slotsRaw.length === 0) {
            logger_1.logger.info("No slots found for provider and date", { providerId, date });
            return (0, response_1.successResponse)({
                providerId,
                date,
                availableSlots: [],
                count: 0,
                message: "No slots available for this provider on the given date",
            });
        }
        // --- Filter and map slots ---
        const slots = slotsRaw;
        const availableSlots = slots
            .filter((slot) => slot.status === "AVAILABLE")
            .map((slot) => {
            const timeParts = slot.SK.split("#");
            const time = timeParts[2] || "unknown"; // fallback if SK format is incorrect
            return {
                time,
                status: slot.status,
                slotId: `${date}#${time}`,
            };
        })
            .sort((a, b) => a.time.localeCompare(b.time));
        return (0, response_1.successResponse)({
            providerId,
            date,
            availableSlots,
            count: availableSlots.length,
        });
    }
    catch (error) {
        logger_1.logger.error("Error fetching slots", {
            providerId,
            date,
            errorName: error?.name,
            errorMessage: error?.message,
            stack: error?.stack,
        });
        // Handle DynamoDB-specific errors
        if (error.name === "ValidationException") {
            return (0, response_1.validationError)("Invalid query parameters for DynamoDB");
        }
        return (0, response_1.internalError)("Failed to fetch slots: " + error.message);
    }
}
//# sourceMappingURL=get-slot.js.map