"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const logger_1 = require("../../utils/logger");
const response_1 = require("../../utils/response");
const booking_dao_1 = require("../../dao/booking-dao");
const slot_dao_1 = require("../../dao/slot-dao");
async function handler(event) {
    const bookingId = event.pathParameters?.bookingId;
    logger_1.logger.info("Confirm booking request received", { bookingId });
    try {
        if (!bookingId) {
            logger_1.logger.warn("Missing bookingId in path");
            return (0, response_1.validationError)("bookingId is required");
        }
        const booking = await booking_dao_1.bookingDao.getBookingById(bookingId);
        if (!booking) {
            logger_1.logger.info("Booking not found", { bookingId });
            return (0, response_1.notFoundError)("Booking");
        }
        logger_1.logger.info("Attempting slot confirmation", {
            bookingId,
            providerId: booking.providerId,
            slotId: booking.slotId,
        });
        const slotConfirmed = await slot_dao_1.slotDao.confirmSlot(booking.providerId, booking.slotId, bookingId);
        if (!slotConfirmed) {
            logger_1.logger.warn("Slot confirmation failed", {
                bookingId,
                slotId: booking.slotId,
            });
            return (0, response_1.conflictError)("Slot is no longer held by this booking");
        }
        await booking_dao_1.bookingDao.confirm(bookingId);
        logger_1.logger.info("Booking confirmed successfully", {
            bookingId,
        });
        return (0, response_1.successResponse)({
            bookingId,
            state: "CONFIRMED",
        });
    }
    catch (error) {
        logger_1.logger.error("Unexpected error during booking confirmation", {
            bookingId,
            error: error.message,
        });
        return (0, response_1.internalError)(error.message);
    }
}
//# sourceMappingURL=confirm-booking.js.map