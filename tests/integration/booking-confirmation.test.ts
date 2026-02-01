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

  it("should confirm booking and keep heldBy field for cancellation", async () => {
    mockBookingDao.getBookingById.mockResolvedValue({
      PK: "BOOKING#booking-123",
      SK: "METADATA",
      providerId: "provider1",
      slotId: "2024-01-01#10:00",
      state: "PENDING"
    } as any);
    mockSlotDao.confirmSlot.mockResolvedValue(true);
    mockBookingDao.confirm.mockResolvedValue({} as any);

    const event = {
      pathParameters: { bookingId: "booking-f47ac10b-58cc-4372-a567-0e02b2c3d479" }
    } as any;

    const response = await confirmBooking(event);
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.state).toBe("CONFIRMED");
    expect(body.message).toBe("Booking confirmed successfully");
    
    // Verify slot confirmation was called
    expect(mockSlotDao.confirmSlot).toHaveBeenCalledWith(
      "provider1",
      "2024-01-01#10:00",
      "booking-f47ac10b-58cc-4372-a567-0e02b2c3d479"
    );
  });

  it("should handle slot not held by booking", async () => {
    mockBookingDao.getBookingById.mockResolvedValue({
      PK: "BOOKING#booking-456",
      SK: "METADATA",
      providerId: "provider1",
      slotId: "2024-01-01#10:00",
      state: "PENDING"
    } as any);
    mockSlotDao.confirmSlot.mockResolvedValue(false);

    const event = {
      pathParameters: { bookingId: "booking-f47ac10b-58cc-4372-a567-0e02b2c3d456" }
    } as any;

    const response = await confirmBooking(event);
    
    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Slot is no longer held by this booking");
  });

  it("should handle booking not found", async () => {
    mockBookingDao.getBookingById.mockResolvedValue(undefined);

    const event = {
      pathParameters: { bookingId: "booking-f47ac10b-58cc-4372-a567-0e02b2c3d999" }
    } as any;

    const response = await confirmBooking(event);
    
    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Booking not found");
  });

  it("should handle booking already confirmed", async () => {
    mockBookingDao.getBookingById.mockResolvedValue({
      PK: "BOOKING#booking-789",
      SK: "METADATA",
      providerId: "provider1",
      slotId: "2024-01-01#10:00",
      state: "CONFIRMED" // Already confirmed
    } as any);
    
    const conditionalError = new Error("ConditionalCheckFailedException");
    conditionalError.name = "ConditionalCheckFailedException";
    mockBookingDao.confirm.mockRejectedValue(conditionalError);

    const event = {
      pathParameters: { bookingId: "booking-f47ac10b-58cc-4372-a567-0e02b2c3d789" }
    } as any;

    const response = await confirmBooking(event);
    
    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Booking cannot be confirmed. Current state: CONFIRMED");
  });

  it("should handle invalid booking ID format", async () => {
    const event = {
      pathParameters: { bookingId: "invalid-booking-id" }
    } as any;

    const response = await confirmBooking(event);
    
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Invalid booking ID format");
  });
});