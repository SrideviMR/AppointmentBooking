"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cancel_booking_1 = require("../../src/handlers/booking/cancel-booking");
const slot_dao_1 = require("../../src/dao/slot-dao");
const booking_dao_1 = require("../../src/dao/booking-dao");
jest.mock("../../src/dao/slot-dao");
jest.mock("../../src/dao/booking-dao");
const mockSlotDao = slot_dao_1.slotDao;
const mockBookingDao = booking_dao_1.bookingDao;
describe("Booking Cancellation Integration Tests", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it("should cancel booking successfully", async () => {
        mockBookingDao.getBookingById.mockResolvedValue({
            PK: "BOOKING#booking1",
            SK: "METADATA",
            providerId: "provider1",
            slotId: "2024-01-01#10:00",
            state: "PENDING"
        });
        mockBookingDao.cancel.mockResolvedValue({});
        mockSlotDao.releaseSlot.mockResolvedValue(true);
        const event = {
            pathParameters: { bookingId: "booking1" }
        };
        const response = await (0, cancel_booking_1.handler)(event);
        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.state).toBe("CANCELLED");
        expect(body.message).toBe("Booking cancelled and slot released");
    });
    it("should handle booking not found", async () => {
        mockBookingDao.getBookingById.mockResolvedValue(undefined);
        const event = {
            pathParameters: { bookingId: "nonexistent" }
        };
        const response = await (0, cancel_booking_1.handler)(event);
        expect(response.statusCode).toBe(404);
    });
});
//# sourceMappingURL=booking-cancellation.test.js.map