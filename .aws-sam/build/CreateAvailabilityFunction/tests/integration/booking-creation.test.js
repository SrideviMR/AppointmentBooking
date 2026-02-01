"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const create_booking_1 = require("../../src/handlers/booking/create-booking");
const booking_service_1 = require("../../src/services/booking-service");
const dynamodb_1 = require("../../src/utils/dynamodb");
const slot_dao_1 = require("../../src/dao/slot-dao");
const sqs_1 = require("../../src/utils/sqs");
jest.mock("../../src/utils/dynamodb");
jest.mock("../../src/dao/slot-dao");
jest.mock("../../src/utils/sqs");
jest.mock("crypto", () => ({ randomUUID: () => "test-uuid" }));
const mockQueryItems = dynamodb_1.queryItems;
const mockSlotDao = slot_dao_1.slotDao;
const mockSendMessage = sqs_1.sendMessage;
describe("Booking Creation Integration Tests", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.BOOKING_QUEUE_URL = "test-queue-url";
    });
    describe("Handler to Service Integration", () => {
        it("should create booking successfully through service layer", async () => {
            // Mock slot exists and is available
            mockQueryItems.mockResolvedValue([{
                    PK: "PROVIDER#provider1",
                    SK: "SLOT#2024-01-01#10:00",
                    status: "AVAILABLE"
                }]);
            mockSlotDao.holdSlot.mockResolvedValue(true);
            mockSendMessage.mockResolvedValue({});
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
            expect(body.expiresAt).toBeDefined();
            // Verify service layer was called with correct parameters
            expect(mockSlotDao.holdSlot).toHaveBeenCalledWith("provider1", "2024-01-01#10:00", "booking-test-uuid", expect.any(String));
            expect(mockSendMessage).toHaveBeenCalledWith({
                QueueUrl: "test-queue-url",
                MessageBody: expect.stringContaining('"bookingId":"booking-test-uuid"')
            });
        });
        it("should handle validation errors at handler level", async () => {
            const event = {
                body: JSON.stringify({
                    providerId: "provider1",
                    slotId: "invalid-format", // Missing # separator
                    userId: "user1"
                })
            };
            const response = await (0, create_booking_1.handler)(event);
            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.message).toBe("Invalid slotId format. Expected: date#time");
            // Service layer should not be called for validation errors
            expect(mockQueryItems).not.toHaveBeenCalled();
        });
        it("should reject booking for held slot via service layer", async () => {
            // Mock slot is held with future expiration
            mockQueryItems.mockResolvedValue([{
                    PK: "PROVIDER#provider1",
                    SK: "SLOT#2024-01-01#10:00",
                    status: "HELD",
                    holdExpiresAt: new Date(Date.now() + 300000).toISOString() // 5 min future
                }]);
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
            expect(body.message).toContain("held by another user");
            // Verify slot hold was not attempted
            expect(mockSlotDao.holdSlot).not.toHaveBeenCalled();
        });
        it("should reject booking for reserved slot via service layer", async () => {
            mockQueryItems.mockResolvedValue([{
                    PK: "PROVIDER#provider1",
                    SK: "SLOT#2024-01-01#10:00",
                    status: "BOOKED"
                }]);
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
            expect(body.message).toBe("Slot is already booked. Please select another slot.");
        });
        it("should handle slot hold failures gracefully", async () => {
            // Mock slot exists and is available
            mockQueryItems.mockResolvedValue([{
                    PK: "PROVIDER#provider1",
                    SK: "SLOT#2024-01-01#10:00",
                    status: "AVAILABLE"
                }]);
            // Mock slot hold failure (race condition)
            mockSlotDao.holdSlot.mockResolvedValue(false);
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
            expect(body.message).toBe("Slot is held by another booking");
            // Verify SQS message was not sent
            expect(mockSendMessage).not.toHaveBeenCalled();
        });
        it("should handle DynamoDB throttling errors", async () => {
            // Mock slot exists and is available
            mockQueryItems.mockResolvedValue([{
                    PK: "PROVIDER#provider1",
                    SK: "SLOT#2024-01-01#10:00",
                    status: "AVAILABLE"
                }]);
            // Mock throttling error
            const throttleError = new Error("Throttling");
            throttleError.name = "ProvisionedThroughputExceededException";
            mockSlotDao.holdSlot.mockRejectedValue(throttleError);
            const event = {
                body: JSON.stringify({
                    providerId: "provider1",
                    slotId: "2024-01-01#10:00",
                    userId: "user1"
                })
            };
            const response = await (0, create_booking_1.handler)(event);
            expect(response.statusCode).toBe(500);
            const body = JSON.parse(response.body);
            expect(body.message).toBe("Service temporarily unavailable. Please try again.");
        });
    });
    describe("Service Layer Direct Testing", () => {
        it("should handle concurrent booking attempts", async () => {
            // Mock slot exists and is available for first request
            mockQueryItems.mockResolvedValue([{
                    PK: "PROVIDER#provider1",
                    SK: "SLOT#2024-01-01#10:00",
                    status: "AVAILABLE"
                }]);
            // First hold succeeds, second fails (race condition)
            mockSlotDao.holdSlot
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false);
            mockSendMessage.mockResolvedValue({});
            const request = {
                providerId: "provider1",
                slotId: "2024-01-01#10:00",
                userId: "user1"
            };
            // Simulate concurrent requests
            const [result1, result2] = await Promise.allSettled([
                booking_service_1.bookingService.createBooking(request),
                booking_service_1.bookingService.createBooking({ ...request, userId: "user2" })
            ]);
            expect(result1.status).toBe("fulfilled");
            expect(result2.status).toBe("rejected");
            if (result1.status === "fulfilled") {
                expect(result1.value.status).toBe("PENDING");
            }
            if (result2.status === "rejected") {
                expect(result2.reason.message).toBe("Slot is held by another booking");
            }
        });
    });
});
//# sourceMappingURL=booking-creation.test.js.map