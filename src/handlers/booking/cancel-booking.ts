import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
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

export async function cancelBooking(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const startTime = Date.now();
  const bookingId = event.pathParameters?.bookingId;

  try {
    // Input validation
    const validation = validators.bookingId(bookingId);
    if (!validation.isValid) {
      return validationError(validation.error!);
    }

    console.log("Starting booking cancellation", { bookingId });

    // Business logic
    const result = await bookingService.cancelBooking({ bookingId: bookingId! });
    
    console.log("Booking cancellation completed", { 
      bookingId, 
      duration: Date.now() - startTime 
    });

    return successResponse(result);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    if (error instanceof BookingNotFoundError) {
      console.warn("Booking not found", { bookingId, duration });
      return notFoundError("Booking");
    }
    
    if (error instanceof BookingConflictError) {
      console.warn("Booking conflict", { bookingId, error: error.message, duration });
      return conflictError(error.message);
    }
    
    if (error instanceof ServiceUnavailableError) {
      console.error("Service unavailable", { bookingId, error: error.message, duration });
      return internalError(error.message);
    }
    
    console.error("Unexpected error during booking cancellation", { 
      bookingId, 
      error: error.message, 
      duration 
    });
    return internalError("Failed to cancel booking");
  }
}

// Export handler for Lambda compatibility
export const handler = cancelBooking;