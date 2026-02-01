"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const create_provider_1 = require("../../src/handlers/providers/create-provider");
const create_availability_1 = require("../../src/handlers/availability/create-availability");
const get_slot_1 = require("../../src/handlers/slot/get-slot");
const create_booking_1 = require("../../src/handlers/booking/create-booking");
const confirm_booking_1 = require("../../src/handlers/booking/confirm-booking");
const cancel_booking_1 = require("../../src/handlers/booking/cancel-booking");
const get_booking_1 = require("../../src/handlers/booking/get-booking");
const booking_service_1 = require("../../src/services/booking-service");
// Mock all dependencies
jest.mock("../../src/dao/provider-dao");
jest.mock("../../src/dao/booking-dao");
jest.mock("../../src/dao/slot-dao");
jest.mock("../../src/utils/dynamodb");
jest.mock("../../src/utils/sqs");
jest.mock("../../src/services/booking-service");
jest.mock("crypto", () => ({ randomUUID: () => "test-uuid" }));
const mockBookingService = booking_service_1.bookingService;
describe("Handler Layer Tests", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.BOOKING_QUEUE_URL = "test-queue";
    });
    describe("Create Provider", () => {
        it("should handle missing body", async () => {
            const response = await (0, create_provider_1.handler)({ body: null });
            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.message).toBe("Request body is required");
        });
        it("should handle invalid provider type", async () => {
            const response = await (0, create_provider_1.handler)({
                body: JSON.stringify({
                    providerId: "test",
                    providerName: "Test",
                    providerType: "INVALID"
                })
            });
            expect(response.statusCode).toBe(400);
        });
    });
    describe("Create Availability", () => {
        it("should handle missing providerId", async () => {
            const response = await (0, create_availability_1.handler)({
                pathParameters: null,
                body: JSON.stringify({})
            });
            expect(response.statusCode).toBe(400);
        });
        it("should handle missing body", async () => {
            const response = await (0, create_availability_1.handler)({
                pathParameters: { providerId: "test" },
                body: null
            });
            expect(response.statusCode).toBe(400);
        });
    });
    describe("Get Slots", () => {
        it("should handle missing providerId", async () => {
            const response = await (0, get_slot_1.handler)({
                pathParameters: null,
                queryStringParameters: { date: "2024-01-01" }
            });
            expect(response.statusCode).toBe(400);
        });
    });
    describe("Create Booking Handler", () => {
        it("should handle missing body", async () => {
            const response = await (0, create_booking_1.handler)({ body: null });
            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.message).toBe("Request body is required");
        });
        it("should handle invalid input via service layer", async () => {
            const response = await (0, create_booking_1.handler)({
                body: JSON.stringify({
                    providerId: "test",
                    slotId: "invalid-format", // Missing # separator
                    userId: "user1"
                })
            });
            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.message).toBe("Invalid slotId format. Expected: date#time");
        });
        it("should delegate to service layer for business logic", async () => {
            const mockResult = {
                bookingId: "booking-123",
                status: "PENDING",
                expiresAt: "2024-01-15T10:05:00Z"
            };
            mockBookingService.createBooking.mockResolvedValue(mockResult);
            const response = await (0, create_booking_1.handler)({
                body: JSON.stringify({
                    providerId: "provider-123",
                    slotId: "2024-01-15#10:00",
                    userId: "user-456"
                })
            });
            expect(response.statusCode).toBe(202);
            expect(mockBookingService.createBooking).toHaveBeenCalledWith({
                providerId: "provider-123",
                slotId: "2024-01-15#10:00",
                userId: "user-456"
            });
            const body = JSON.parse(response.body);
            expect(body).toEqual(mockResult);
        });
    });
    describe("Confirm Booking Handler", () => {
        it("should handle missing bookingId", async () => {
            const response = await (0, confirm_booking_1.handler)({
                pathParameters: null
            });
            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.message).toBe("Booking ID is required");
        });
        it("should handle invalid bookingId format", async () => {
            const response = await (0, confirm_booking_1.handler)({
                pathParameters: { bookingId: "invalid-uuid" }
            });
            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.message).toBe("Invalid booking ID format");
        });
        it("should delegate to service layer", async () => {
            const mockResult = {
                bookingId: "booking-123",
                state: "CONFIRMED",
                confirmedAt: "2024-01-15T10:00:00Z",
                message: "Booking confirmed successfully"
            };
            mockBookingService.confirmBooking.mockResolvedValue(mockResult);
            const response = await (0, confirm_booking_1.handler)({
                pathParameters: { bookingId: "f47ac10b-58cc-4372-a567-0e02b2c3d479" }
            });
            expect(response.statusCode).toBe(200);
            expect(mockBookingService.confirmBooking).toHaveBeenCalledWith({
                bookingId: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
            });
        });
    });
    describe("Cancel Booking Handler", () => {
        it("should handle missing bookingId", async () => {
            const response = await (0, cancel_booking_1.handler)({
                pathParameters: null
            });
            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.message).toBe("Booking ID is required");
        });
        it("should handle invalid bookingId format", async () => {
            const response = await (0, cancel_booking_1.handler)({
                pathParameters: { bookingId: "not-a-uuid" }
            });
            expect(response.statusCode).toBe(400);
            const body = JSON.parse(response.body);
            expect(body.message).toBe("Invalid booking ID format");
        });
        it("should delegate to service layer for atomic cancellation", async () => {
            const mockResult = {
                bookingId: "booking-123",
                state: "CANCELLED",
                cancelledAt: "2024-01-15T10:00:00Z",
                message: "Booking cancelled and slot released"
            };
            mockBookingService.cancelBooking.mockResolvedValue(mockResult);
            const response = await (0, cancel_booking_1.handler)({
                pathParameters: { bookingId: "f47ac10b-58cc-4372-a567-0e02b2c3d479" }
            });
            expect(response.statusCode).toBe(200);
            expect(mockBookingService.cancelBooking).toHaveBeenCalledWith({
                bookingId: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
            });
            const body = JSON.parse(response.body);
            expect(body).toEqual(mockResult);
        });
    });
    describe("Get Booking", () => {
        it("should handle missing bookingId", async () => {
            const response = await (0, get_booking_1.handler)({
                pathParameters: null
            });
            expect(response.statusCode).toBe(400);
        });
    });
});
//# sourceMappingURL=handlers.test.js.map