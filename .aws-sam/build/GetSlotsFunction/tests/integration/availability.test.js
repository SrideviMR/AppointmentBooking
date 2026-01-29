"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const create_availability_1 = require("../../src/handlers/availability/create-availability");
const dynamodb_1 = require("../../src/utils/dynamodb");
jest.mock("../../src/utils/dynamodb");
const mockPutItem = dynamodb_1.putItem;
const mockGetItem = dynamodb_1.getItem;
const mockBatchWriteItems = dynamodb_1.batchWriteItems;
describe("Availability Integration Tests", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it("should create availability and slots", async () => {
        mockGetItem.mockResolvedValue({ PK: "PROVIDER#provider1" });
        mockPutItem.mockResolvedValue({});
        mockBatchWriteItems.mockResolvedValue();
        const event = {
            pathParameters: { providerId: "provider1" },
            body: JSON.stringify({
                date: "2024-01-01",
                startTime: "09:00",
                endTime: "11:00",
                slotDurationMinutes: 30
            })
        };
        const response = await (0, create_availability_1.handler)(event);
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
        };
        const response = await (0, create_availability_1.handler)(event);
        expect(response.statusCode).toBe(404);
    });
});
//# sourceMappingURL=availability.test.js.map