"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
exports.createBooking = createBooking;
const response_1 = require("../../utils/response");
const logger_1 = require("../../utils/logger");
const validators_1 = require("../../utils/validators");
const booking_service_1 = require("../../services/booking-service");
async function createBooking(event) {
    const startTime = Date.now();
    try {
        console.log("Create booking request received", { body: event.body });
        logger_1.logger.info("Create booking request received", { event });
        if (!event.body) {
            return (0, response_1.validationError)("Request body is required");
        }
        const input = JSON.parse(event.body);
        // Input validation
        const validation = validators_1.validators.createBookingInput(input);
        if (!validation.isValid) {
            return (0, response_1.validationError)(validation.error);
        }
        // Business logic
        const result = await booking_service_1.bookingService.createBooking({
            providerId: input.providerId,
            slotId: input.slotId,
            userId: input.userId,
        });
        console.log("Booking creation completed", {
            bookingId: result.bookingId,
            duration: Date.now() - startTime
        });
        return (0, response_1.successResponse)(result, 202); // 202 Accepted
    }
    catch (error) {
        const duration = Date.now() - startTime;
        if (error instanceof booking_service_1.SlotUnavailableError) {
            console.warn("Slot unavailable", { error: error.message, duration });
            return (0, response_1.validationError)(error.message);
        }
        if (error instanceof booking_service_1.ServiceUnavailableError) {
            console.error("Service unavailable", { error: error.message, duration });
            return (0, response_1.internalError)(error.message);
        }
        console.error("Unexpected error creating booking", {
            error: error.message,
            duration
        });
        return (0, response_1.internalError)("Failed to create booking");
    }
}
// Export handler for Lambda compatibility
exports.handler = createBooking;
//# sourceMappingURL=create-booking.js.map