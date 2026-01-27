import { handler as confirmBooking } from "../../src/handlers/booking/confirm-booking";
import { slotDao } from "../../src/dao/slot-dao";
import { bookingDao } from "../../src/dao/booking-dao";

jest.mock("../../src/dao/slot-dao");
jest.mock("../../src/dao/booking-dao");

const mockSlotDao = slotDao as jest.Mocked<typeof slotDao>;
const mockBookingDao = bookingDao as jest.Mocked<typeof bookingDao>;

describe("Booking Confirmation Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should confirm booking successfully", async () => {
    mockBookingDao.getBookingById.mockResolvedValue({
      PK: "BOOKING#booking1",
      SK: "METADATA",
      providerId: "provider1",
      slotId: "2024-01-01#10:00",
      state: "PENDING"
    } as any);
    mockSlotDao.confirmSlot.mockResolvedValue(true);
    mockBookingDao.confirm.mockResolvedValue({} as any);

    const event = {
      pathParameters: { bookingId: "booking1" }
    } as any;

    const response = await confirmBooking(event);
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.state).toBe("CONFIRMED");
  });

  it("should handle slot not held by booking", async () => {
    mockBookingDao.getBookingById.mockResolvedValue({
      PK: "BOOKING#booking1",
      SK: "METADATA",
      providerId: "provider1",
      slotId: "2024-01-01#10:00",
      state: "PENDING"
    } as any);
    mockSlotDao.confirmSlot.mockResolvedValue(false);

    const event = {
      pathParameters: { bookingId: "booking1" }
    } as any;

    const response = await confirmBooking(event);
    
    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Slot is no longer held by this booking");
  });
});