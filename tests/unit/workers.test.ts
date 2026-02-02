import { handler as bookingProcessor } from "../../src/workers/booking-processor";
import { handler as expirationProcessor } from "../../src/workers/expiration-processor";
import { updateItem, putItem, queryItems } from "../../src/utils/dynamodb";
import { bookingDao } from "../../src/dao/booking-dao";
import { slotDao } from "../../src/dao/slot-dao";

jest.mock("../../src/utils/dynamodb");
jest.mock("../../src/dao/booking-dao");
jest.mock("../../src/dao/slot-dao");

const mockUpdateItem = updateItem as jest.MockedFunction<typeof updateItem>;
const mockPutItem = putItem as jest.MockedFunction<typeof putItem>;
const mockQueryItems = queryItems as jest.MockedFunction<typeof queryItems>;
const mockBookingDao = bookingDao as jest.Mocked<typeof bookingDao>;
const mockSlotDao = slotDao as jest.Mocked<typeof slotDao>;

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
      const event = {
        Records: []
      } as any;
      await expect(expirationProcessor(event)).resolves.not.toThrow();
    });

    it("should process TTL expiration for PENDING booking", async () => {
      const event = {
        Records: [{
          eventName: "REMOVE",
          dynamodb: {
            OldImage: {
              SK: { S: "EXPIRATION_TRIGGER" },
              bookingId: { S: "booking-123" },
              providerId: { S: "provider1" },
              slotId: { S: "2024-01-01#10:00" }
            }
          }
        }]
      } as any;
      
      // Mock successful atomic expiration
      mockSlotDao.expireBookingAndReleaseSlot.mockResolvedValueOnce(undefined);

      await expect(expirationProcessor(event)).resolves.not.toThrow();
      expect(mockSlotDao.expireBookingAndReleaseSlot).toHaveBeenCalledWith("booking-123", "provider1", "2024-01-01#10:00");
    });

    it("should handle already confirmed booking gracefully", async () => {
      const event = {
        Records: [{
          eventName: "REMOVE",
          dynamodb: {
            OldImage: {
              SK: { S: "EXPIRATION_TRIGGER" },
              bookingId: { S: "booking-456" },
              providerId: { S: "provider1" },
              slotId: { S: "2024-01-01#14:00" }
            }
          }
        }]
      } as any;
      
      // Mock transaction failure (booking already confirmed)
      const error = new Error("TransactionCanceledException");
      error.name = "TransactionCanceledException";
      mockSlotDao.expireBookingAndReleaseSlot.mockRejectedValueOnce(error);

      await expect(expirationProcessor(event)).resolves.not.toThrow();
      expect(mockSlotDao.expireBookingAndReleaseSlot).toHaveBeenCalledWith("booking-456", "provider1", "2024-01-01#14:00");
    });

    it("should handle slot already released gracefully", async () => {
      const event = {
        Records: [{
          eventName: "REMOVE",
          dynamodb: {
            OldImage: {
              SK: { S: "EXPIRATION_TRIGGER" },
              bookingId: { S: "booking-789" },
              providerId: { S: "provider1" },
              slotId: { S: "2024-01-01#16:00" }
            }
          }
        }]
      } as any;
      
      // Mock transaction failure (slot not held by booking)
      const error = new Error("TransactionCanceledException");
      error.name = "TransactionCanceledException";
      mockSlotDao.expireBookingAndReleaseSlot.mockRejectedValueOnce(error);

      await expect(expirationProcessor(event)).resolves.not.toThrow();
      expect(mockSlotDao.expireBookingAndReleaseSlot).toHaveBeenCalledWith("booking-789", "provider1", "2024-01-01#16:00");
    });

    it("should ignore non-TTL deletion events", async () => {
      const event = {
        Records: [{
          eventName: "INSERT", // Not a REMOVE event
          dynamodb: {
            NewImage: {
              SK: { S: "EXPIRATION_TRIGGER" },
              bookingId: { S: "booking-123" }
            }
          }
        }]
      } as any;

      await expect(expirationProcessor(event)).resolves.not.toThrow();
      expect(mockSlotDao.expireBookingAndReleaseSlot).not.toHaveBeenCalled();
    });

    it("should ignore non-expiration trigger records", async () => {
      const event = {
        Records: [{
          eventName: "REMOVE",
          dynamodb: {
            OldImage: {
              SK: { S: "METADATA" }, // Not EXPIRATION_TRIGGER
              bookingId: { S: "booking-123" }
            }
          }
        }]
      } as any;

      await expect(expirationProcessor(event)).resolves.not.toThrow();
      expect(mockSlotDao.expireBookingAndReleaseSlot).not.toHaveBeenCalled();
    });
  });
});