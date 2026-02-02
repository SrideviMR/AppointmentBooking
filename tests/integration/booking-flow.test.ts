import { handler as createBooking } from "../../src/handlers/booking/create-booking";
import { handler as confirmBooking } from "../../src/handlers/booking/confirm-booking";
import { handler as getBooking } from "../../src/handlers/booking/get-booking";
import { queryItems } from "../../src/utils/dynamodb";
import { slotDao } from "../../src/dao/slot-dao";
import { bookingDao } from "../../src/dao/booking-dao";
import { sendMessage } from "../../src/utils/sqs";

jest.mock("../../src/utils/dynamodb");
jest.mock("../../src/dao/slot-dao");
jest.mock("../../src/dao/booking-dao");
jest.mock("../../src/utils/sqs");
jest.mock("crypto", () => ({ randomUUID: () => "12345678-1234-4234-8234-123456789012" }));

const mockQueryItems = queryItems as jest.MockedFunction<typeof queryItems>;
const mockSlotDao = slotDao as jest.Mocked<typeof slotDao>;
const mockBookingDao = bookingDao as jest.Mocked<typeof bookingDao>;
const mockSendMessage = sendMessage as jest.MockedFunction<typeof sendMessage>;

describe("Complete Booking Flow Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BOOKING_QUEUE_URL = "test-queue-url";
  });

  it("should complete full booking lifecycle", async () => {
    // Setup mocks for create booking
    mockQueryItems.mockResolvedValue([{
      PK: "PROVIDER#provider1",
      SK: "SLOT#2024-01-01#10:00",
      status: "AVAILABLE"
    }]);
    mockSlotDao.holdSlot.mockResolvedValue(true);
    mockSendMessage.mockResolvedValue();
    
    // Setup mocks for confirm booking
    mockBookingDao.getBookingById.mockResolvedValue({
      PK: "BOOKING#booking-12345678-1234-4234-8234-123456789012",
      SK: "METADATA",
      providerId: "provider1",
      slotId: "2024-01-01#10:00",
      userId: "user1",
      state: "PENDING",
      createdAt: "2024-01-01T10:00:00.000Z",
      expiresAt: "2024-01-01T10:05:00.000Z"
    } as any);
    mockSlotDao.confirmBookingAndReserveSlot.mockResolvedValueOnce(undefined);

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
    expect(createBody.bookingId).toBe("booking-12345678-1234-4234-8234-123456789012");

    // 2. Confirm booking
    const confirmResponse = await confirmBooking({
      pathParameters: { bookingId: "booking-12345678-1234-4234-8234-123456789012" }
    } as any);
    
    expect(confirmResponse.statusCode).toBe(200);
    const confirmBody = JSON.parse(confirmResponse.body);
    expect(confirmBody.state).toBe("CONFIRMED");

    // 3. Retrieve booking
    const getResponse = await getBooking({
      pathParameters: { bookingId: "booking-12345678-1234-4234-8234-123456789012" }
    } as any);
    
    expect(getResponse.statusCode).toBe(200);
    const getBody = JSON.parse(getResponse.body);
    expect(getBody.bookingId).toBe("booking-12345678-1234-4234-8234-123456789012");
  });
});