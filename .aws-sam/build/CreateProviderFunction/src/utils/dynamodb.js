"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TABLE_NAME = exports.dynamodb = void 0;
exports.putItem = putItem;
exports.getItem = getItem;
exports.updateItem = updateItem;
exports.queryItems = queryItems;
exports.batchWriteItems = batchWriteItems;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({});
exports.dynamodb = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
exports.TABLE_NAME = process.env.TABLE_NAME;
// Helper functions
async function putItem(item) {
    return exports.dynamodb.send(new lib_dynamodb_1.PutCommand({
        TableName: exports.TABLE_NAME,
        Item: item,
    }));
}
async function getItem(key) {
    const result = await exports.dynamodb.send(new lib_dynamodb_1.GetCommand({
        TableName: exports.TABLE_NAME,
        Key: key,
    }));
    return result.Item;
}
async function updateItem(key, updateExpression, expressionAttributeValues, expressionAttributeNames, conditionExpression) {
    return exports.dynamodb.send(new lib_dynamodb_1.UpdateCommand({
        TableName: exports.TABLE_NAME,
        Key: key,
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
        ConditionExpression: conditionExpression,
        ReturnValues: "ALL_NEW",
    }));
}
async function queryItems(keyConditionExpression, expressionAttributeValues, expressionAttributeNames, filterExpression, indexName) {
    const result = await exports.dynamodb.send(new lib_dynamodb_1.QueryCommand({
        TableName: exports.TABLE_NAME,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ExpressionAttributeNames: expressionAttributeNames,
        FilterExpression: filterExpression,
        IndexName: indexName,
    }));
    return result.Items || [];
}
async function batchWriteItems(items) {
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
        await exports.dynamodb.send(new lib_dynamodb_1.BatchWriteCommand({
            RequestItems: {
                [exports.TABLE_NAME]: batch,
            },
        }));
    }
}
//# sourceMappingURL=dynamodb.js.map