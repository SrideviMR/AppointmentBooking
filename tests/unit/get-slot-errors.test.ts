import { handler as getSlots } from "../../src/handlers/slot/get-slot";
import { queryItems } from "../../src/utils/dynamodb";

jest.mock("../../src/utils/dynamodb");

const mockQueryItems = queryItems as jest.MockedFunction<typeof queryItems>;

describe("GetSlots Error Handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should handle missing providerId", async () => {
    const event = {
      pathParameters: null,
      queryStringParameters: { date: "2024-01-01" }
    } as any;

    const response = await getSlots(event);
    
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("providerId is required");
  });

  it("should handle missing date parameter", async () => {
    const event = {
      pathParameters: { providerId: "provider1" },
      queryStringParameters: null
    } as any;

    const response = await getSlots(event);
    
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("date query parameter is required");
  });

  it("should handle invalid date format", async () => {
    const event = {
      pathParameters: { providerId: "provider1" },
      queryStringParameters: { date: "invalid-date" }
    } as any;

    const response = await getSlots(event);
    
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("date must be in YYYY-MM-DD format");
  });

  it("should handle DynamoDB ValidationException", async () => {
    const error = new Error("ValidationException");
    error.name = "ValidationException";
    mockQueryItems.mockRejectedValueOnce(error);

    const event = {
      pathParameters: { providerId: "provider1" },
      queryStringParameters: { date: "2024-01-01" }
    } as any;

    const response = await getSlots(event);
    
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toBe("Invalid query parameters for DynamoDB");
  });

  it("should handle general database errors", async () => {
    const error = new Error("Database error");
    mockQueryItems.mockRejectedValueOnce(error);

    const event = {
      pathParameters: { providerId: "provider1" },
      queryStringParameters: { date: "2024-01-01" }
    } as any;

    const response = await getSlots(event);
    
    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.message).toContain("Failed to fetch slots");
  });
});