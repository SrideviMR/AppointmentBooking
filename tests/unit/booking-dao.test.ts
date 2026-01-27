import { bookingDao } from "../../src/dao/booking-dao";
import { putItem, updateItem, getItem } from "../../src/utils/dynamodb";
import { getCurrentTimestamp } from "../../src/utils/time";

jest.mock("../../src/utils/dynamodb");
jest.mock("../../src/utils/time");

const mockPutItem = putItem as jest.MockedFunction<typeof putItem>;
const mockUpdateItem = updateItem as jest.MockedFunction<typeof updateItem>;
const mockGetItem = getItem as jest.MockedFunction<typeof getItem>;
const mockGetCurrentTimestamp = getCurrentTimestamp as jest.MockedFunction<typeof getCurrentTimestamp>;

describe("BookingDAO", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentTimestamp.mockReturnValue("2024-01-01T10:00:00.000Z");
  });

  describe("createPendingBooking", () => {
    it("should create a pending booking", async () => {
      mockPutItem.mockResolvedValueOnce({} as any);

      await bookingDao.createPendingBooking({
        bookingId: "booking1",
        providerId: "provider1",
        slotId: "2024-01-01#10:00",
        userId: "user1",
        expiresAt: "2024-01-01T10:05:00.000Z"
      });

      expect(mockPutItem).toHaveBeenCalledWith(
        expect.objectContaining({
          PK: "BOOKING#booking1",
          SK: "METADATA",
          providerId: "provider1",
          slotId: "2024-01-01#10:00",
          userId: "user1",
          state: "PENDING",
          GSI3PK: "STATUS#PENDING"
        })
      );
    });
  });

  describe("confirm", () => {
    it("should transition from PENDING to CONFIRMED", async () => {
      mockUpdateItem.mockResolvedValueOnce({} as any);

      await bookingDao.confirm("booking1");

      expect(mockUpdateItem).toHaveBeenCalledWith(
        { PK: "BOOKING#booking1", SK: "METADATA" },
        expect.stringContaining("SET #state = :to"),
        expect.objectContaining({
          ":to": "CONFIRMED",
          ":gsi3pk": "STATUS#CONFIRMED",
          ":from0": "PENDING"
        }),
        { "#state": "state" },
        "#state IN (:from0)"
      );
    });
  });

  describe("cancel", () => {
    it("should transition from PENDING or CONFIRMED to CANCELLED", async () => {
      mockUpdateItem.mockResolvedValueOnce({} as any);

      await bookingDao.cancel("booking1");

      expect(mockUpdateItem).toHaveBeenCalledWith(
        { PK: "BOOKING#booking1", SK: "METADATA" },
        expect.stringContaining("SET #state = :to"),
        expect.objectContaining({
          ":to": "CANCELLED",
          ":gsi3pk": "STATUS#CANCELLED",
          ":from0": "PENDING",
          ":from1": "CONFIRMED"
        }),
        { "#state": "state" },
        "#state IN (:from0, :from1)"
      );
    });
  });

  describe("expire", () => {
    it("should transition from PENDING to EXPIRED", async () => {
      mockUpdateItem.mockResolvedValueOnce({} as any);

      await bookingDao.expire("booking1");

      expect(mockUpdateItem).toHaveBeenCalledWith(
        { PK: "BOOKING#booking1", SK: "METADATA" },
        expect.stringContaining("SET #state = :to"),
        expect.objectContaining({
          ":to": "EXPIRED",
          ":gsi3pk": "STATUS#EXPIRED",
          ":from0": "PENDING"
        }),
        { "#state": "state" },
        "#state IN (:from0)"
      );
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

      const result = await bookingDao.getBookingById("booking1");

      expect(result).toEqual(mockBooking);
      expect(mockGetItem).toHaveBeenCalledWith({
        PK: "BOOKING#booking1",
        SK: "METADATA"
      });
    });
  });
});