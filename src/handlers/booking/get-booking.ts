import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { bookingDao } from "../../dao/booking-dao";
import {
  successResponse,
  validationError,
  notFoundError,
  internalError,
} from "../../utils/response";

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const bookingId = event.pathParameters?.bookingId;

    if (!bookingId) {
      return validationError("bookingId is required");
    }

    const booking = await bookingDao.getBookingById(bookingId);

    if (!booking) {
      return notFoundError("Booking");
    }

    // Return booking details
    return successResponse({
      bookingId: booking.PK.replace("BOOKING#", ""),
      providerId: booking.providerId,
      slotId: booking.slotId,
      userId: booking.userId,
      state: booking.state,
      createdAt: booking.createdAt,
      expiresAt: booking.expiresAt,
      confirmedAt: booking.confirmedAt,
      cancelledAt: booking.cancelledAt,
    });
  } catch (error: any) {
    console.error("Error getting booking:", error);
    return internalError(error.message);
  }
}