export type ProviderType = "DOCTOR" | "SALON" | "SERVICE";
export interface Provider {
    PK: string;
    SK: string;
    providerName: string;
    providerType: ProviderType;
    createdAt: string;
}
export interface CreateProviderInput {
    providerId: string;
    providerName: string;
    providerType: ProviderType;
}
//# sourceMappingURL=provider.d.ts.map