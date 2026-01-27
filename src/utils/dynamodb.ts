import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
export const dynamodb = DynamoDBDocumentClient.from(client);

export const TABLE_NAME = process.env.TABLE_NAME!;

// Helper functions
export async function putItem(item: Record<string, any>) {
  return dynamodb.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );
}

export async function getItem<T>(
  key: Record<string, any>
): Promise<T | undefined> {
  const result = await dynamodb.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: key,
    })
  );

  return result.Item as T | undefined;
}


export async function updateItem(
  key: Record<string, any>,
  updateExpression: string,
  expressionAttributeValues: Record<string, any>,
  expressionAttributeNames?: Record<string, string>,
  conditionExpression?: string
) {
  return dynamodb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: key,
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
      ConditionExpression: conditionExpression,
      ReturnValues: "ALL_NEW",
    })
  );
}

export async function queryItems(
  keyConditionExpression: string,
  expressionAttributeValues: Record<string, any>,
  expressionAttributeNames?: Record<string, string>,
  filterExpression?: string,
  indexName?: string
) {
  const result = await dynamodb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
      FilterExpression: filterExpression,
      IndexName: indexName,
    })
  );
  return result.Items || [];
}

export async function batchWriteItems(items: Record<string, any>[]) {
  const putRequests = items.map((item) => ({
    PutRequest: {
      Item: item,
    },
  }));

  // DynamoDB limits batch writes to 25 items
  const batches = [];
  for (let i = 0; i < putRequests.length; i += 25) {
    batches.push(putRequests.slice(i, i + 25));
  }

  for (const batch of batches) {
    await dynamodb.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: batch,
        },
      })
    );
  }
}