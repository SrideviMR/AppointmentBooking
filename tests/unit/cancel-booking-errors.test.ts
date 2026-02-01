import { handler as cancelBooking } from "../../src/handlers/booking/cancel-booking";
import { bookingDao } from "../../src/dao/booking-dao";
import { slotDao } from "../../src/dao/slot-dao";

jest.mock("../../src/dao/booking-dao");
jest.mock("../../src/dao/slot-dao");

const mockBookingDao = bookingDao as jest.Mocked<typeof bookingDao>;
const mockSlotDao = slotDao as jest.Mocked<typeof slotDao>;

describe("CancelBooking Error Handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should handle missing bookingId", async () => {
    const event = {
      pathParameters: null
    } as any;

    const response = await cancelBooking(event);
    
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Booking ID is required");
  });

  it("should handle booking not found", async () => {
    mockBookingDao.getBookingById.mockResolvedValueOnce(undefined);

    const event = {
      pathParameters: { bookingId: "booking-f47ac10b-58cc-4372-a567-0e02b2c3d479" }
    } as any;

    const response = await cancelBooking(event);
    
    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Booking not found");
  });

  it("should handle slot release failure", async () => {
    mockBookingDao.getBookingById.mockResolvedValueOnce({
      PK: "BOOKING#booking-123",
      SK: "METADATA",
      providerId: "provider1",
      slotId: "2024-01-01#10:00",
      state: "PENDING"
    } as any);

    const transactionError = new Error("Transaction cancelled");
    transactionError.name = "TransactionCanceledException";
    (transactionError as any).CancellationReasons = [
      { Code: "None" },
      { Code: "ConditionalCheckFailed" }
    ];
    mockSlotDao.cancelBookingAndReleaseSlot.mockRejectedValueOnce(transactionError);

    const event = {
      pathParameters: { bookingId: "booking-f47ac10b-58cc-4372-a567-0e02b2c3d479" }
    } as any;

    const response = await cancelBooking(event);
    
    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Slot is no longer held by this booking");
  });

  it("should handle booking cancellation conditional failure", async () => {
    mockBookingDao.getBookingById.mockResolvedValueOnce({
      PK: "BOOKING#booking-456",
      SK: "METADATA",
      providerId: "provider1",
      slotId: "2024-01-01#10:00",
      state: "CONFIRMED"
    } as any);

    const transactionError = new Error("Transaction cancelled");
    transactionError.name = "TransactionCanceledException";
    (transactionError as any).CancellationReasons = [
      { Code: "ConditionalCheckFailed" },
      { Code: "None" }
    ];
    mockSlotDao.cancelBookingAndReleaseSlot.mockRejectedValueOnce(transactionError);

    const event = {
      pathParameters: { bookingId: "booking-f47ac10b-58cc-4372-a567-0e02b2c3d456" }
    } as any;

    const response = await cancelBooking(event);
    
    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body);
    expect(body.message).toContain("Booking cannot be cancelled");
  });

  it("should handle database errors", async () => {
    const event = {
      pathParameters: { bookingId: "booking-f47ac10b-58cc-4372-a567-0e02b2c3d789" }
    } as any;

    mockBookingDao.getBookingById.mockRejectedValueOnce(new Error("Database error"));

    const response = await cancelBooking(event);
    
    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Failed to cancel booking");
  });
});