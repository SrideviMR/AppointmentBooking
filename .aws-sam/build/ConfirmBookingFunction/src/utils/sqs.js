"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessage = void 0;
const client_sqs_1 = require("@aws-sdk/client-sqs");
const logger_1 = require("./logger");
const client = new client_sqs_1.SQSClient({ region: "us-east-1" });
const sendMessage = async ({ QueueUrl, MessageBody, DelaySeconds, MessageGroupId }) => {
    const body = typeof MessageBody === "object" ? JSON.stringify(MessageBody) : MessageBody;
    const sendMessageCommand = new client_sqs_1.SendMessageCommand({ QueueUrl: QueueUrl, MessageBody: body, DelaySeconds, MessageGroupId });
    try {
        await client.send(sendMessageCommand);
    }
    catch (error) {
        logger_1.logger.error("Failed to send message to SQS", { error, QueueUrl });
        throw error;
    }
};
exports.sendMessage = sendMessage;
//# sourceMappingURL=sqs.js.map