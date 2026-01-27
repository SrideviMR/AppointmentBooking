"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const types_1 = require("../../types");
const dynamodb_1 = require("../../utils/dynamodb");
const response_1 = require("../../utils/response");
const time_1 = require("../../utils/time");
const logger_1 = require("../../utils/logger");
async function handler(event) {
    logger_1.logger.info("CreateProvider invoked", {
        requestId: event.requestContext?.requestId,
    });
    try {
        if (!event.body) {
            logger_1.logger.warn("Missing request body");
            return (0, response_1.validationError)("Request body is required");
        }
        logger_1.logger.info("Parsing request body");
        const input = JSON.parse(event.body);
        logger_1.logger.info("Request payload received", { input });
        // Validation
        if (!input.providerId || !input.name || !input.type) {
            logger_1.logger.warn("Validation failed: missing fields", { input });
            return (0, response_1.validationError)("providerId, name, and type are required");
        }
        if (!["DOCTOR", "SALON", "SERVICE"].includes(input.type)) {
            logger_1.logger.warn("Validation failed: invalid provider type", {
                type: input.type,
            });
            return (0, response_1.validationError)("type must be DOCTOR, SALON, or SERVICE");
        }
        // Create provider item
        const keys = types_1.Keys.provider(input.providerId);
        const provider = {
            ...keys,
            name: input.name,
            type: input.type,
            createdAt: (0, time_1.getCurrentTimestamp)(),
        };
        logger_1.logger.info("Writing provider to DynamoDB", {
            tableName: process.env.TABLE_NAME,
            provider,
        });
        await (0, dynamodb_1.putItem)(provider);
        logger_1.logger.info("Provider created successfully", {
            providerId: input.providerId,
        });
        return (0, response_1.successResponse)({
            providerId: input.providerId,
            name: input.name,
            type: input.type,
            createdAt: provider.createdAt,
        }, 201);
    }
    catch (error) {
        logger_1.logger.error("Failed to create provider", {
            errorName: error?.name,
            errorMessage: error?.message,
            stack: error?.stack,
        });
        if (error.name === "ConditionalCheckFailedException") {
            return (0, response_1.errorResponse)("Provider already exists", 409);
        }
        return (0, response_1.internalError)(error.message);
    }
}
//# sourceMappingURL=create-provider.js.map