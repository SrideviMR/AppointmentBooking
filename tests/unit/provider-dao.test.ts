import { providerDao } from "../../src/dao/provider-dao";
import { putItem } from "../../src/utils/dynamodb";
import { getCurrentTimestamp } from "../../src/utils/time";

jest.mock("../../src/utils/dynamodb");
jest.mock("../../src/utils/time");

const mockPutItem = putItem as jest.MockedFunction<typeof putItem>;
const mockGetCurrentTimestamp = getCurrentTimestamp as jest.MockedFunction<typeof getCurrentTimestamp>;

describe("ProviderDAO", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentTimestamp.mockReturnValue("2024-01-01T10:00:00.000Z");
  });

  it("should insert provider successfully", async () => {
    mockPutItem.mockResolvedValue({} as any);

    const result = await providerDao.insertProviderDao({
      providerId: "provider1",
      providerName: "Dr. Smith",
      providerType: "DOCTOR",
      createdAt: "2024-01-01T10:00:00.000Z"
    });

    expect(mockPutItem).toHaveBeenCalledWith({
      PK: "PROVIDER#provider1",
      SK: "METADATA",
      providerName: "Dr. Smith",
      providerType: "DOCTOR",
      createdAt: "2024-01-01T10:00:00.000Z"
    });
    expect(result.PK).toBe("PROVIDER#provider1");
  });
});