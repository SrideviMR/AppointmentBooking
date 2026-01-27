"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const types_1 = require("../../types");
const response_1 = require("../../utils/response");
const booking_dao_1 = require("../../dao/booking-dao");
const slot_dao_1 = require("../../dao/slot-dao");
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
        if (booking.state !== "PENDING") {
            return (0, response_1.conflictError)(`Booking cannot be confirmed. Current state: ${booking.state}`);
        }
        const [date, time] = booking.slotId.split("#");
        // const slotKeys = Keys.slot(booking.providerId, date, time);
        /* 1️⃣ Confirm the slot (must be HELD by this booking) */
        try {
            await slot_dao_1.slotDao.confirmSlot(booking.providerId, booking.slotId, bookingId);
            // await updateItem(
            //   slotKeys,
            //   "SET #status = :confirmed, confirmedAt = :confirmedAt",
            //   {
            //     ":confirmed": "CONFIRMED",
            //     ":held": "HELD",
            //     ":bookingId": bookingId,
            //     ":confirmedAt": getCurrentTimestamp(),
            //   },
            //   {
            //     "#status": "status",
            //   },
            //   "#status = :held AND heldBy = :bookingId"
            // );
        }
        catch (err) {
            if (err.name === "ConditionalCheckFailedException") {
                return (0, response_1.conflictError)("Slot is no longer held by this booking");
            }
            throw err;
        }
        /* 2️⃣ Confirm the booking */
        const result = await booking_dao_1.bookingDao.confirm(bookingId);
        return (0, response_1.successResponse)({
            bookingId,
            state: "CONFIRMED",
            confirmedAt: result.Attributes?.confirmedAt,
        });
    }
    catch (error) {
        console.error("Error confirming booking:", error);
        return (0, response_1.internalError)(error.message);
    }
}
//# sourceMappingURL=confirm-booking.js.map