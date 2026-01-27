import { handler as createProvider } from "../../src/handlers/providers/create-provider";
import { providerDao } from "../../src/dao/provider-dao";

jest.mock("../../src/dao/provider-dao");

const mockProviderDao = providerDao as jest.Mocked<typeof providerDao>;

describe("Provider Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should create provider successfully", async () => {
    mockProviderDao.insertProviderDao.mockResolvedValue({} as any);

    const event = {
      body: JSON.stringify({
        providerId: "provider1",
        providerName: "Dr. Smith",
        providerType: "DOCTOR"
      })
    } as any;

    const response = await createProvider(event);
    
    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.providerId).toBe("provider1");
    expect(body.name).toBe("Dr. Smith");
    expect(body.type).toBe("DOCTOR");
  });

  it("should handle validation errors", async () => {
    const event = {
      body: JSON.stringify({
        providerId: "provider1"
        // Missing required fields
      })
    } as any;

    const response = await createProvider(event);
    
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.message).toContain("required");
  });
});