import { handler as getBooking } from "../../src/handlers/booking/get-booking";
import { bookingDao } from "../../src/dao/booking-dao";

jest.mock("../../src/dao/booking-dao");

const mockBookingDao = bookingDao as jest.Mocked<typeof bookingDao>;

describe("Booking Retrieval Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should retrieve booking successfully", async () => {
    mockBookingDao.getBookingById.mockResolvedValue({
      PK: "BOOKING#booking1",
      SK: "METADATA",
      providerId: "provider1",
      slotId: "2024-01-01#10:00",
      userId: "user1",
      state: "CONFIRMED",
      createdAt: "2024-01-01T09:00:00.000Z",
      expiresAt: "2024-01-01T09:05:00.000Z",
      confirmedAt: "2024-01-01T09:02:00.000Z"
    } as any);

    const event = {
      pathParameters: { bookingId: "booking1" }
    } as any;

    const response = await getBooking(event);
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.bookingId).toBe("booking1");
    expect(body.state).toBe("CONFIRMED");
    expect(body.providerId).toBe("provider1");
  });

  it("should handle booking not found", async () => {
    mockBookingDao.getBookingById.mockResolvedValue(undefined);

    const event = {
      pathParameters: { bookingId: "nonexistent" }
    } as any;

    const response = await getBooking(event);
    
    expect(response.statusCode).toBe(404);
  });
});