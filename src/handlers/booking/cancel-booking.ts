import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Keys } from "../../types";
import { updateItem, getItem } from "../../utils/dynamodb";
import {
  successResponse,
  validationError,
  notFoundError,
  conflictError,
  internalError,
} from "../../utils/response";
import { getCurrentTimestamp } from "../../utils/time";
import { bookingDao } from "../../dao/booking-dao";
import { slotDao } from "../../dao/slot-dao";

export async function handler(  event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const bookingId = event.pathParameters?.bookingId;

    if (!bookingId) {
      return validationError("bookingId is required");
    }

    const bookingKeys = Keys.booking(bookingId);

    // Get booking details
    const booking = await bookingDao.getBookingById(bookingId);

    if (!booking) {
      return notFoundError("Booking");
    }

    try {
      // Update booking state with condition
      await bookingDao.cancel(bookingId)

      // Release the slot
      const [date, time] = booking.slotId.split("#");

      await slotDao.releaseSlot(booking.providerId, booking.slotId, bookingId)
    

      return successResponse({
        bookingId,
        state: "CANCELLED",
        cancelledAt: getCurrentTimestamp(),
        message: "Booking cancelled and slot released",
      });
    } catch (error: any) {
      if (error.name === "ConditionalCheckFailedException") {
        return conflictError(
          `Booking cannot be cancelled. Current state: ${booking.state}`
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error("Error cancelling booking:", error);
    return internalError(error.message);
  }
}