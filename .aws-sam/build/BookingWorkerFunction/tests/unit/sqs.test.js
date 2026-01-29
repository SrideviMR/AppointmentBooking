"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_sqs_1 = require("@aws-sdk/client-sqs");
// Mock the AWS SDK
const mockSend = jest.fn();
jest.mock("@aws-sdk/client-sqs", () => ({
    SQSClient: jest.fn(() => ({ send: mockSend })),
    SendMessageCommand: jest.fn()
}));
// Import after mocking
const sqs_1 = require("../../src/utils/sqs");
describe("SQS Utils", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it("should send message with object body", async () => {
        mockSend.mockResolvedValue({});
        await (0, sqs_1.sendMessage)({
            QueueUrl: "test-queue",
            MessageBody: { test: "data" }
        });
        expect(client_sqs_1.SendMessageCommand).toHaveBeenCalledWith({
            QueueUrl: "test-queue",
            MessageBody: JSON.stringify({ test: "data" }),
            DelaySeconds: undefined,
            MessageGroupId: undefined
        });
        expect(mockSend).toHaveBeenCalled();
    });
    it("should send message with string body", async () => {
        mockSend.mockResolvedValue({});
        await (0, sqs_1.sendMessage)({
            QueueUrl: "test-queue",
            MessageBody: "test-string",
            DelaySeconds: 10,
            MessageGroupId: "group1"
        });
        expect(client_sqs_1.SendMessageCommand).toHaveBeenCalledWith({
            QueueUrl: "test-queue",
            MessageBody: "test-string",
            DelaySeconds: 10,
            MessageGroupId: "group1"
        });
    });
    it("should handle send message error", async () => {
        const error = new Error("SQS Error");
        mockSend.mockRejectedValue(error);
        await expect((0, sqs_1.sendMessage)({
            QueueUrl: "test-queue",
            MessageBody: "test"
        })).rejects.toThrow("SQS Error");
    });
});
//# sourceMappingURL=sqs.test.js.map