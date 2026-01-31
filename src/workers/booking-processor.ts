import { SQSEvent, SQSRecord } from "aws-lambda";
import { BookingQueueMessage } from "../types/booking";
import { generateExpirationTime } from "../utils/time";
import { logger } from "../utils/logger";
import { bookingDao } from "../dao/booking-dao";

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

  const { bookingId, providerId, slotId, userId } = message;

  try {
    // Create booking record (slot is already held)
    const expiresAt = generateExpirationTime(5);

    await bookingDao.createPendingBooking({
      bookingId,
      providerId,
      slotId,
      userId,
      expiresAt
    });

    logger.info(`Booking ${bookingId} created successfully`);
  } catch (error: any) {
    logger.error(`Error processing booking ${bookingId}:`, error);
    throw error; // Let SQS handle retry
  }
}