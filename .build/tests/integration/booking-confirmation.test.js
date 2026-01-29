"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const confirm_booking_1 = require("../../src/handlers/booking/confirm-booking");
const slot_dao_1 = require("../../src/dao/slot-dao");
const booking_dao_1 = require("../../src/dao/booking-dao");
jest.mock("../../src/dao/slot-dao");
jest.mock("../../src/dao/booking-dao");
const mockSlotDao = slot_dao_1.slotDao;
const mockBookingDao = booking_dao_1.bookingDao;
describe("Booking Confirmation Integration Tests", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it("should confirm booking successfully", async () => {
        mockBookingDao.getBookingById.mockResolvedValue({
            PK: "BOOKING#booking1",
            SK: "METADATA",
            providerId: "provider1",
            slotId: "2024-01-01#10:00",
            state: "PENDING"
        });
        mockSlotDao.confirmSlot.mockResolvedValue(true);
        mockBookingDao.confirm.mockResolvedValue({});
        const event = {
            pathParameters: { bookingId: "booking1" }
        };
        const response = await (0, confirm_booking_1.handler)(event);
        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.state).toBe("CONFIRMED");
    });
    it("should handle slot not held by booking", async () => {
        mockBookingDao.getBookingById.mockResolvedValue({
            PK: "BOOKING#booking1",
            SK: "METADATA",
            providerId: "provider1",
            slotId: "2024-01-01#10:00",
            state: "PENDING"
        });
        mockSlotDao.confirmSlot.mockResolvedValue(false);
        const event = {
            pathParameters: { bookingId: "booking1" }
        };
        const response = await (0, confirm_booking_1.handler)(event);
        expect(response.statusCode).toBe(409);
        const body = JSON.parse(response.body);
        expect(body.message).toBe("Slot is no longer held by this booking");
    });
});
//# sourceMappingURL=booking-confirmation.test.js.map