import {SendMessageBatchCommand, SendMessageCommand, SQSClient} from "@aws-sdk/client-sqs";
import { logger } from "./logger";

const client = new SQSClient({ region: "us-east-1" });

export const sendMessage = async ({QueueUrl, MessageBody, DelaySeconds, MessageGroupId}: { QueueUrl: string, MessageBody: object | string, DelaySeconds?: number, MessageGroupId?: string}): Promise<void> => {
    const body = typeof MessageBody === "object" ? JSON.stringify(MessageBody) : MessageBody;
    const sendMessageCommand = new SendMessageCommand({QueueUrl: QueueUrl, MessageBody: body, DelaySeconds, MessageGroupId});
    try {
        await client.send(sendMessageCommand);
    } catch (error) {
        logger.error("Failed to send message to SQS", { error, QueueUrl });
        throw error; 
      }
      
};


