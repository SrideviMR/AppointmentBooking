import { slotDao } from "../../src/dao/slot-dao";
import { updateItem, transactWrite } from "../../src/utils/dynamodb";
import { getCurrentTimestamp } from "../../src/utils/time";

jest.mock("../../src/utils/dynamodb");
jest.mock("../../src/utils/time");

const mockUpdateItem = updateItem as jest.MockedFunction<typeof updateItem>;
const mockTransactWrite = transactWrite as jest.MockedFunction<typeof transactWrite>;
const mockGetCurrentTimestamp = getCurrentTimestamp as jest.MockedFunction<typeof getCurrentTimestamp>;

describe("SlotDAO", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentTimestamp.mockReturnValue("2024-01-01T10:00:00.000Z");
  });

  describe("holdSlot", () => {
    it("should hold an available slot", async () => {
      mockUpdateItem.mockResolvedValueOnce({} as any);

      const result = await slotDao.holdSlot("provider1", "2024-01-01#10:00", "booking1", "2024-01-01T10:05:00.000Z");

      expect(result).toBe(true);
      expect(mockUpdateItem).toHaveBeenCalledWith(
        { PK: "PROVIDER#provider1", SK: "SLOT#2024-01-01#10:00" },
        expect.stringContaining("SET"),
        expect.objectContaining({
          ":held": "HELD",
          ":available": "AVAILABLE",
          ":bookingId": "booking1",
          ":ttl": "2024-01-01T10:05:00.000Z",
          ":now": expect.any(String)
        }),
        { "#status": "status" },
        expect.stringContaining("#status = :available")
      );
    });

    it("should return false when slot is unavailable", async () => {
      const error = new Error("ConditionalCheckFailedException");
      error.name = "ConditionalCheckFailedException";
      mockUpdateItem.mockRejectedValueOnce(error);

      const result = await slotDao.holdSlot("provider1", "2024-01-01#10:00", "booking1", "2024-01-01T10:05:00.000Z");

      expect(result).toBe(false);
    });
  });

  describe("confirmSlot", () => {
    it("should confirm a held slot and keep heldBy field", async () => {
      mockUpdateItem.mockResolvedValueOnce({} as any);

      const result = await slotDao.confirmSlot("provider1", "2024-01-01#10:00", "booking1");

      expect(result).toBe(true);
      expect(mockUpdateItem).toHaveBeenCalledWith(
        { PK: "PROVIDER#provider1", SK: "SLOT#2024-01-01#10:00" },
        expect.stringContaining("SET"),
        expect.objectContaining({
          ":reserved": "RESERVED",
          ":held": "HELD",
          ":bookingId": "booking1",
          ":confirmedAt": "2024-01-01T10:00:00.000Z"
        }),
        { "#status": "status" },
        "#status = :held AND heldBy = :bookingId"
      );
      
      // Verify it only removes holdExpiresAt, not heldBy
      const updateExpression = mockUpdateItem.mock.calls[0][1];
      expect(updateExpression).toContain("REMOVE");
      expect(updateExpression).toContain("holdExpiresAt");
      expect(updateExpression).not.toContain("heldBy");
    });

    it("should return false when slot not held by booking", async () => {
      const error = new Error("ConditionalCheckFailedException");
      error.name = "ConditionalCheckFailedException";
      mockUpdateItem.mockRejectedValueOnce(error);

      const result = await slotDao.confirmSlot("provider1", "2024-01-01#10:00", "booking1");

      expect(result).toBe(false);
    });
  });

  describe("releaseSlot", () => {
    it("should release a held slot", async () => {
      mockUpdateItem.mockResolvedValueOnce({} as any);

      const result = await slotDao.releaseSlot("provider1", "2024-01-01#10:00", "booking1");

      expect(result).toBe(true);
      expect(mockUpdateItem).toHaveBeenCalledWith(
        { PK: "PROVIDER#provider1", SK: "SLOT#2024-01-01#10:00" },
        expect.stringContaining("SET #status = :available"),
        expect.objectContaining({
          ":available": "AVAILABLE",
          ":bookingId": "booking1"
        }),
        { "#status": "status" },
        "heldBy = :bookingId"
      );
      
      // Verify it removes all booking-related fields
      const updateExpression = mockUpdateItem.mock.calls[0][1];
      expect(updateExpression).toContain("REMOVE heldBy, holdExpiresAt, confirmedAt");
    });

    it("should return false when slot not held by booking", async () => {
      const error = new Error("ConditionalCheckFailedException");
      error.name = "ConditionalCheckFailedException";
      mockUpdateItem.mockRejectedValueOnce(error);

      const result = await slotDao.releaseSlot("provider1", "2024-01-01#10:00", "booking1");

      expect(result).toBe(false);
    });
  });

  describe("cancelBookingAndReleaseSlot", () => {
    it("should atomically cancel booking and release slot", async () => {
      mockTransactWrite.mockResolvedValueOnce({} as any);

      await slotDao.cancelBookingAndReleaseSlot("booking1", "provider1", "2024-01-01#10:00");

      expect(mockTransactWrite).toHaveBeenCalledWith([
        {
          Update: {
            TableName: process.env.TABLE_NAME,
            Key: { PK: "BOOKING#booking1", SK: "METADATA" },
            UpdateExpression: "SET #state = :cancelled, cancelledAt = :cancelledAt",
            ExpressionAttributeNames: { "#state": "state" },
            ExpressionAttributeValues: {
              ":cancelled": "CANCELLED",
              ":cancelledAt": "2024-01-01T10:00:00.000Z",
              ":pending": "PENDING",
              ":confirmed": "CONFIRMED",
            },
            ConditionExpression: "#state IN (:pending, :confirmed)",
          },
        },
        {
          Update: {
            TableName: process.env.TABLE_NAME,
            Key: { PK: "PROVIDER#provider1", SK: "SLOT#2024-01-01#10:00" },
            UpdateExpression: "SET #status = :available REMOVE heldBy, holdExpiresAt, confirmedAt",
            ExpressionAttributeNames: { "#status": "status" },
            ExpressionAttributeValues: {
              ":available": "AVAILABLE",
              ":bookingId": "booking1",
            },
            ConditionExpression: "heldBy = :bookingId",
          },
        },
      ]);
    });

    it("should handle transaction failures", async () => {
      const transactionError = new Error("Transaction cancelled");
      transactionError.name = "TransactionCanceledException";
      mockTransactWrite.mockRejectedValueOnce(transactionError);

      await expect(slotDao.cancelBookingAndReleaseSlot("booking1", "provider1", "2024-01-01#10:00"))
        .rejects.toThrow("Transaction cancelled");
    });
  });
});