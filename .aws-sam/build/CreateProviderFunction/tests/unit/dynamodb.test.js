"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
// Mock the AWS SDK
const mockSend = jest.fn();
jest.mock("@aws-sdk/client-dynamodb", () => ({
    DynamoDBClient: jest.fn()
}));
jest.mock("@aws-sdk/lib-dynamodb", () => ({
    DynamoDBDocumentClient: {
        from: jest.fn(() => ({ send: mockSend }))
    },
    PutCommand: jest.fn(),
    GetCommand: jest.fn(),
    UpdateCommand: jest.fn(),
    QueryCommand: jest.fn(),
    BatchWriteCommand: jest.fn()
}));
// Import after mocking
const dynamodb_1 = require("../../src/utils/dynamodb");
describe("DynamoDB Utils", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.TABLE_NAME = "test-table";
    });
    it("should put item", async () => {
        mockSend.mockResolvedValue({});
        await (0, dynamodb_1.putItem)({ PK: "test", SK: "test" });
        expect(mockSend).toHaveBeenCalled();
        expect(lib_dynamodb_1.PutCommand).toHaveBeenCalledWith({
            TableName: "test-table",
            Item: { PK: "test", SK: "test" }
        });
    });
    it("should get item", async () => {
        mockSend.mockResolvedValue({ Item: { PK: "test" } });
        const result = await (0, dynamodb_1.getItem)({ PK: "test", SK: "test" });
        expect(result).toEqual({ PK: "test" });
        expect(lib_dynamodb_1.GetCommand).toHaveBeenCalledWith({
            TableName: "test-table",
            Key: { PK: "test", SK: "test" }
        });
    });
    it("should get item returning undefined", async () => {
        mockSend.mockResolvedValue({});
        const result = await (0, dynamodb_1.getItem)({ PK: "test", SK: "test" });
        expect(result).toBeUndefined();
    });
    it("should update item", async () => {
        mockSend.mockResolvedValue({});
        await (0, dynamodb_1.updateItem)({ PK: "test" }, "SET #attr = :val", { ":val": "value" }, { "#attr": "attribute" }, "condition");
        expect(lib_dynamodb_1.UpdateCommand).toHaveBeenCalledWith({
            TableName: "test-table",
            Key: { PK: "test" },
            UpdateExpression: "SET #attr = :val",
            ExpressionAttributeValues: { ":val": "value" },
            ExpressionAttributeNames: { "#attr": "attribute" },
            ConditionExpression: "condition",
            ReturnValues: "ALL_NEW"
        });
    });
    it("should query items", async () => {
        mockSend.mockResolvedValue({ Items: [{ PK: "test" }] });
        const result = await (0, dynamodb_1.queryItems)("PK = :pk", { ":pk": "test" }, { "#attr": "attribute" }, "filter", "GSI1");
        expect(result).toEqual([{ PK: "test" }]);
        expect(lib_dynamodb_1.QueryCommand).toHaveBeenCalledWith({
            TableName: "test-table",
            KeyConditionExpression: "PK = :pk",
            ExpressionAttributeValues: { ":pk": "test" },
            ExpressionAttributeNames: { "#attr": "attribute" },
            FilterExpression: "filter",
            IndexName: "GSI1"
        });
    });
    it("should query items with no results", async () => {
        mockSend.mockResolvedValue({});
        const result = await (0, dynamodb_1.queryItems)("PK = :pk", { ":pk": "test" });
        expect(result).toEqual([]);
    });
    it("should batch write items", async () => {
        mockSend.mockResolvedValue({});
        await (0, dynamodb_1.batchWriteItems)([{ PK: "test1" }, { PK: "test2" }]);
        expect(lib_dynamodb_1.BatchWriteCommand).toHaveBeenCalledWith({
            RequestItems: {
                "test-table": [
                    { PutRequest: { Item: { PK: "test1" } } },
                    { PutRequest: { Item: { PK: "test2" } } }
                ]
            }
        });
    });
    it("should batch write large number of items", async () => {
        mockSend.mockResolvedValue({});
        const items = Array.from({ length: 30 }, (_, i) => ({ PK: `test${i}` }));
        await (0, dynamodb_1.batchWriteItems)(items);
        expect(mockSend).toHaveBeenCalledTimes(2); // Should split into 2 batches
    });
});
//# sourceMappingURL=dynamodb.test.js.map