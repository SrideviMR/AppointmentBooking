import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CreateAvailabilityInput, Availability } from "../../types/availability";
import { Keys } from "../../types/db-keys";
import { Slot } from "../../types/slot"
import { putItem, batchWriteItems, getItem } from "../../utils/dynamodb";
import {
  successResponse,
  validationError,
  notFoundError,
  internalError,
} from "../../utils/response";
import { generateTimeSlots, getCurrentTimestamp } from "../../utils/time";

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const providerId = event.pathParameters?.providerId;

    if (!providerId) {
      return validationError("providerId is required");
    }

    if (!event.body) {
      return validationError("Request body is required");
    }

    const body: CreateAvailabilityInput = JSON.parse(event.body);

    // Validation
    if (!body.date || !body.startTime || !body.endTime || !body.slotDurationMinutes) {
      return validationError(
        "date, startTime, endTime, and slotDurationMinutes are required"
      );
    }

    // Verify provider exists
    const providerKeys = Keys.provider(providerId);
    const provider = await getItem(providerKeys);

    if (!provider) {
      return notFoundError("Provider");
    }

    // Create availability window
    const availabilityKeys = Keys.availability(providerId, body.date);
    const availability: Availability = {
      ...availabilityKeys,
      startTime: body.startTime,
      endTime: body.endTime,
      slotDurationMinutes: body.slotDurationMinutes,
      createdAt: getCurrentTimestamp(),
    };

    await putItem(availability);

    // Generate time slots
    const timeSlots = generateTimeSlots(
      body.startTime,
      body.endTime,
      body.slotDurationMinutes
    );

    // Create slot items
    const slotItems: Slot[] = timeSlots.map((time) => {
      const slotKeys = Keys.slot(providerId, body.date, time);
      return {
        ...slotKeys,
        status: "AVAILABLE",
      };
    });

    // Batch write slots
    await batchWriteItems(slotItems);

    return successResponse(
      {
        providerId,
        date: body.date,
        startTime: body.startTime,
        endTime: body.endTime,
        slotDurationMinutes: body.slotDurationMinutes,
        slotsCreated: timeSlots.length,
        slots: timeSlots,
      },
      201
    );
  } catch (error: any) {
    console.error("Error creating availability:", error);
    return internalError(error.message);
  }
}