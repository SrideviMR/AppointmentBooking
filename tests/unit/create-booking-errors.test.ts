import { handler as createBooking } from "../../src/handlers/booking/create-booking";
import { queryItems } from "../../src/utils/dynamodb";
import { slotDao } from "../../src/dao/slot-dao";
import { sendMessage } from "../../src/utils/sqs";
import { SlotStatus } from "../../src/types/enums";
import { SlotUnavailableError } from "../../src/types/booking";

jest.mock("../../src/utils/dynamodb");
jest.mock("../../src/dao/slot-dao");
jest.mock("../../src/utils/sqs");
jest.mock("crypto", () => ({ randomUUID: () => "12345678-1234-4234-8234-123456789012" }));

const mockQueryItems = queryItems as jest.MockedFunction<typeof queryItems>;
const mockSlotDao = slotDao as jest.Mocked<typeof slotDao>;
const mockSendMessage = sendMessage as jest.MockedFunction<typeof sendMessage>;

describe("CreateBooking Handler - Error & Success Handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BOOKING_QUEUE_URL = "test-queue-url";
  });

  it("should return 400 when request body is missing", async () => {
    const event = { body: null } as any;
    const response = await createBooking(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Request body is required");
  });

  it("should return 400 when required fields are missing", async () => {
    const event = {
      body: JSON.stringify({ providerId: "provider1" }) // missing slotId & userId
    } as any;

    const response = await createBooking(event);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("providerId, slotId, and userId are required");
  });

  it("should return 400 when slot does not exist", async () => {
    mockQueryItems.mockResolvedValueOnce([]);

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
    expect(body.message).toBe("Slot does not exist. Please create availability first.");
  });

  it("should return 400 when slot is held by another user", async () => {
    mockQueryItems.mockResolvedValueOnce([
      { PK: "PROVIDER#provider1", SK: "SLOT#2024-01-01#10:00", status: SlotStatus.AVAILABLE }
    ]);

    mockSlotDao.holdSlot.mockResolvedValueOnce(false);

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
    expect(body.message).toBe("Slot is held by another booking");
  });

  it("should return 500 when SQS send fails", async () => {
    mockQueryItems.mockResolvedValueOnce([
      { PK: "PROVIDER#provider1", SK: "SLOT#2024-01-01#10:00", status: SlotStatus.AVAILABLE }
    ]);

    mockSlotDao.holdSlot.mockResolvedValueOnce(true);
    mockSendMessage.mockRejectedValueOnce(new Error("SQS error"));

    const event = {
      body: JSON.stringify({
        providerId: "provider1",
        slotId: "2024-01-01#10:00",
        userId: "user1"
      })
    } as any;

    const response = await createBooking(event);

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("SQS error");
  });

  it("should return 202 on successful booking creation", async () => {
    mockQueryItems.mockResolvedValueOnce([
      { PK: "PROVIDER#provider1", SK: "SLOT#2024-01-01#10:00", status: SlotStatus.AVAILABLE }
    ]);
    mockSlotDao.holdSlot.mockResolvedValueOnce(true);
    mockSendMessage.mockResolvedValueOnce({} as any);

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
    expect(body.bookingId).toBe("booking-12345678-1234-4234-8234-123456789012");
    expect(body.status).toBe("PENDING");
    expect(body.expiresAt).toBeDefined();
  });
});
