import { handler as bookingProcessor } from "../../src/workers/booking-processor";
import { handler as expirationProcessor } from "../../src/workers/expiration-processor";
import { updateItem, putItem, queryItems } from "../../src/utils/dynamodb";
import { bookingDao } from "../../src/dao/booking-dao";

jest.mock("../../src/utils/dynamodb");
jest.mock("../../src/dao/booking-dao");

const mockUpdateItem = updateItem as jest.MockedFunction<typeof updateItem>;
const mockPutItem = putItem as jest.MockedFunction<typeof putItem>;
const mockQueryItems = queryItems as jest.MockedFunction<typeof queryItems>;
const mockBookingDao = bookingDao as jest.Mocked<typeof bookingDao>;

describe("Worker Functions Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Booking Processor", () => {
    it("should process booking message successfully", async () => {
      mockUpdateItem.mockResolvedValue({} as any);
      mockPutItem.mockResolvedValue({} as any);

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
      expect(mockUpdateItem).toHaveBeenCalled();
      expect(mockPutItem).toHaveBeenCalled();
    });
  });

  describe("Expiration Processor", () => {
    it("should expire pending bookings", async () => {
      mockQueryItems.mockResolvedValue([
        {
          PK: "BOOKING#booking1",
          providerId: "provider1",
          slotId: "2024-01-01#10:00"
        }
      ]);
      mockBookingDao.expire.mockResolvedValue({} as any);
      mockUpdateItem.mockResolvedValue({} as any);

      const event = {
        time: "2024-01-01T10:10:00.000Z"
      } as any;

      await expect(expirationProcessor(event)).resolves.not.toThrow();
      expect(mockBookingDao.expire).toHaveBeenCalledWith("booking1");
    });
  });
});