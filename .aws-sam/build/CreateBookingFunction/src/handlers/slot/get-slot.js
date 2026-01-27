"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const dynamodb_1 = require("../../utils/dynamodb");
const response_1 = require("../../utils/response");
async function handler(event) {
    try {
        const providerId = event.pathParameters?.providerId;
        const date = event.queryStringParameters?.date;
        if (!providerId) {
            return (0, response_1.validationError)("providerId is required");
        }
        if (!date) {
            return (0, response_1.validationError)("date query parameter is required");
        }
        // Query slots for the provider and date
        const slots = await (0, dynamodb_1.queryItems)("PK = :pk AND begins_with(SK, :sk)", {
            ":pk": `PROVIDER#${providerId}`,
            ":sk": `SLOT#${date}`,
        });
        // Filter for available slots
        const availableSlots = slots
            .filter((slot) => slot.status === "AVAILABLE")
            .map((slot) => {
            // Extract time from SK (format: SLOT#date#time)
            const time = slot.SK.split("#")[2];
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
        console.error("Error getting slots:", error);
        return (0, response_1.internalError)(error.message);
    }
}
//# sourceMappingURL=get-slot.js.map