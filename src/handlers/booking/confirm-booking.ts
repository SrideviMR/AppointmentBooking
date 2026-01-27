import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../utils/logger";
import {
  successResponse,
  validationError,
  notFoundError,
  conflictError,
  internalError,
} from "../../utils/response";
import { bookingDao } from "../../dao/booking-dao";
import { slotDao } from "../../dao/slot-dao";

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const bookingId = event.pathParameters?.bookingId;

  logger.info("Confirm booking request received", { bookingId });

  try {
    if (!bookingId) {
      logger.warn("Missing bookingId in path");
      return validationError("bookingId is required");
    }

    const booking = await bookingDao.getBookingById(bookingId);
    if (!booking) {
      logger.info("Booking not found", { bookingId });
      return notFoundError("Booking");
    }

    logger.info("Attempting slot confirmation", {
      bookingId,
      providerId: booking.providerId,
      slotId: booking.slotId,
    });

    const slotConfirmed = await slotDao.confirmSlot(
      booking.providerId,
      booking.slotId,
      bookingId,
    );

    if (!slotConfirmed) {
      logger.warn("Slot confirmation failed", {
        bookingId,
        slotId: booking.slotId,
      });
      return conflictError("Slot is no longer held by this booking");
    }

    await bookingDao.confirm(bookingId);

    logger.info("Booking confirmed successfully", {
      bookingId,
    });

    return successResponse({
      bookingId,
      state: "CONFIRMED",
    });
  } catch (error: any) {
    logger.error("Unexpected error during booking confirmation", {
      bookingId,
      error: error.message,
    });
    return internalError(error.message);
  }
}
