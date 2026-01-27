"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const types_1 = require("../../types");
const booking_dao_1 = require("../../dao/booking-dao");
const response_1 = require("../../utils/response");
async function handler(event) {
    try {
        const bookingId = event.pathParameters?.bookingId;
        if (!bookingId) {
            return (0, response_1.validationError)("bookingId is required");
        }
        const bookingKeys = types_1.Keys.booking(bookingId);
        const booking = await booking_dao_1.bookingDao.getBookingById(bookingId);
        if (!booking) {
            return (0, response_1.notFoundError)("Booking");
        }
        // Return booking details
        return (0, response_1.successResponse)({
            bookingId: booking.PK.replace("BOOKING#", ""),
            providerId: booking.providerId,
            slotId: booking.slotId,
            userId: booking.userId,
            state: booking.state,
            createdAt: booking.createdAt,
            expiresAt: booking.expiresAt,
            confirmedAt: booking.confirmedAt,
            cancelledAt: booking.cancelledAt,
        });
    }
    catch (error) {
        console.error("Error getting booking:", error);
        return (0, response_1.internalError)(error.message);
    }
}
//# sourceMappingURL=get-booking.js.map