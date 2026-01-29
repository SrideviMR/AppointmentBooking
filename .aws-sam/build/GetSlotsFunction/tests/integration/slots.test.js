"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const get_slot_1 = require("../../src/handlers/slot/get-slot");
const dynamodb_1 = require("../../src/utils/dynamodb");
jest.mock("../../src/utils/dynamodb");
const mockQueryItems = dynamodb_1.queryItems;
describe("Slot Retrieval Integration Tests", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it("should retrieve available slots", async () => {
        mockQueryItems.mockResolvedValue([
            { SK: "SLOT#2024-01-01#09:00", status: "AVAILABLE" },
            { SK: "SLOT#2024-01-01#09:30", status: "AVAILABLE" },
            { SK: "SLOT#2024-01-01#10:00", status: "HELD" }
        ]);
        const event = {
            pathParameters: { providerId: "provider1" },
            queryStringParameters: { date: "2024-01-01" }
        };
        const response = await (0, get_slot_1.handler)(event);
        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.availableSlots).toHaveLength(2);
        expect(body.availableSlots[0].time).toBe("09:00");
        expect(body.availableSlots[1].time).toBe("09:30");
    });
    it("should handle missing parameters", async () => {
        const event = {
            pathParameters: { providerId: "provider1" }
            // Missing date query parameter
        };
        const response = await (0, get_slot_1.handler)(event);
        expect(response.statusCode).toBe(400);
    });
});
//# sourceMappingURL=slots.test.js.map