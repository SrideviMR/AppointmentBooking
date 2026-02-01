"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const provider_dao_1 = require("../../src/dao/provider-dao");
const dynamodb_1 = require("../../src/utils/dynamodb");
const time_1 = require("../../src/utils/time");
jest.mock("../../src/utils/dynamodb");
jest.mock("../../src/utils/time");
const mockPutItem = dynamodb_1.putItem;
const mockGetCurrentTimestamp = time_1.getCurrentTimestamp;
describe("ProviderDAO", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetCurrentTimestamp.mockReturnValue("2024-01-01T10:00:00.000Z");
    });
    it("should insert provider successfully", async () => {
        mockPutItem.mockResolvedValue({});
        const result = await provider_dao_1.providerDao.insertProviderDao({
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
        }, "attribute_not_exists(PK)");
        expect(result.PK).toBe("PROVIDER#provider1");
    });
});
//# sourceMappingURL=provider-dao.test.js.map