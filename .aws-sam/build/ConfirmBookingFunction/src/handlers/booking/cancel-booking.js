"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const types_1 = require("../../types");
const response_1 = require("../../utils/response");
const time_1 = require("../../utils/time");
const booking_dao_1 = require("../../dao/booking-dao");
const slot_dao_1 = require("../../dao/slot-dao");
async function handler(event) {
    try {
        const bookingId = event.pathParameters?.bookingId;
        if (!bookingId) {
            return (0, response_1.validationError)("bookingId is required");
        }
        const bookingKeys = types_1.Keys.booking(bookingId);
        // Get booking details
        const booking = await booking_dao_1.bookingDao.getBookingById(bookingId);
        if (!booking) {
            return (0, response_1.notFoundError)("Booking");
        }
        try {
            // Update booking state with condition
            await booking_dao_1.bookingDao.cancel(bookingId);
            // Release the slot
            const [date, time] = booking.slotId.split("#");
            // const slotKeys = Keys.slot(booking.providerId, date, time);
            await slot_dao_1.slotDao.releaseSlot(booking.providerId, booking.slotId, bookingId);
            // await updateItem(
            //   slotKeys,
            //   "SET #status = :available REMOVE heldBy, reservedAt",
            //   {
            //     ":available": "AVAILABLE",
            //     ":bookingId": bookingId,
            //   },
            //   {
            //     "#status": "status",
            //   },
            //   "heldBy = :bookingId"
            // );
            return (0, response_1.successResponse)({
                bookingId,
                state: "CANCELLED",
                cancelledAt: (0, time_1.getCurrentTimestamp)(),
                message: "Booking cancelled and slot released",
            });
        }
        catch (error) {
            if (error.name === "ConditionalCheckFailedException") {
                return (0, response_1.conflictError)(`Booking cannot be cancelled. Current state: ${booking.state}`);
            }
            throw error;
        }
    }
    catch (error) {
        console.error("Error cancelling booking:", error);
        return (0, response_1.internalError)(error.message);
    }
}
//# sourceMappingURL=cancel-booking.js.map