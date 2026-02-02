import { handler as cancelBooking } from "../../src/handlers/booking/cancel-booking";
import { slotDao } from "../../src/dao/slot-dao";
import { bookingDao } from "../../src/dao/booking-dao";
import { BookingState } from "../../src/types/enums";

jest.mock("../../src/dao/slot-dao");
jest.mock("../../src/dao/booking-dao");

const mockSlotDao = slotDao as jest.Mocked<typeof slotDao>;
const mockBookingDao = bookingDao as jest.Mocked<typeof bookingDao>;

describe("Booking Cancellation Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should cancel pending booking atomically", async () => {
    mockBookingDao.getBookingById.mockResolvedValue({
      PK: "BOOKING#booking-123",
      SK: "METADATA",
      providerId: "provider1",
      slotId: "2024-01-01#10:00",
      state: BookingState.PENDING
    } as any);
    mockSlotDao.cancelBookingAndReleaseSlot.mockResolvedValue(undefined);

    const event = {
      pathParameters: { bookingId: "booking-f47ac10b-58cc-4372-a567-0e02b2c3d479" }
    } as any;

    const response = await cancelBooking(event);
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.state).toBe(BookingState.CANCELLED);
    expect(body.message).toBe("Booking cancelled and slot released");
    expect(mockSlotDao.cancelBookingAndReleaseSlot).toHaveBeenCalledWith(
      "booking-f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "provider1",
      "2024-01-01#10:00"
    );
  });

  it("should cancel confirmed booking atomically", async () => {
    mockBookingDao.getBookingById.mockResolvedValue({
      PK: "BOOKING#booking-456",
      SK: "METADATA",
      providerId: "provider1",
      slotId: "2024-01-01#14:00",
      state: BookingState.CONFIRMED
    } as any);
    mockSlotDao.cancelBookingAndReleaseSlot.mockResolvedValue(undefined);

    const event = {
      pathParameters: { bookingId: "booking-f47ac10b-58cc-4372-a567-0e02b2c3d456" }
    } as any;

    const response = await cancelBooking(event);
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.state).toBe(BookingState.CONFIRMED);
    // Confirmed bookings can be cancelled because slot keeps heldBy field
    expect(mockSlotDao.cancelBookingAndReleaseSlot).toHaveBeenCalled();
  });

  it("should handle booking not found", async () => {
    mockBookingDao.getBookingById.mockResolvedValue(undefined);

    const event = {
      pathParameters: { bookingId: "booking-f47ac10b-58cc-4372-a567-0e02b2c3d479" }
    } as any;

    const response = await cancelBooking(event);
    
    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Booking not found");
  });

  it("should handle transaction failure when slot not held by booking", async () => {
    mockBookingDao.getBookingById.mockResolvedValue({
      PK: "BOOKING#booking-789",
      SK: "METADATA",
      providerId: "provider1",
      slotId: "2024-01-01#16:00",
      state: "PENDING"
    } as any);
    
    const transactionError = new Error("Transaction cancelled");
    transactionError.name = "TransactionCanceledException";
    (transactionError as any).CancellationReasons = [
      { Code: "None" },
      { Code: "ConditionalCheckFailed" } // Slot condition failed
    ];
    mockSlotDao.cancelBookingAndReleaseSlot.mockRejectedValue(transactionError);

    const event = {
      pathParameters: { bookingId: "booking-f47ac10b-58cc-4372-a567-0e02b2c3d789" }
    } as any;

    const response = await cancelBooking(event);
    
    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Slot is no longer held by this booking");
  });

  it("should handle invalid booking ID format", async () => {
    const event = {
      pathParameters: { bookingId: "invalid-booking-id" }
    } as any;

    const response = await cancelBooking(event);
    
    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Invalid booking ID format");
  });
});