import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
export declare const dynamodb: DynamoDBDocumentClient;
export declare const TABLE_NAME: string;
export declare function putItem(item: Record<string, any>, conditionExpression?: string): Promise<import("@aws-sdk/lib-dynamodb").PutCommandOutput>;
export declare function getItem<T>(key: Record<string, any>): Promise<T | undefined>;
export declare function updateItem(key: Record<string, any>, updateExpression: string, expressionAttributeValues: Record<string, any>, expressionAttributeNames?: Record<string, string>, conditionExpression?: string): Promise<import("@aws-sdk/lib-dynamodb").UpdateCommandOutput>;
export declare function queryItems(keyConditionExpression: string, expressionAttributeValues: Record<string, any>, expressionAttributeNames?: Record<string, string>, filterExpression?: string, indexName?: string): Promise<Record<string, any>[]>;
export declare function batchWriteItems(items: Record<string, any>[]): Promise<void>;
//# sourceMappingURL=dynamodb.d.ts.map