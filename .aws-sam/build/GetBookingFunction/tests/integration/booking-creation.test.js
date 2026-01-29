"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const create_booking_1 = require("../../src/handlers/booking/create-booking");
const slot_dao_1 = require("../../src/dao/slot-dao");
const booking_dao_1 = require("../../src/dao/booking-dao");
const sqs_1 = require("../../src/utils/sqs");
jest.mock("../../src/dao/slot-dao");
jest.mock("../../src/dao/booking-dao");
jest.mock("../../src/utils/sqs");
jest.mock("crypto", () => ({ randomUUID: () => "test-uuid" }));
const mockSlotDao = slot_dao_1.slotDao;
const mockBookingDao = booking_dao_1.bookingDao;
const mockSendMessage = sqs_1.sendMessage;
describe("Booking Creation Integration Tests", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.BOOKING_QUEUE_URL = "test-queue-url";
    });
    it("should create booking successfully", async () => {
        mockSlotDao.holdSlot.mockResolvedValue(true);
        mockBookingDao.createPendingBooking.mockResolvedValue({});
        mockSendMessage.mockResolvedValue();
        const event = {
            body: JSON.stringify({
                providerId: "provider1",
                slotId: "2024-01-01#10:00",
                userId: "user1"
            })
        };
        const response = await (0, create_booking_1.handler)(event);
        expect(response.statusCode).toBe(202);
        const body = JSON.parse(response.body);
        expect(body.bookingId).toBe("booking-test-uuid");
        expect(body.status).toBe("PENDING");
    });
    it("should handle slot unavailable", async () => {
        mockSlotDao.holdSlot.mockRejectedValue({
            name: "ConditionalCheckFailedException"
        });
        const event = {
            body: JSON.stringify({
                providerId: "provider1",
                slotId: "2024-01-01#10:00",
                userId: "user1"
            })
        };
        const response = await (0, create_booking_1.handler)(event);
        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.message).toBe("Slot already booked");
    });
});
//# sourceMappingURL=booking-creation.test.js.map