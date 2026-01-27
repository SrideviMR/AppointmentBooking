import { handler as createBooking } from "../../src/handlers/booking/create-booking";
import { handler as confirmBooking } from "../../src/handlers/booking/confirm-booking";
import { handler as getBooking } from "../../src/handlers/booking/get-booking";
import { slotDao } from "../../src/dao/slot-dao";
import { bookingDao } from "../../src/dao/booking-dao";
import { sendMessage } from "../../src/utils/sqs";

jest.mock("../../src/dao/slot-dao");
jest.mock("../../src/dao/booking-dao");
jest.mock("../../src/utils/sqs");
jest.mock("crypto", () => ({ randomUUID: () => "test-uuid" }));

const mockSlotDao = slotDao as jest.Mocked<typeof slotDao>;
const mockBookingDao = bookingDao as jest.Mocked<typeof bookingDao>;
const mockSendMessage = sendMessage as jest.MockedFunction<typeof sendMessage>;

describe("Complete Booking Flow Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BOOKING_QUEUE_URL = "test-queue-url";
  });

  it("should complete full booking lifecycle", async () => {
    // Setup mocks
    mockSlotDao.holdSlot.mockResolvedValue(true);
    mockBookingDao.createPendingBooking.mockResolvedValue({} as any);
    mockSendMessage.mockResolvedValue();
    mockBookingDao.getBookingById.mockResolvedValue({
      PK: "BOOKING#booking-test-uuid",
      SK: "METADATA",
      providerId: "provider1",
      slotId: "2024-01-01#10:00",
      userId: "user1",
      state: "PENDING",
      createdAt: "2024-01-01T10:00:00.000Z",
      expiresAt: "2024-01-01T10:05:00.000Z"
    } as any);
    mockSlotDao.confirmSlot.mockResolvedValue(true);
    mockBookingDao.confirm.mockResolvedValue({} as any);

    // 1. Create booking
    const createResponse = await createBooking({
      body: JSON.stringify({
        providerId: "provider1",
        slotId: "2024-01-01#10:00",
        userId: "user1"
      })
    } as any);
    
    expect(createResponse.statusCode).toBe(202);
    const createBody = JSON.parse(createResponse.body);
    expect(createBody.bookingId).toBe("booking-test-uuid");

    // 2. Confirm booking
    const confirmResponse = await confirmBooking({
      pathParameters: { bookingId: "booking-test-uuid" }
    } as any);
    
    expect(confirmResponse.statusCode).toBe(200);
    const confirmBody = JSON.parse(confirmResponse.body);
    expect(confirmBody.state).toBe("CONFIRMED");

    // 3. Retrieve booking
    const getResponse = await getBooking({
      pathParameters: { bookingId: "booking-test-uuid" }
    } as any);
    
    expect(getResponse.statusCode).toBe(200);
    const getBody = JSON.parse(getResponse.body);
    expect(getBody.bookingId).toBe("booking-test-uuid");
  });
});