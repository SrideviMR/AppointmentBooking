import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { CreateBookingInput, CreateBookingResponse, BookingQueueMessage } from "../../types";
import {
  successResponse,
  validationError,
  internalError,
} from "../../utils/response";
import { generateExpirationTime, getCurrentTimestamp } from "../../utils/time";
import { randomUUID } from "crypto";
import { logger } from "../../utils/logger";
import { slotDao } from "../../dao/slot-dao";
import { bookingDao } from "../../dao/booking-dao";
import {sendMessage} from "../../utils/sqs"

const sqsClient = new SQSClient({});
const QUEUE_URL = process.env.BOOKING_QUEUE_URL!;

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  console.log("Create booking request received:", event.body)
  logger.info("Create booking request received:", { event })

  try {
    if (!event.body) {
      return validationError("Request body is required");
    }

    const input: CreateBookingInput = JSON.parse(event.body);

    // Validation
    if (!input.providerId || !input.slotId || !input.userId) {
      return validationError("providerId, slotId, and userId are required");
    }

    // Validate slotId format (date#time)
    const slotParts = input.slotId.split("#");
    if (slotParts.length !== 2) {
      return validationError("slotId must be in format date#time (e.g., 2026-02-10#10:00)");
    }
    
    // Generate booking ID
    const bookingId = `booking-${randomUUID()}`;
    const expiresAt = generateExpirationTime(5);

    try {
      await slotDao.holdSlot(input.providerId, input.slotId, bookingId, expiresAt);
    } catch (err: any) {
      if (err.name === "ConditionalCheckFailedException") {
        return validationError("Slot already booked");
      }
      throw err;
    }
    
    await bookingDao.createPendingBooking({
      bookingId,
      providerId: input.providerId,
      slotId: input.slotId,
      userId: input.userId,
      expiresAt
    });

    // Create SQS message
    const message: BookingQueueMessage = {
      bookingId,
      providerId: input.providerId,
      slotId: input.slotId,
      userId: input.userId,
      timestamp: getCurrentTimestamp(),
    };

    // Send to SQS queue

    await sendMessage({QueueUrl: QUEUE_URL, MessageBody: JSON.stringify(message)});

    const response: CreateBookingResponse = {
      bookingId,
      status: "PENDING",
      expiresAt: generateExpirationTime(5), // 5 minutes from now
    };

    return successResponse(response, 202); // 202 Accepted
  } catch (error: any) {
    console.error("Error creating booking:", error);
    return internalError(error.message);
  }
}