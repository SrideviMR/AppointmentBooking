import { handler as cancelBooking } from "../../src/handlers/booking/cancel-booking";
import { slotDao } from "../../src/dao/slot-dao";
import { bookingDao } from "../../src/dao/booking-dao";

jest.mock("../../src/dao/slot-dao");
jest.mock("../../src/dao/booking-dao");

const mockSlotDao = slotDao as jest.Mocked<typeof slotDao>;
const mockBookingDao = bookingDao as jest.Mocked<typeof bookingDao>;

describe("Booking Cancellation Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should cancel booking successfully", async () => {
    mockBookingDao.getBookingById.mockResolvedValue({
      PK: "BOOKING#booking1",
      SK: "METADATA",
      providerId: "provider1",
      slotId: "2024-01-01#10:00",
      state: "PENDING"
    } as any);
    mockBookingDao.cancel.mockResolvedValue({} as any);
    mockSlotDao.releaseSlot.mockResolvedValue(true);

    const event = {
      pathParameters: { bookingId: "booking1" }
    } as any;

    const response = await cancelBooking(event);
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.state).toBe("CANCELLED");
    expect(body.message).toBe("Booking cancelled and slot released");
  });

  it("should handle booking not found", async () => {
    mockBookingDao.getBookingById.mockResolvedValue(undefined);

    const event = {
      pathParameters: { bookingId: "nonexistent" }
    } as any;

    const response = await cancelBooking(event);
    
    expect(response.statusCode).toBe(404);
  });
});