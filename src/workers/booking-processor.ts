import { SQSEvent, SQSRecord } from "aws-lambda";
import { BookingQueueMessage, Keys, Booking } from "../types";
import { updateItem, putItem } from "../utils/dynamodb";
import { generateExpirationTime, getCurrentTimestamp } from "../utils/time";
import { logger } from "../utils/logger";

export async function handler(event: SQSEvent): Promise<void> {
  logger.info(`Processing ${event.Records.length} booking requests`);

  const results = await Promise.allSettled(
    event.Records.map((record) => processBooking(record))
  );

  // Log failures
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      logger.error(`Failed to process record ${index}:`, result.reason);
    }
  });
}

async function processBooking(record: SQSRecord): Promise<void> {
  const message: BookingQueueMessage = JSON.parse(record.body);
  logger.info("Processing booking:", { message });

  const { bookingId, providerId, slotId, userId, timestamp } = message;
  const [date, time] = slotId.split("#");

  try {
    // Step 1: Reserve the slot (conditional update)
    const slotKeys = Keys.slot(providerId, date, time);

    try {
      await updateItem(
        slotKeys,
        "SET #status = :reserved, reservedBy = :bookingId, reservedAt = :reservedAt",
        {
          ":reserved": "RESERVED",
          ":available": "AVAILABLE",
          ":bookingId": bookingId,
          ":reservedAt": getCurrentTimestamp(),
        },
        {
          "#status": "status",
        },
        "#status = :available"
      );

      console.log(`Slot ${slotId} reserved successfully`);
    } catch (error: any) {
      if (error.name === "ConditionalCheckFailedException") {
        logger.warn(`Slot ${slotId} is not available`);
        throw new Error("Slot is not available");
      }
      throw error;
    }

    // Step 2: Create booking record
    const bookingKeys = Keys.booking(bookingId);
    const expiresAt = generateExpirationTime(5);

    const booking: Booking = {
      ...bookingKeys,
      providerId,
      slotId,
      userId,
      state: "PENDING",
      createdAt: timestamp,
      expiresAt,
      // GSI keys
      GSI1PK: `USER#${userId}`,
      GSI1SK: `BOOKING#${timestamp}`,
      GSI2PK: `PROVIDER#${providerId}`,
      GSI2SK: `BOOKING#${timestamp}`,
      GSI3PK: "STATUS#PENDING",
      GSI3SK: `EXPIRES#${expiresAt}`,
    };

    await putItem(booking);

    logger.info(`Booking ${bookingId} created successfully`);
  } catch (error: any) {
    logger.error(`Error processing booking ${bookingId}:`, error);
    throw error; // Let SQS handle retry
  }
}