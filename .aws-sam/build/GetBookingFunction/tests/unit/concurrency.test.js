"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const slot_dao_1 = require("../../src/dao/slot-dao");
const booking_dao_1 = require("../../src/dao/booking-dao");
const dynamodb_1 = require("../../src/utils/dynamodb");
jest.mock("../../src/utils/dynamodb");
const mockUpdateItem = dynamodb_1.updateItem;
describe("Concurrency Edge Cases", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe("Slot double booking prevention", () => {
        it("should prevent double booking of same slot", async () => {
            // First booking succeeds
            mockUpdateItem.mockResolvedValueOnce({});
            // Second booking fails due to conditional check
            const conditionalError = new Error("ConditionalCheckFailedException");
            conditionalError.name = "ConditionalCheckFailedException";
            mockUpdateItem.mockRejectedValueOnce(conditionalError);
            const slot = "2024-01-01#10:00";
            const provider = "provider1";
            // Simulate concurrent booking attempts
            const booking1Promise = slot_dao_1.slotDao.holdSlot(provider, slot, "booking1", "2024-01-01T10:05:00.000Z");
            const booking2Promise = slot_dao_1.slotDao.holdSlot(provider, slot, "booking2", "2024-01-01T10:05:00.000Z");
            const [result1, result2] = await Promise.all([booking1Promise, booking2Promise]);
            expect(result1).toBe(true); // First booking succeeds
            expect(result2).toBe(false); // Second booking fails
        });
        it("should handle race condition in slot confirmation", async () => {
            // First confirmation succeeds
            mockUpdateItem.mockResolvedValueOnce({});
            // Second confirmation fails (slot already confirmed)
            const conditionalError = new Error("ConditionalCheckFailedException");
            conditionalError.name = "ConditionalCheckFailedException";
            mockUpdateItem.mockRejectedValueOnce(conditionalError);
            const slot = "2024-01-01#10:00";
            const provider = "provider1";
            const confirm1Promise = slot_dao_1.slotDao.confirmSlot(provider, slot, "booking1");
            const confirm2Promise = slot_dao_1.slotDao.confirmSlot(provider, slot, "booking2");
            const [result1, result2] = await Promise.all([confirm1Promise, confirm2Promise]);
            expect(result1).toBe(true);
            expect(result2).toBe(false);
        });
    });
    describe("Booking state transition conflicts", () => {
        it("should prevent invalid state transitions", async () => {
            // First transition succeeds (PENDING -> CONFIRMED)
            mockUpdateItem.mockResolvedValueOnce({});
            // Second transition fails (already CONFIRMED, can't expire)
            const conditionalError = new Error("ConditionalCheckFailedException");
            conditionalError.name = "ConditionalCheckFailedException";
            mockUpdateItem.mockRejectedValueOnce(conditionalError);
            const bookingId = "booking1";
            // Simulate concurrent state changes
            const confirmPromise = booking_dao_1.bookingDao.confirm(bookingId);
            const expirePromise = booking_dao_1.bookingDao.expire(bookingId);
            const results = await Promise.allSettled([confirmPromise, expirePromise]);
            expect(results[0].status).toBe("fulfilled");
            expect(results[1].status).toBe("rejected");
        });
        it("should handle concurrent cancel and confirm operations", async () => {
            // First operation succeeds
            mockUpdateItem.mockResolvedValueOnce({});
            // Second operation fails due to state change
            const conditionalError = new Error("ConditionalCheckFailedException");
            conditionalError.name = "ConditionalCheckFailedException";
            mockUpdateItem.mockRejectedValueOnce(conditionalError);
            const bookingId = "booking1";
            const cancelPromise = booking_dao_1.bookingDao.cancel(bookingId);
            const confirmPromise = booking_dao_1.bookingDao.confirm(bookingId);
            const results = await Promise.allSettled([cancelPromise, confirmPromise]);
            // One should succeed, one should fail
            const successCount = results.filter(r => r.status === "fulfilled").length;
            const failureCount = results.filter(r => r.status === "rejected").length;
            expect(successCount).toBe(1);
            expect(failureCount).toBe(1);
        });
    });
    describe("Slot release race conditions", () => {
        it("should handle concurrent slot release attempts", async () => {
            // First release succeeds
            mockUpdateItem.mockResolvedValueOnce({});
            // Second release fails (slot already released)
            const conditionalError = new Error("ConditionalCheckFailedException");
            conditionalError.name = "ConditionalCheckFailedException";
            mockUpdateItem.mockRejectedValueOnce(conditionalError);
            const slot = "2024-01-01#10:00";
            const provider = "provider1";
            const bookingId = "booking1";
            const release1Promise = slot_dao_1.slotDao.releaseSlot(provider, slot, bookingId);
            const release2Promise = slot_dao_1.slotDao.releaseSlot(provider, slot, bookingId);
            const [result1, result2] = await Promise.all([release1Promise, release2Promise]);
            expect(result1).toBe(true);
            expect(result2).toBe(false);
        });
        it("should prevent release by wrong booking", async () => {
            const conditionalError = new Error("ConditionalCheckFailedException");
            conditionalError.name = "ConditionalCheckFailedException";
            mockUpdateItem.mockRejectedValueOnce(conditionalError);
            const result = await slot_dao_1.slotDao.releaseSlot("provider1", "2024-01-01#10:00", "wrong-booking");
            expect(result).toBe(false);
            expect(mockUpdateItem).toHaveBeenCalledWith(expect.any(Object), expect.any(String), expect.any(Object), expect.any(Object), "heldBy = :bookingId");
        });
    });
    describe("High concurrency simulation", () => {
        it("should handle multiple concurrent booking attempts on same slot", async () => {
            const numConcurrentBookings = 10;
            const slot = "2024-01-01#10:00";
            const provider = "provider1";
            // Only first booking succeeds, rest fail
            mockUpdateItem
                .mockResolvedValueOnce({}) // First succeeds
                .mockRejectedValue(Object.assign(new Error("ConditionalCheckFailedException"), {
                name: "ConditionalCheckFailedException"
            })); // Rest fail
            const bookingPromises = Array.from({ length: numConcurrentBookings }, (_, i) => slot_dao_1.slotDao.holdSlot(provider, slot, `booking${i}`, "2024-01-01T10:05:00.000Z"));
            const results = await Promise.all(bookingPromises);
            const successCount = results.filter(r => r === true).length;
            const failureCount = results.filter(r => r === false).length;
            expect(successCount).toBe(1);
            expect(failureCount).toBe(numConcurrentBookings - 1);
        });
    });
});
//# sourceMappingURL=concurrency.test.js.map