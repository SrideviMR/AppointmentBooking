"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const booking_processor_1 = require("../../src/workers/booking-processor");
const expiration_processor_1 = require("../../src/workers/expiration-processor");
const dynamodb_1 = require("../../src/utils/dynamodb");
jest.mock("../../src/utils/dynamodb");
jest.mock("../../src/dao/booking-dao");
const mockUpdateItem = dynamodb_1.updateItem;
const mockPutItem = dynamodb_1.putItem;
const mockQueryItems = dynamodb_1.queryItems;
describe("Worker Error Handling", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe("Booking Processor", () => {
        it("should handle slot unavailable error", async () => {
            const error = new Error("ConditionalCheckFailedException");
            error.name = "ConditionalCheckFailedException";
            mockUpdateItem.mockRejectedValueOnce(error);
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
        });
        it("should handle processing errors", async () => {
            mockUpdateItem.mockRejectedValueOnce(new Error("Database error"));
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
        });
    });
    describe("Expiration Processor", () => {
        it("should handle no expired bookings", async () => {
            mockQueryItems.mockResolvedValue([]);
            const event = { time: "2024-01-01T10:10:00.000Z" };
            await expect((0, expiration_processor_1.handler)(event)).resolves.not.toThrow();
        });
        it("should handle already processed bookings", async () => {
            mockQueryItems.mockResolvedValue([{
                    PK: "BOOKING#booking1",
                    providerId: "provider1",
                    slotId: "2024-01-01#10:00"
                }]);
            const error = new Error("ConditionalCheckFailedException");
            error.name = "ConditionalCheckFailedException";
            mockUpdateItem.mockRejectedValueOnce(error);
            const event = { time: "2024-01-01T10:10:00.000Z" };
            await expect((0, expiration_processor_1.handler)(event)).resolves.not.toThrow();
        });
    });
});
//# sourceMappingURL=workers.test.js.map