import { handler as createAvailability } from "../../src/handlers/availability/create-availability";
import { putItem, getItem, batchWriteItems } from "../../src/utils/dynamodb";

jest.mock("../../src/utils/dynamodb");

const mockPutItem = putItem as jest.MockedFunction<typeof putItem>;
const mockGetItem = getItem as jest.MockedFunction<typeof getItem>;
const mockBatchWriteItems = batchWriteItems as jest.MockedFunction<typeof batchWriteItems>;

describe("Availability Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create availability and slots", async () => {
    mockGetItem.mockResolvedValue({ PK: "PROVIDER#provider1" });
    mockPutItem.mockResolvedValue({} as any);
    mockBatchWriteItems.mockResolvedValue();

    const event = {
      pathParameters: { providerId: "provider1" },
      body: JSON.stringify({
        date: "2024-01-01",
        startTime: "09:00",
        endTime: "11:00",
        slotDurationMinutes: 30
      })
    } as any;

    const response = await createAvailability(event);
    
    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.slotsCreated).toBe(4);
    expect(body.slots).toEqual(["09:00", "09:30", "10:00", "10:30"]);
  });

  it("should handle provider not found", async () => {
    mockGetItem.mockResolvedValue(undefined);

    const event = {
      pathParameters: { providerId: "nonexistent" },
      body: JSON.stringify({
        date: "2024-01-01",
        startTime: "09:00",
        endTime: "11:00",
        slotDurationMinutes: 30
      })
    } as any;

    const response = await createAvailability(event);
    
    expect(response.statusCode).toBe(404);
  });
});