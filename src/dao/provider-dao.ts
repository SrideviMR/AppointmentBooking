// src/dao/provider-dao.ts
import { putItem } from "../utils/dynamodb";
import { Provider, ProviderType } from "../types/provider";
import { Keys } from "../types/db-keys";
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
  createdAt: string
}): Promise<Provider> => {
  const provider: Provider = {
    ...Keys.provider(providerId),
    providerName,
      providerType,
    createdAt
  };

  logger.info("Persisting provider", {
    providerId,
    providerType,
  });

  await putItem(provider);
  return provider;
};

export const providerDao = {
  insertProviderDao,
};
