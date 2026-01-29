"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const create_provider_1 = require("../../src/handlers/providers/create-provider");
const create_availability_1 = require("../../src/handlers/availability/create-availability");
const get_slot_1 = require("../../src/handlers/slot/get-slot");
const create_booking_1 = require("../../src/handlers/booking/create-booking");
const confirm_booking_1 = require("../../src/handlers/booking/confirm-booking");
const cancel_booking_1 = require("../../src/handlers/booking/cancel-booking");
const get_booking_1 = require("../../src/handlers/booking/get-booking");
// Mock all dependencies
jest.mock("../../src/dao/provider-dao");
jest.mock("../../src/dao/booking-dao");
jest.mock("../../src/dao/slot-dao");
jest.mock("../../src/utils/dynamodb");
jest.mock("../../src/utils/sqs");
jest.mock("crypto", () => ({ randomUUID: () => "test-uuid" }));
describe("Handler Error Cases", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.BOOKING_QUEUE_URL = "test-queue";
    });
    describe("Create Provider", () => {
        it("should handle missing body", async () => {
            const response = await (0, create_provider_1.handler)({ body: null });
            expect(response.statusCode).toBe(400);
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
    describe("Create Booking", () => {
        it("should handle invalid slotId format", async () => {
            const response = await (0, create_booking_1.handler)({
                body: JSON.stringify({
                    providerId: "test",
                    slotId: "invalid-format",
                    userId: "user1"
                })
            });
            expect(response.statusCode).toBe(400);
        });
    });
    describe("Confirm Booking", () => {
        it("should handle missing bookingId", async () => {
            const response = await (0, confirm_booking_1.handler)({
                pathParameters: null
            });
            expect(response.statusCode).toBe(400);
        });
    });
    describe("Cancel Booking", () => {
        it("should handle missing bookingId", async () => {
            const response = await (0, cancel_booking_1.handler)({
                pathParameters: null
            });
            expect(response.statusCode).toBe(400);
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