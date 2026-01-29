"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const booking_processor_1 = require("../../src/workers/booking-processor");
const expiration_processor_1 = require("../../src/workers/expiration-processor");
const dynamodb_1 = require("../../src/utils/dynamodb");
const booking_dao_1 = require("../../src/dao/booking-dao");
jest.mock("../../src/utils/dynamodb");
jest.mock("../../src/dao/booking-dao");
const mockUpdateItem = dynamodb_1.updateItem;
const mockPutItem = dynamodb_1.putItem;
const mockQueryItems = dynamodb_1.queryItems;
const mockBookingDao = booking_dao_1.bookingDao;
describe("Worker Functions Integration Tests", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe("Booking Processor", () => {
        it("should process booking message successfully", async () => {
            mockUpdateItem.mockResolvedValue({});
            mockPutItem.mockResolvedValue({});
            const event = {
                Records: [{
                        body: JSON.stringify({
                            bookingId: "booking1",
                            providerId: "provider1",
                            slotId: "2024-01-01#10:00",
                            userId: "user1",
                            timestamp: "2024-01-01T10:00:00.000Z"
                        })
                    }]
            };
            await expect((0, booking_processor_1.handler)(event)).resolves.not.toThrow();
            expect(mockUpdateItem).toHaveBeenCalled();
            expect(mockPutItem).toHaveBeenCalled();
        });
    });
    describe("Expiration Processor", () => {
        it("should expire pending bookings", async () => {
            mockQueryItems.mockResolvedValue([
                {
                    PK: "BOOKING#booking1",
                    providerId: "provider1",
                    slotId: "2024-01-01#10:00"
                }
            ]);
            mockBookingDao.expire.mockResolvedValue({});
            mockUpdateItem.mockResolvedValue({});
            const event = {
                time: "2024-01-01T10:10:00.000Z"
            };
            await expect((0, expiration_processor_1.handler)(event)).resolves.not.toThrow();
            expect(mockBookingDao.expire).toHaveBeenCalledWith("booking1");
        });
    });
});
//# sourceMappingURL=workers.test.js.map