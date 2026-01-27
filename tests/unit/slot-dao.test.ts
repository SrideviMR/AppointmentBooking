import { slotDao } from "../../src/dao/slot-dao";
import { updateItem } from "../../src/utils/dynamodb";
import { getCurrentTimestamp } from "../../src/utils/time";

jest.mock("../../src/utils/dynamodb");
jest.mock("../../src/utils/time");

const mockUpdateItem = updateItem as jest.MockedFunction<typeof updateItem>;
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
          ":bookingId": "booking1"
        }),
        { "#status": "status" },
        "#status = :available"
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
    it("should confirm a held slot", async () => {
      mockUpdateItem.mockResolvedValueOnce({} as any);

      const result = await slotDao.confirmSlot("provider1", "2024-01-01#10:00", "booking1");

      expect(result).toBe(true);
      expect(mockUpdateItem).toHaveBeenCalledWith(
        { PK: "PROVIDER#provider1", SK: "SLOT#2024-01-01#10:00" },
        expect.stringContaining("SET"),
        expect.objectContaining({
          ":confirmed": "CONFIRMED",
          ":held": "HELD",
          ":bookingId": "booking1"
        }),
        { "#status": "status" },
        "#status = :held AND heldBy = :bookingId"
      );
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
    });
  });
});