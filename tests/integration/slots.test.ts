import { handler as getSlots } from "../../src/handlers/slot/get-slot";
import { queryItems } from "../../src/utils/dynamodb";

jest.mock("../../src/utils/dynamodb");

const mockQueryItems = queryItems as jest.MockedFunction<typeof queryItems>;

describe("Slot Retrieval Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should retrieve available slots", async () => {
    mockQueryItems.mockResolvedValue([
      { SK: "SLOT#2024-01-01#09:00", status: "AVAILABLE" },
      { SK: "SLOT#2024-01-01#09:30", status: "AVAILABLE" },
      { SK: "SLOT#2024-01-01#10:00", status: "RESERVED" }
    ]);

    const event = {
      pathParameters: { providerId: "provider1" },
      queryStringParameters: { date: "2024-01-01" }
    } as any;

    const response = await getSlots(event);
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.availableSlots).toHaveLength(2);
    expect(body.availableSlots[0].time).toBe("09:00");
    expect(body.availableSlots[1].time).toBe("09:30");
  });

  it("should show expired HELD slots as available", async () => {
    mockQueryItems.mockResolvedValue([
      { SK: "SLOT#2024-01-01#09:00", status: "AVAILABLE" },
      { 
        SK: "SLOT#2024-01-01#09:30", 
        status: "HELD",
        holdExpiresAt: new Date(Date.now() - 60000).toISOString() // 1 min ago (expired)
      },
      { 
        SK: "SLOT#2024-01-01#10:00", 
        status: "HELD",
        holdExpiresAt: new Date(Date.now() + 300000).toISOString() // 5 min future (not expired)
      }
    ]);

    const event = {
      pathParameters: { providerId: "provider1" },
      queryStringParameters: { date: "2024-01-01" }
    } as any;

    const response = await getSlots(event);
    
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.availableSlots).toHaveLength(2); // Available + Expired HELD
    expect(body.availableSlots.map((s: any) => s.time)).toEqual(["09:00", "09:30"]);
  });

  it("should handle missing parameters", async () => {
    const event = {
      pathParameters: { providerId: "provider1" }
      // Missing date query parameter
    } as any;

    const response = await getSlots(event);
    
    expect(response.statusCode).toBe(400);
  });
});