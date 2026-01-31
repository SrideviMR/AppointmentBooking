import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Slot } from "../../types/slot";
import { queryItems } from "../../utils/dynamodb";
import {
  successResponse,
  validationError,
  internalError,
} from "../../utils/response";
import { logger } from "../../utils/logger";
import { Booking } from "../../types/booking";

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const providerId = event.pathParameters?.providerId;
  const date = event.queryStringParameters?.date;

  logger.info("GetSlots invoked", {
    providerId,
    date,
    requestId: event.requestContext?.requestId,
  });

  try {
    // --- Validation ---
    if (!providerId) {
      logger.warn("Missing providerId");
      return validationError("providerId is required");
    }

    if (!date) {
      logger.warn("Missing date query parameter");
      return validationError("date query parameter is required");
    }

    // Basic date format validation: YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      logger.warn("Invalid date format", { date });
      return validationError("date must be in YYYY-MM-DD format");
    }

    // --- Query DynamoDB ---
    const slotsRaw = await queryItems(
      "PK = :pk AND begins_with(SK, :sk)",
      {
        ":pk": `PROVIDER#${providerId}`,
        ":sk": `SLOT#${date}`,
      }
    );

    // If no slots found
    if (!slotsRaw || slotsRaw.length === 0) {
      logger.info("No slots found for provider and date", { providerId, date });
      return successResponse({
        providerId,
        date,
        availableSlots: [],
        count: 0,
        message: "No slots available for this provider on the given date",
      });
    }

    // --- Filter and map slots ---
    const slots = slotsRaw as Slot[];
    
    const availableSlots = slots
      .filter((slot) => {
        // Show AVAILABLE slots
        if (slot.status === "AVAILABLE") return true;
        
        // Show HELD slots that are expired (treat as available for UI)
        if (slot.status === "HELD" && slot.holdExpiresAt) {
          return new Date(slot.holdExpiresAt) < new Date();
        }
        
        return false; // Hide CONFIRMED/BOOKED slots
      })
      .map((slot) => {
        const timeParts = slot.SK.split("#");
        const time = timeParts[2] || "unknown";
        return {
          time,
          status: "AVAILABLE", // Always show as AVAILABLE in UI
          slotId: `${date}#${time}`,
        };
      })
      .sort((a, b) => a.time.localeCompare(b.time));

    return successResponse({
      providerId,
      date,
      availableSlots,
      count: availableSlots.length,
    });
  } catch (error: any) {
    logger.error("Error fetching slots", {
      providerId,
      date,
      errorName: error?.name,
      errorMessage: error?.message,
      stack: error?.stack,
    });

    // Handle DynamoDB-specific errors
    if (error.name === "ValidationException") {
      return validationError("Invalid query parameters for DynamoDB");
    }

    return internalError("Failed to fetch slots: " + error.message);
  }
}
