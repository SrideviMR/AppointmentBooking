"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const provider_dao_1 = require("../../dao/provider-dao");
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
        const body = JSON.parse(event.body);
        const { providerId, providerName, providerType, } = body;
        logger_1.logger.info("Request payload received", { body });
        // Validation
        if (!providerId || !providerName || !providerType) {
            logger_1.logger.warn("Validation failed: missing fields", { body });
            return (0, response_1.validationError)("providerId, name, and type are required");
        }
        if (!["DOCTOR", "SALON", "SERVICE"].includes(providerType)) {
            logger_1.logger.warn("Validation failed: invalid provider type", {
                type: providerType,
            });
            return (0, response_1.validationError)("type must be DOCTOR, SALON, or SERVICE");
        }
        // Insert the provider item
        logger_1.logger.info("Writing provider to DynamoDB", {
            tableName: process.env.TABLE_NAME,
            body,
        });
        const createdAt = (0, time_1.getCurrentTimestamp)();
        await provider_dao_1.providerDao.insertProviderDao({ providerId, providerName, providerType, createdAt });
        logger_1.logger.info("Provider created successfully", {
            providerId: providerId,
        });
        return (0, response_1.successResponse)({
            providerId: providerId,
            name: providerName,
            type: providerType,
            createdAt: createdAt,
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