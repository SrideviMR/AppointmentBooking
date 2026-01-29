"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerDao = void 0;
const db_keys_1 = require("../types/db-keys");
const dynamodb_1 = require("../utils/dynamodb");
const logger_1 = require("../utils/logger");
const insertProviderDao = async ({ providerId, providerName, providerType, createdAt, }) => {
    const provider = {
        ...db_keys_1.Keys.provider(providerId),
        providerName,
        providerType,
        createdAt,
    };
    logger_1.logger.info("Persisting provider", { providerId, providerType });
    try {
        // Conditional put: only insert if item does NOT already exist
        await (0, dynamodb_1.putItem)(provider, "attribute_not_exists(PK)");
    }
    catch (err) {
        if (err.name === "ConditionalCheckFailedException") {
            logger_1.logger.warn("Provider already exists", { providerId });
            throw new Error(`Provider with providerId=${providerId} already exists`);
        }
        throw err;
    }
    return provider;
};
exports.providerDao = {
    insertProviderDao,
};
//# sourceMappingURL=provider-dao.js.map