"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const get_booking_1 = require("../../src/handlers/booking/get-booking");
const booking_dao_1 = require("../../src/dao/booking-dao");
jest.mock("../../src/dao/booking-dao");
const mockBookingDao = booking_dao_1.bookingDao;
describe("Booking Retrieval Integration Tests", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it("should retrieve booking successfully", async () => {
        mockBookingDao.getBookingById.mockResolvedValue({
            PK: "BOOKING#booking1",
            SK: "METADATA",
            providerId: "provider1",
            slotId: "2024-01-01#10:00",
            userId: "user1",
            state: "CONFIRMED",
            createdAt: "2024-01-01T09:00:00.000Z",
            expiresAt: "2024-01-01T09:05:00.000Z",
            confirmedAt: "2024-01-01T09:02:00.000Z"
        });
        const event = {
            pathParameters: { bookingId: "booking1" }
        };
        const response = await (0, get_booking_1.handler)(event);
        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.bookingId).toBe("booking1");
        expect(body.state).toBe("CONFIRMED");
        expect(body.providerId).toBe("provider1");
    });
    it("should handle booking not found", async () => {
        mockBookingDao.getBookingById.mockResolvedValue(undefined);
        const event = {
            pathParameters: { bookingId: "nonexistent" }
        };
        const response = await (0, get_booking_1.handler)(event);
        expect(response.statusCode).toBe(404);
    });
});
//# sourceMappingURL=booking-retrieval.test.js.map