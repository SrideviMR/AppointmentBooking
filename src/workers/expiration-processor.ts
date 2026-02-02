import { DynamoDBStreamEvent, DynamoDBRecord } from "aws-lambda";
import { bookingDao } from "../dao/booking-dao";
import { slotDao } from "../dao/slot-dao";
import { logger } from "../utils/logger";

export async function handler(event: DynamoDBStreamEvent): Promise<void> {
  logger.info(`Processing ${event.Records.length} stream records`);

  const results = await Promise.allSettled(
    event.Records.map(record => processStreamRecord(record))
  );

  const succeeded = results.filter(r => r.status === "fulfilled").length;
  const failed = results.filter(r => r.status === "rejected").length;

  logger.info(`Stream processing completed: ${succeeded} succeeded, ${failed} failed`);

  // Log failures for monitoring
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      logger.error(`Stream record ${index} failed:`, result.reason);
    }
  });
}

async function processStreamRecord(record: DynamoDBRecord): Promise<void> {
  // Only process TTL deletions of expiration triggers
  if (record.eventName !== "REMOVE" || 
      !record.dynamodb?.OldImage ||
      record.dynamodb.OldImage.SK?.S !== "EXPIRATION_TRIGGER") {
    return;
  }

  const oldImage = record.dynamodb.OldImage;
  const bookingId = oldImage.bookingId?.S;
  const providerId = oldImage.providerId?.S;
  const slotId = oldImage.slotId?.S;

  if (!bookingId || !providerId || !slotId) {
    logger.warn("Missing required fields in stream record", { oldImage });
    return;
  }

  logger.info(`Processing expiration for booking ${bookingId}`);

  try {
    // Atomically expire booking and release slot
    await slotDao.expireBookingAndReleaseSlot(bookingId, providerId, slotId);
    
    logger.info(`Successfully expired booking ${bookingId} and released slot`);
  } catch (error: any) {
    if (error.name === "TransactionCanceledException") {
      logger.info(`Booking ${bookingId} already processed or slot not held`);
      return;
    }
    
    logger.error(`Failed to process expiration for booking ${bookingId}:`, error);
    throw error; // Re-throw to trigger retry
  }
}