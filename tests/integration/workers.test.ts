import { handler as bookingProcessor } from "../../src/workers/booking-processor";
import { handler as expirationProcessor } from "../../src/workers/expiration-processor";
import { bookingDao } from "../../src/dao/booking-dao";
import { slotDao } from "../../src/dao/slot-dao";

jest.mock("../../src/dao/booking-dao");
jest.mock("../../src/dao/slot-dao");

const mockBookingDao = bookingDao as jest.Mocked<typeof bookingDao>;
const mockSlotDao = slotDao as jest.Mocked<typeof slotDao>;

describe("Worker Functions Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Booking Processor", () => {
    it("should process booking message successfully", async () => {
      mockBookingDao.createPendingBooking.mockResolvedValue({} as any);

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
      expect(mockBookingDao.createPendingBooking).toHaveBeenCalledWith({
        bookingId: "booking1",
        providerId: "provider1",
        slotId: "2024-01-01#10:00",
        userId: "user1",
        expiresAt: expect.any(String)
      });
    });
  });

  describe("Expiration Processor (DynamoDB Streams)", () => {
    it("should process TTL deletion and expire booking", async () => {
      mockBookingDao.expire.mockResolvedValue({} as any);
      mockSlotDao.releaseSlot.mockResolvedValue(true);

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
      expect(mockBookingDao.expire).toHaveBeenCalledWith("booking1");
      expect(mockSlotDao.releaseSlot).toHaveBeenCalledWith(
        "provider1", 
        "2024-01-01#10:00", 
        "booking1"
      );
    });

    it("should ignore non-TTL deletion events", async () => {
      const event = {
        Records: [{
          eventName: "INSERT",
          dynamodb: {
            NewImage: {
              PK: { S: "BOOKING#booking1" },
              SK: { S: "METADATA" }
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