import { handler as createBooking } from "../../src/handlers/booking/create-booking";
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

describe("Booking Creation Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BOOKING_QUEUE_URL = "test-queue-url";
  });

  it("should create booking successfully", async () => {
    mockSlotDao.holdSlot.mockResolvedValue(true);
    mockBookingDao.createPendingBooking.mockResolvedValue({} as any);
    mockSendMessage.mockResolvedValue();

    const event = {
      body: JSON.stringify({
        providerId: "provider1",
        slotId: "2024-01-01#10:00",
        userId: "user1"
      })
    } as any;

    const response = await createBooking(event);
    
    expect(response.statusCode).toBe(202);
    const body = JSON.parse(response.body);
    expect(body.bookingId).toBe("booking-test-uuid");
    expect(body.status).toBe("PENDING");
  });

  it("should handle slot unavailable", async () => {
    mockSlotDao.holdSlot.mockRejectedValue({
      name: "ConditionalCheckFailedException"
    });
    
    const event = {
      body: JSON.stringify({
        providerId: "provider1",
        slotId: "2024-01-01#10:00",
        userId: "user1"
      })
    } as any;

    const response = await createBooking(event);
    
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Slot already booked");
  });
});