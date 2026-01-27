import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { CreateProviderInput, Keys, Provider } from "../../types";
import { providerDao } from "../../dao/provider-dao";
import {
  successResponse,
  errorResponse,
  validationError,
  internalError,
} from "../../utils/response";
import { getCurrentTimestamp } from "../../utils/time";
import { logger } from "../../utils/logger";

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  logger.info("CreateProvider invoked", {
    requestId: event.requestContext?.requestId,
  });
  try {
    if (!event.body) {
      logger.warn("Missing request body");
      return validationError("Request body is required");
    }
    logger.info("Parsing request body");
    const body = JSON.parse(event.body);
    const {
      providerId,
      providerName,
      providerType,
    }: CreateProviderInput = body;
    logger.info("Request payload received", { body });

    // Validation
    if (!providerId || !providerName || !providerType) {
      logger.warn("Validation failed: missing fields", {body});
      return validationError("providerId, name, and type are required");
    }

    if (!["DOCTOR", "SALON", "SERVICE"].includes(providerType)) {
      logger.warn("Validation failed: invalid provider type", {
        type: providerType,
      });
      return validationError("type must be DOCTOR, SALON, or SERVICE");
    }

    // Insert the provider item
    
    logger.info("Writing provider to DynamoDB", {
      tableName: process.env.TABLE_NAME,
      body,
    });
    const createdAt = getCurrentTimestamp();

    await providerDao.insertProviderDao({ providerId, providerName, providerType, createdAt });

    logger.info("Provider created successfully", {
      providerId: providerId,
    });

    return successResponse(
      {
        providerId: providerId,
        name: providerName,
        type: providerType,
        createdAt: createdAt,
      },
      201
    );
  } catch (error: any) {
  logger.error("Failed to create provider", {
      errorName: error?.name,
      errorMessage: error?.message,
      stack: error?.stack,
    });
    
    if (error.name === "ConditionalCheckFailedException") {
      return errorResponse("Provider already exists", 409);
    }

    return internalError(error.message);
  }
}