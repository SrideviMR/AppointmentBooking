import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CreateBookingInput } from "../../types/booking";
import {
  successResponse,
  validationError,
  internalError,
} from "../../utils/response";
import { logger } from "../../utils/logger";
import { validators } from "../../utils/validators";
import { 
  bookingService, 
  SlotUnavailableError, 
  ServiceUnavailableError 
} from "../../services/booking-service";

export async function createBooking(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const startTime = Date.now();
  
  try {
    console.log("Create booking request received", { body: event.body });
    logger.info("Create booking request received", { event });

    if (!event.body) {
      return validationError("Request body is required");
    }

    const input: CreateBookingInput = JSON.parse(event.body);

    // Input validation
    const validation = validators.createBookingInput(input);
    if (!validation.isValid) {
      return validationError(validation.error!);
    }

    // Business logic
    const result = await bookingService.createBooking({
      providerId: input.providerId,
      slotId: input.slotId,
      userId: input.userId,
    });

    console.log("Booking creation completed", { 
      bookingId: result.bookingId, 
      duration: Date.now() - startTime 
    });

    return successResponse(result, 202); // 202 Accepted
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    if (error instanceof SlotUnavailableError) {
      console.warn("Slot unavailable", { error: error.message, duration });
      return validationError(error.message);
    }
    
    if (error instanceof ServiceUnavailableError) {
      console.error("Service unavailable", { error: error.message, duration });
      return internalError(error.message);
    }
    
    console.error("Unexpected error creating booking", { 
      error: error.message, 
      duration 
    });
    return internalError("Failed to create booking");
  }
}

// Export handler for Lambda compatibility
export const handler = createBooking;