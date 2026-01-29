"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const booking_dao_1 = require("../../src/dao/booking-dao");
const dynamodb_1 = require("../../src/utils/dynamodb");
const time_1 = require("../../src/utils/time");
jest.mock("../../src/utils/dynamodb");
jest.mock("../../src/utils/time");
const mockPutItem = dynamodb_1.putItem;
const mockUpdateItem = dynamodb_1.updateItem;
const mockGetItem = dynamodb_1.getItem;
const mockGetCurrentTimestamp = time_1.getCurrentTimestamp;
describe("BookingDAO", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetCurrentTimestamp.mockReturnValue("2024-01-01T10:00:00.000Z");
    });
    describe("createPendingBooking", () => {
        it("should create a pending booking", async () => {
            mockPutItem.mockResolvedValueOnce({});
            await booking_dao_1.bookingDao.createPendingBooking({
                bookingId: "booking1",
                providerId: "provider1",
                slotId: "2024-01-01#10:00",
                userId: "user1",
                expiresAt: "2024-01-01T10:05:00.000Z"
            });
            expect(mockPutItem).toHaveBeenCalledWith(expect.objectContaining({
                PK: "BOOKING#booking1",
                SK: "METADATA",
                providerId: "provider1",
                slotId: "2024-01-01#10:00",
                userId: "user1",
                state: "PENDING",
                GSI3PK: "STATUS#PENDING"
            }));
        });
    });
    describe("confirm", () => {
        it("should transition from PENDING to CONFIRMED", async () => {
            mockUpdateItem.mockResolvedValueOnce({});
            await booking_dao_1.bookingDao.confirm("booking1");
            expect(mockUpdateItem).toHaveBeenCalledWith({ PK: "BOOKING#booking1", SK: "METADATA" }, expect.stringContaining("SET #state = :to"), expect.objectContaining({
                ":to": "CONFIRMED",
                ":gsi3pk": "STATUS#CONFIRMED",
                ":from0": "PENDING"
            }), { "#state": "state" }, "#state IN (:from0)");
        });
    });
    describe("cancel", () => {
        it("should transition from PENDING or CONFIRMED to CANCELLED", async () => {
            mockUpdateItem.mockResolvedValueOnce({});
            await booking_dao_1.bookingDao.cancel("booking1");
            expect(mockUpdateItem).toHaveBeenCalledWith({ PK: "BOOKING#booking1", SK: "METADATA" }, expect.stringContaining("SET #state = :to"), expect.objectContaining({
                ":to": "CANCELLED",
                ":gsi3pk": "STATUS#CANCELLED",
                ":from0": "PENDING",
                ":from1": "CONFIRMED"
            }), { "#state": "state" }, "#state IN (:from0, :from1)");
        });
    });
    describe("expire", () => {
        it("should transition from PENDING to EXPIRED", async () => {
            mockUpdateItem.mockResolvedValueOnce({});
            await booking_dao_1.bookingDao.expire("booking1");
            expect(mockUpdateItem).toHaveBeenCalledWith({ PK: "BOOKING#booking1", SK: "METADATA" }, expect.stringContaining("SET #state = :to"), expect.objectContaining({
                ":to": "EXPIRED",
                ":gsi3pk": "STATUS#EXPIRED",
                ":from0": "PENDING"
            }), { "#state": "state" }, "#state IN (:from0)");
        });
    });
    describe("getBookingById", () => {
        it("should retrieve booking by ID", async () => {
            const mockBooking = {
                PK: "BOOKING#booking1",
                SK: "METADATA",
                state: "PENDING"
            };
            mockGetItem.mockResolvedValueOnce(mockBooking);
            const result = await booking_dao_1.bookingDao.getBookingById("booking1");
            expect(result).toEqual(mockBooking);
            expect(mockGetItem).toHaveBeenCalledWith({
                PK: "BOOKING#booking1",
                SK: "METADATA"
            });
        });
    });
});
//# sourceMappingURL=booking-dao.test.js.map