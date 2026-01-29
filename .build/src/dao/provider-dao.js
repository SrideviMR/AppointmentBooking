"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerDao = void 0;
// src/dao/provider-dao.ts
const dynamodb_1 = require("../utils/dynamodb");
const db_keys_1 = require("../types/db-keys");
const logger_1 = require("../utils/logger");
const insertProviderDao = async ({ providerId, providerName, providerType, createdAt, }) => {
    const provider = {
        ...db_keys_1.Keys.provider(providerId),
        providerName,
        providerType,
        createdAt
    };
    logger_1.logger.info("Persisting provider", {
        providerId,
        providerType,
    });
    await (0, dynamodb_1.putItem)(provider);
    return provider;
};
exports.providerDao = {
    insertProviderDao,
};
//# sourceMappingURL=provider-dao.js.map