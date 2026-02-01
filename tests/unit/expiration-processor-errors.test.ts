import { handler as expirationProcessor } from "../../src/workers/expiration-processor";
import { bookingDao } from "../../src/dao/booking-dao";
import { slotDao } from "../../src/dao/slot-dao";

jest.mock("../../src/dao/booking-dao");
jest.mock("../../src/dao/slot-dao");

const mockBookingDao = bookingDao as jest.Mocked<typeof bookingDao>;
const mockSlotDao = slotDao as jest.Mocked<typeof slotDao>;

describe("ExpirationProcessor Error Handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should handle missing required fields in stream record", async () => {
    const event = {
      Records: [{
        eventName: "REMOVE",
        dynamodb: {
          OldImage: {
            SK: { S: "EXPIRATION_TRIGGER" }
            // Missing bookingId, providerId, slotId
          }
        }
      }]
    } as any;

    // Should not throw
    await expect(expirationProcessor(event)).resolves.not.toThrow();
    
    // Should not call DAO methods
    expect(mockBookingDao.expire).not.toHaveBeenCalled();
    expect(mockSlotDao.releaseSlot).not.toHaveBeenCalled();
  });

  it("should handle booking expiration failure", async () => {
    mockBookingDao.expire.mockRejectedValueOnce(new Error("Database error"));

    const event = {
      Records: [{
        eventName: "REMOVE",
        dynamodb: {
          OldImage: {
            SK: { S: "EXPIRATION_TRIGGER" },
            bookingId: { S: "booking1" },
            providerId: { S: "provider1" },
            slotId: { S: "2024-01-01#10:00" }
          }
        }
      }]
    } as any;

    await expect(expirationProcessor(event)).resolves.not.toThrow();
  });

  it("should handle slot release failure", async () => {
    mockBookingDao.expire.mockResolvedValueOnce({} as any);
    mockSlotDao.releaseSlot.mockRejectedValueOnce(new Error("Slot error"));

    const event = {
      Records: [{
        eventName: "REMOVE",
        dynamodb: {
          OldImage: {
            SK: { S: "EXPIRATION_TRIGGER" },
            bookingId: { S: "booking1" },
            providerId: { S: "provider1" },
            slotId: { S: "2024-01-01#10:00" }
          }
        }
      }]
    } as any;

    await expect(expirationProcessor(event)).resolves.not.toThrow();
  });

  it("should handle conditional check failures gracefully", async () => {
    const error = new Error("ConditionalCheckFailedException");
    error.name = "ConditionalCheckFailedException";
    mockBookingDao.expire.mockRejectedValueOnce(error);

    const event = {
      Records: [{
        eventName: "REMOVE",
        dynamodb: {
          OldImage: {
            SK: { S: "EXPIRATION_TRIGGER" },
            bookingId: { S: "booking1" },
            providerId: { S: "provider1" },
            slotId: { S: "2024-01-01#10:00" }
          }
        }
      }]
    } as any;

    await expect(expirationProcessor(event)).resolves.not.toThrow();
  });

  it("should handle non-expiration trigger events", async () => {
    const event = {
      Records: [{
        eventName: "REMOVE",
        dynamodb: {
          OldImage: {
            SK: { S: "METADATA" }, // Not an expiration trigger
            bookingId: { S: "booking1" }
          }
        }
      }]
    } as any;

    await expect(expirationProcessor(event)).resolves.not.toThrow();
    
    expect(mockBookingDao.expire).not.toHaveBeenCalled();
    expect(mockSlotDao.releaseSlot).not.toHaveBeenCalled();
  });
});