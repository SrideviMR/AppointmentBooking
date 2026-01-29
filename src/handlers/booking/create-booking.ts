import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CreateBookingInput, CreateBookingResponse, BookingQueueMessage } from "../../types/booking";
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
import { sendMessage } from "../../utils/sqs"
import { Slot } from "../../types/slot"
import { queryItems } from "../../utils/dynamodb";

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
    const [date, time] = input.slotId.split("#");

    // 1. Fetch the slot
    const slotItems = await queryItems(
      "PK = :pk AND SK = :sk",
      {
        ":pk": `PROVIDER#${input.providerId}`,
        ":sk": `SLOT#${date}#${time}`,
      }
    );
    
    if (!slotItems || slotItems.length === 0) {
      return validationError("Slot does not exist. Please create availability first.");
    }
    
    const slot = slotItems[0] as Slot;
    
    // 2. Check slot status
    if (slot.status === "HELD" && slot.holdExpiresAt && new Date(slot.holdExpiresAt) > new Date()) {
      return validationError(`Slot is held by another user until ${slot.holdExpiresAt}`);
    } else if (slot.status === "BOOKED") {
      return validationError("Slot is already booked. Please select another slot.");
    }
    // Generate booking ID
    const bookingId = `booking-${randomUUID()}`;
    const expiresAt = generateExpirationTime(5);

    try {
      const held = await slotDao.holdSlot(input.providerId, input.slotId, bookingId, expiresAt)
    if (!held) {
  return validationError("Slot is held by another booking");
      }
    } catch (err: any) {
      if (err.name === "xConditionalCheckFailedException") {
        return validationError("Slot is held by another booking");
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