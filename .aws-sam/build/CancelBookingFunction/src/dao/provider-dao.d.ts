import { Provider, ProviderType } from "../types/provider";
export declare const providerDao: {
    insertProviderDao: ({ providerId, providerName, providerType, createdAt, }: {
        providerId: string;
        providerName: string;
        providerType: ProviderType;
        createdAt: string;
    }) => Promise<Provider>;
};
//# sourceMappingURL=provider-dao.d.ts.map