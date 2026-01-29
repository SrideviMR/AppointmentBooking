export type ProviderType = "DOCTOR" | "SALON" | "SERVICE";

export interface Provider {
  PK: string; // PROVIDER#{providerId}
  SK: string; // METADATA
  providerName: string;
  providerType: ProviderType;
  createdAt: string;
}

export interface CreateProviderInput {
  providerId: string;
  providerName: string;
  providerType: ProviderType;
}
