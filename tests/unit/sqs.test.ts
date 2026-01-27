import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

// Mock the AWS SDK
const mockSend = jest.fn();
jest.mock("@aws-sdk/client-sqs", () => ({
  SQSClient: jest.fn(() => ({ send: mockSend })),
  SendMessageCommand: jest.fn()
}));

// Import after mocking
import { sendMessage } from "../../src/utils/sqs";

describe("SQS Utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should send message with object body", async () => {
    mockSend.mockResolvedValue({});

    await sendMessage({
      QueueUrl: "test-queue",
      MessageBody: { test: "data" }
    });

    expect(SendMessageCommand).toHaveBeenCalledWith({
      QueueUrl: "test-queue",
      MessageBody: JSON.stringify({ test: "data" }),
      DelaySeconds: undefined,
      MessageGroupId: undefined
    });
    expect(mockSend).toHaveBeenCalled();
  });

  it("should send message with string body", async () => {
    mockSend.mockResolvedValue({});

    await sendMessage({
      QueueUrl: "test-queue",
      MessageBody: "test-string",
      DelaySeconds: 10,
      MessageGroupId: "group1"
    });

    expect(SendMessageCommand).toHaveBeenCalledWith({
      QueueUrl: "test-queue",
      MessageBody: "test-string",
      DelaySeconds: 10,
      MessageGroupId: "group1"
    });
  });

  it("should handle send message error", async () => {
    const error = new Error("SQS Error");
    mockSend.mockRejectedValue(error);

    await expect(sendMessage({
      QueueUrl: "test-queue",
      MessageBody: "test"
    })).rejects.toThrow("SQS Error");
  });
});