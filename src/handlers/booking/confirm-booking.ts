import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "../../utils/logger";
import {
  successResponse,
  validationError,
  notFoundError,
  conflictError,
  internalError,
} from "../../utils/response";
import { validators } from "../../utils/validators";
import { 
  bookingService, 
  BookingNotFoundError, 
  BookingConflictError, 
  ServiceUnavailableError 
} from "../../services/booking-service";

export async function confirmBooking(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const startTime = Date.now();
  const bookingId = event.pathParameters?.bookingId;

  try {
    logger.info("Confirm booking request received", { bookingId });

    // Input validation
    const validation = validators.bookingId(bookingId);
    if (!validation.isValid) {
      return validationError(validation.error!);
    }

    // Business logic
    const result = await bookingService.confirmBooking({ bookingId: bookingId! });
    
    logger.info("Booking confirmation completed", { 
      bookingId, 
      duration: Date.now() - startTime 
    });

    return successResponse(result);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    if (error instanceof BookingNotFoundError) {
      logger.warn("Booking not found", { bookingId, duration });
      return notFoundError("Booking");
    }
    
    if (error instanceof BookingConflictError) {
      logger.warn("Booking conflict", { bookingId, error: error.message, duration });
      return conflictError(error.message);
    }
    
    if (error instanceof ServiceUnavailableError) {
      logger.error("Service unavailable", { bookingId, error: error.message, duration });
      return internalError(error.message);
    }
    
    logger.error("Unexpected error during booking confirmation", {
      bookingId,
      error: error.message,
      duration
    });
    return internalError("Failed to confirm booking");
  }
}

// Export handler for Lambda compatibility
export const handler = confirmBooking;
