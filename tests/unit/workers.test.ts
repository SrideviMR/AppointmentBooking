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
      
      // Mock successful expiration (booking was PENDING)
      mockBookingDao.expire.mockResolvedValueOnce({} as any);
      mockSlotDao.releaseSlot.mockResolvedValueOnce(true);

      await expect(expirationProcessor(event)).resolves.not.toThrow();
      expect(mockBookingDao.expire).toHaveBeenCalledWith("booking-123");
      expect(mockSlotDao.releaseSlot).toHaveBeenCalledWith("provider1", "2024-01-01#10:00", "booking-123");
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
      
      // Mock booking already confirmed (conditional check fails)
      const error = new Error("ConditionalCheckFailedException");
      error.name = "ConditionalCheckFailedException";
      mockBookingDao.expire.mockRejectedValueOnce(error);

      await expect(expirationProcessor(event)).resolves.not.toThrow();
      expect(mockBookingDao.expire).toHaveBeenCalledWith("booking-456");
      expect(mockSlotDao.releaseSlot).not.toHaveBeenCalled();
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
      
      // Mock booking expiration succeeds but slot release fails (already released)
      mockBookingDao.expire.mockResolvedValueOnce({} as any);
      const slotError = new Error("ConditionalCheckFailedException");
      slotError.name = "ConditionalCheckFailedException";
      mockSlotDao.releaseSlot.mockRejectedValueOnce(slotError);

      await expect(expirationProcessor(event)).resolves.not.toThrow();
      expect(mockBookingDao.expire).toHaveBeenCalledWith("booking-789");
      expect(mockSlotDao.releaseSlot).toHaveBeenCalledWith("provider1", "2024-01-01#16:00", "booking-789");
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
      expect(mockBookingDao.expire).not.toHaveBeenCalled();
      expect(mockSlotDao.releaseSlot).not.toHaveBeenCalled();
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
      expect(mockBookingDao.expire).not.toHaveBeenCalled();
      expect(mockSlotDao.releaseSlot).not.toHaveBeenCalled();
    });
  });
});