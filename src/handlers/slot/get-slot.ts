import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Slot } from "../../types/slot";
import { queryItems } from "../../utils/dynamodb";
import {
  successResponse,
  validationError,
  internalError,
} from "../../utils/response";

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const providerId = event.pathParameters?.providerId;
    const date = event.queryStringParameters?.date;

    if (!providerId) {
      return validationError("providerId is required");
    }

    if (!date) {
      return validationError("date query parameter is required");
    }

    // Query slots for the provider and date
    const slots = await queryItems(
      "PK = :pk AND begins_with(SK, :sk)",
      {
        ":pk": `PROVIDER#${providerId}`,
        ":sk": `SLOT#${date}`,
      }
    );

    // Filter for available slots
    const availableSlots = (slots as Slot[])
      .filter((slot) => slot.status === "AVAILABLE")
      .map((slot) => {
        // Extract time from SK (format: SLOT#date#time)
        const time = slot.SK.split("#")[2];
        return {
          time,
          status: slot.status,
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
    console.error("Error getting slots:", error);
    return internalError(error.message);
  }
}