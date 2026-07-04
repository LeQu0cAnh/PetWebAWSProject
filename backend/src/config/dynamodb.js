/**
 * src/config/dynamodb.js
 * 
 * Singleton DynamoDB Document Client.
 * Dùng chung toàn bộ ứng dụng thay cho Prisma Client.
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

const clientConfig = {
  region: process.env.AWS_S3_REGION || process.env.COGNITO_REGION || 'ap-southeast-1',
};

// Chỉ truyền credentials thủ công khi chạy local (không có AWS_LAMBDA_FUNCTION_NAME)
if (!process.env.AWS_LAMBDA_FUNCTION_NAME && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  clientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

const client = new DynamoDBClient(clientConfig);

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'PetWeb';

module.exports = { docClient, TABLE_NAME, client };
