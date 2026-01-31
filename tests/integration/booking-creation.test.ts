import { handler as createBooking } from "../../src/handlers/booking/create-booking";
import { queryItems } from "../../src/utils/dynamodb";
import { slotDao } from "../../src/dao/slot-dao";
import { sendMessage } from "../../src/utils/sqs";

jest.mock("../../src/utils/dynamodb");
jest.mock("../../src/dao/slot-dao");
jest.mock("../../src/utils/sqs");
jest.mock("crypto", () => ({ randomUUID: () => "test-uuid" }));

const mockQueryItems = queryItems as jest.MockedFunction<typeof queryItems>;
const mockSlotDao = slotDao as jest.Mocked<typeof slotDao>;
const mockSendMessage = sendMessage as jest.MockedFunction<typeof sendMessage>;

describe("Booking Creation Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BOOKING_QUEUE_URL = "test-queue-url";
  });

  it("should create booking successfully", async () => {
    // Mock slot exists and is available
    mockQueryItems.mockResolvedValue([{
      PK: "PROVIDER#provider1",
      SK: "SLOT#2024-01-01#10:00",
      status: "AVAILABLE"
    }]);
    
    mockSlotDao.holdSlot.mockResolvedValue(true);
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
    expect(mockSendMessage).toHaveBeenCalledWith({
      QueueUrl: "test-queue-url",
      MessageBody: expect.stringContaining('"bookingId":"booking-test-uuid"')
    });
  });

  it("should reject booking for held slot", async () => {
    // Mock slot is held with future expiration
    mockQueryItems.mockResolvedValue([{
      PK: "PROVIDER#provider1",
      SK: "SLOT#2024-01-01#10:00",
      status: "HELD",
      holdExpiresAt: new Date(Date.now() + 300000).toISOString() // 5 min future
    }]);
    
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
    expect(body.message).toContain("held by another user");
  });

  it("should reject booking for reserved slot", async () => {
    mockQueryItems.mockResolvedValue([{
      PK: "PROVIDER#provider1",
      SK: "SLOT#2024-01-01#10:00",
      status: "BOOKED"
    }]);
    
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
    expect(body.message).toBe("Slot is already booked. Please select another slot.");
  });
});