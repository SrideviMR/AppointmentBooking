"use strict";
// Global test setup
process.env.TABLE_NAME = "test-table";
process.env.BOOKING_QUEUE_URL = "test-queue-url";
// Mock AWS SDK
jest.mock("@aws-sdk/client-dynamodb");
jest.mock("@aws-sdk/lib-dynamodb");
jest.mock("@aws-sdk/client-sqs");
// Mock console methods to reduce noise in tests
global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
};
//# sourceMappingURL=setup.js.map