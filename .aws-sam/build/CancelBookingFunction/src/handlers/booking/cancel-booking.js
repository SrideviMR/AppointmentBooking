"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
exports.cancelBooking = cancelBooking;
const response_1 = require("../../utils/response");
const validators_1 = require("../../utils/validators");
const booking_service_1 = require("../../services/booking-service");
async function cancelBooking(event) {
    const startTime = Date.now();
    const bookingId = event.pathParameters?.bookingId;
    try {
        // Input validation
        const validation = validators_1.validators.bookingId(bookingId);
        if (!validation.isValid) {
            return (0, response_1.validationError)(validation.error);
        }
        console.log("Starting booking cancellation", { bookingId });
        // Business logic
        const result = await booking_service_1.bookingService.cancelBooking({ bookingId: bookingId });
        console.log("Booking cancellation completed", {
            bookingId,
            duration: Date.now() - startTime
        });
        return (0, response_1.successResponse)(result);
    }
    catch (error) {
        const duration = Date.now() - startTime;
        if (error instanceof booking_service_1.BookingNotFoundError) {
            console.warn("Booking not found", { bookingId, duration });
            return (0, response_1.notFoundError)("Booking not found");
        }
        if (error instanceof booking_service_1.BookingConflictError) {
            console.warn("Booking conflict", { bookingId, error: error.message, duration });
            return (0, response_1.conflictError)(error.message);
        }
        if (error instanceof booking_service_1.ServiceUnavailableError) {
            console.error("Service unavailable", { bookingId, error: error.message, duration });
            return (0, response_1.internalError)(error.message);
        }
        console.error("Unexpected error during booking cancellation", {
            bookingId,
            error: error.message,
            duration
        });
        return (0, response_1.internalError)("Failed to cancel booking");
    }
}
// Export handler for Lambda compatibility
exports.handler = cancelBooking;
//# sourceMappingURL=cancel-booking.js.map