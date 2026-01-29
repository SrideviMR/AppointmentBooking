"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const create_provider_1 = require("../../src/handlers/providers/create-provider");
const provider_dao_1 = require("../../src/dao/provider-dao");
jest.mock("../../src/dao/provider-dao");
const mockProviderDao = provider_dao_1.providerDao;
describe("Provider Integration Tests", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it("should create provider successfully", async () => {
        mockProviderDao.insertProviderDao.mockResolvedValue({});
        const event = {
            body: JSON.stringify({
                providerId: "provider1",
                providerName: "Dr. Smith",
                providerType: "DOCTOR"
            })
        };
        const response = await (0, create_provider_1.handler)(event);
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
        };
        const response = await (0, create_provider_1.handler)(event);
        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.message).toContain("required");
    });
});
//# sourceMappingURL=provider.test.js.map