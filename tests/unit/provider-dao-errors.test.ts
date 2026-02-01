import { providerDao } from "../../src/dao/provider-dao";
import { putItem } from "../../src/utils/dynamodb";

jest.mock("../../src/utils/dynamodb");

const mockPutItem = putItem as jest.MockedFunction<typeof putItem>;

describe("ProviderDAO Error Handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should handle provider already exists error", async () => {
    const error = new Error("ConditionalCheckFailedException");
    error.name = "ConditionalCheckFailedException";
    mockPutItem.mockRejectedValueOnce(error);

    await expect(providerDao.insertProviderDao({
      providerId: "provider1",
      providerName: "Dr. Smith",
      providerType: "DOCTOR",
      createdAt: "2024-01-01T10:00:00.000Z"
    })).rejects.toThrow("Provider with providerId=provider1 already exists");
  });

  it("should handle other database errors", async () => {
    const error = new Error("Database connection failed");
    mockPutItem.mockRejectedValueOnce(error);

    await expect(providerDao.insertProviderDao({
      providerId: "provider1", 
      providerName: "Dr. Smith",
      providerType: "DOCTOR",
      createdAt: "2024-01-01T10:00:00.000Z"
    })).rejects.toThrow("Database connection failed");
  });
});