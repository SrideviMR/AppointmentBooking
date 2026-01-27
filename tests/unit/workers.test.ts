import { handler as bookingProcessor } from "../../src/workers/booking-processor";
import { handler as expirationProcessor } from "../../src/workers/expiration-processor";
import { updateItem, putItem, queryItems } from "../../src/utils/dynamodb";

jest.mock("../../src/utils/dynamodb");
jest.mock("../../src/dao/booking-dao");

const mockUpdateItem = updateItem as jest.MockedFunction<typeof updateItem>;
const mockPutItem = putItem as jest.MockedFunction<typeof putItem>;
const mockQueryItems = queryItems as jest.MockedFunction<typeof queryItems>;

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
      } as any;

      await expect(bookingProcessor(event)).resolves.not.toThrow();
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
      } as any;

      await expect(bookingProcessor(event)).resolves.not.toThrow();
    });
  });

  describe("Expiration Processor", () => {
    it("should handle no expired bookings", async () => {
      mockQueryItems.mockResolvedValue([]);

      const event = { time: "2024-01-01T10:10:00.000Z" } as any;
      await expect(expirationProcessor(event)).resolves.not.toThrow();
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

      const event = { time: "2024-01-01T10:10:00.000Z" } as any;
      await expect(expirationProcessor(event)).resolves.not.toThrow();
    });
  });
});