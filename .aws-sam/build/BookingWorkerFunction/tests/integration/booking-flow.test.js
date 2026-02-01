"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const create_booking_1 = require("../../src/handlers/booking/create-booking");
const confirm_booking_1 = require("../../src/handlers/booking/confirm-booking");
const get_booking_1 = require("../../src/handlers/booking/get-booking");
const dynamodb_1 = require("../../src/utils/dynamodb");
const slot_dao_1 = require("../../src/dao/slot-dao");
const booking_dao_1 = require("../../src/dao/booking-dao");
const sqs_1 = require("../../src/utils/sqs");
jest.mock("../../src/utils/dynamodb");
jest.mock("../../src/dao/slot-dao");
jest.mock("../../src/dao/booking-dao");
jest.mock("../../src/utils/sqs");
jest.mock("crypto", () => ({ randomUUID: () => "test-uuid" }));
const mockQueryItems = dynamodb_1.queryItems;
const mockSlotDao = slot_dao_1.slotDao;
const mockBookingDao = booking_dao_1.bookingDao;
const mockSendMessage = sqs_1.sendMessage;
describe("Complete Booking Flow Integration", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.BOOKING_QUEUE_URL = "test-queue-url";
    });
    it("should complete full booking lifecycle", async () => {
        // Setup mocks for create booking
        mockQueryItems.mockResolvedValue([{
                PK: "PROVIDER#provider1",
                SK: "SLOT#2024-01-01#10:00",
                status: "AVAILABLE"
            }]);
        mockSlotDao.holdSlot.mockResolvedValue(true);
        mockSendMessage.mockResolvedValue();
        // Setup mocks for confirm booking
        mockBookingDao.getBookingById.mockResolvedValue({
            PK: "BOOKING#booking-test-uuid",
            SK: "METADATA",
            providerId: "provider1",
            slotId: "2024-01-01#10:00",
            userId: "user1",
            state: "PENDING",
            createdAt: "2024-01-01T10:00:00.000Z",
            expiresAt: "2024-01-01T10:05:00.000Z"
        });
        mockSlotDao.confirmSlot.mockResolvedValue(true);
        mockBookingDao.confirm.mockResolvedValue({});
        // 1. Create booking
        const createResponse = await (0, create_booking_1.handler)({
            body: JSON.stringify({
                providerId: "provider1",
                slotId: "2024-01-01#10:00",
                userId: "user1"
            })
        });
        expect(createResponse.statusCode).toBe(202);
        const createBody = JSON.parse(createResponse.body);
        expect(createBody.bookingId).toBe("booking-test-uuid");
        // 2. Confirm booking
        const confirmResponse = await (0, confirm_booking_1.handler)({
            pathParameters: { bookingId: "booking-test-uuid" }
        });
        expect(confirmResponse.statusCode).toBe(200);
        const confirmBody = JSON.parse(confirmResponse.body);
        expect(confirmBody.state).toBe("CONFIRMED");
        // 3. Retrieve booking
        const getResponse = await (0, get_booking_1.handler)({
            pathParameters: { bookingId: "booking-test-uuid" }
        });
        expect(getResponse.statusCode).toBe(200);
        const getBody = JSON.parse(getResponse.body);
        expect(getBody.bookingId).toBe("booking-test-uuid");
    });
});
//# sourceMappingURL=booking-flow.test.js.map