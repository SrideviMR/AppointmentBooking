// src/dao/provider-dao.ts
import { Provider, ProviderType } from "../types/provider";
import { Keys } from "../types/db-keys";
import { putItem } from "../utils/dynamodb";
import { logger } from "../utils/logger";

const insertProviderDao = async ({
  providerId,
  providerName,
  providerType,
  createdAt,
}: {
  providerId: string;
  providerName: string;
  providerType: ProviderType;
  createdAt: string;
}): Promise<Provider> => {
  const provider: Provider = {
    ...Keys.provider(providerId),
    providerName,
    providerType,
    createdAt,
  };

  logger.info("Persisting provider", { providerId, providerType });

  try {
    // Conditional put: only insert if item does NOT already exist
    await putItem(provider, "attribute_not_exists(PK)");
  } catch (err: any) {
    if (err.name === "ConditionalCheckFailedException") {
      logger.warn("Provider already exists", { providerId });
      throw new Error(`Provider with providerId=${providerId} already exists`);
    }
    throw err;
  }

  return provider;
};

export const providerDao = {
  insertProviderDao,
};
