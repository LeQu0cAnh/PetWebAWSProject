/**
 * src/db/db.js
 *
 * Data Access Layer — tất cả DynamoDB operations.
 * Thay thế hoàn toàn Prisma ORM.
 *
 * Single-table design:
 *   PK / SK / GSI1PK / GSI1SK / GSI2PK / GSI2SK
 *
 * Entities:
 *   User, Post, Comment, Like, ExpHistory, SystemConfig, UsernameReservation
 */

const { v4: uuidv4 } = require('uuid');
const {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  BatchGetCommand,
  BatchWriteCommand,
  TransactWriteCommand,
} = require('@aws-sdk/lib-dynamodb');
const { docClient, TABLE_NAME } = require('../config/dynamodb');

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/** Tạo ISO timestamp string dùng cho sort key */
function isoNow() {
  return new Date().toISOString();
}

/** Encode DynamoDB LastEvaluatedKey thành opaque cursor string */
function encodeCursor(lastKey) {
  if (!lastKey) return null;
  return Buffer.from(JSON.stringify(lastKey)).toString('base64');
}

/** Decode cursor string thành DynamoDB ExclusiveStartKey */
function decodeCursor(cursor) {
  if (!cursor) return undefined;
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
  } catch {
    return undefined;
  }
}

/** Trích xuất user-facing fields từ raw DynamoDB item */
function toUser(item) {
  if (!item) return null;
  return {
    id: item.id,
    cognitoSub: item.cognitoSub,
    email: item.email,
    username: item.username,
    avatar: item.avatar || null,
    bio: item.bio || null,
    role: item.role || 'USER',
    title: item.title || 'TAN_TINH',
    totalExp: item.totalExp || 0,
    status: item.status || 'ACTIVE',
    banReason: item.banReason || null,
    banExpiresAt: item.banExpiresAt || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function toPost(item) {
  if (!item) return null;
  return {
    id: item.id,
    authorId: item.authorId,
    content: item.content,
    imageUrl: item.imageUrl || null,
    imageUrls: item.imageUrlsRaw || null, // JSON string stored in DB
    status: item.status || 'PENDING',
    likeCount: item.likeCount || 0,
    commentCount: item.commentCount || 0,
    isHidden: item.isHidden || false,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function toComment(item) {
  if (!item) return null;
  return {
    id: item.id,
    postId: item.postId,
    authorId: item.authorId,
    content: item.content,
    imageUrls: item.imageUrlsRaw || null,
    isHidden: item.isHidden || false,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// USER OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

async function getUserById(id) {
  const { Item } = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: `USER#${id}`, SK: 'PROFILE' },
  }));
  return toUser(Item);
}

async function getUserByCognitoSub(sub) {
  const { Items } = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK = :sk',
    ExpressionAttributeValues: { ':pk': `COGNITO#${sub}`, ':sk': 'PROFILE' },
    Limit: 1,
  }));
  return Items && Items.length > 0 ? toUser(Items[0]) : null;
}

async function getUserByUsername(username) {
  const { Item } = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: `USERNAME#${username}`, SK: 'RESERVED' },
  }));
  return Item ? { userId: Item.userId, username: Item.username } : null;
}

async function createUser({ cognitoSub, email, username }) {
  const id = uuidv4();
  const now = isoNow();

  // TransactWrite: tạo User + reserve Username (đảm bảo unique)
  await docClient.send(new TransactWriteCommand({
    TransactItems: [
      {
        Put: {
          TableName: TABLE_NAME,
          Item: {
            PK: `USER#${id}`,
            SK: 'PROFILE',
            GSI1PK: `COGNITO#${cognitoSub}`,
            GSI1SK: 'PROFILE',
            GSI2PK: `EMAIL#${email}`,
            GSI2SK: 'PROFILE',
            entityType: 'User',
            id,
            cognitoSub,
            email,
            username,
            avatar: null,
            bio: null,
            role: 'USER',
            title: 'TAN_TINH',
            totalExp: 0,
            status: 'ACTIVE',
            banReason: null,
            banExpiresAt: null,
            createdAt: now,
            updatedAt: now,
          },
          ConditionExpression: 'attribute_not_exists(PK)',
        },
      },
      {
        Put: {
          TableName: TABLE_NAME,
          Item: {
            PK: `USERNAME#${username}`,
            SK: 'RESERVED',
            entityType: 'UsernameReservation',
            userId: id,
            username,
          },
          ConditionExpression: 'attribute_not_exists(PK)',
        },
      },
    ],
  }));

  return toUser({
    id, cognitoSub, email, username,
    role: 'USER', title: 'TAN_TINH', totalExp: 0,
    status: 'ACTIVE', createdAt: now, updatedAt: now,
  });
}

async function updateUser(id, updates) {
  const expressions = [];
  const names = {};
  const values = {};

  // Luôn set updatedAt
  updates.updatedAt = isoNow();

  // Nếu đổi username thì cần xử lý riêng
  const oldUsername = updates._oldUsername;
  delete updates._oldUsername;

  for (const [key, val] of Object.entries(updates)) {
    if (val === undefined) continue;
    const attrName = `#${key}`;
    const attrVal = `:${key}`;
    names[attrName] = key;
    values[attrVal] = val;
    expressions.push(`${attrName} = ${attrVal}`);
  }

  if (expressions.length === 0) return getUserById(id);

  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: `USER#${id}`, SK: 'PROFILE' },
    UpdateExpression: `SET ${expressions.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ReturnValues: 'ALL_NEW',
  }));

  // Nếu đổi username, cần update reservation
  if (updates.username && oldUsername && oldUsername !== updates.username) {
    try {
      await docClient.send(new TransactWriteCommand({
        TransactItems: [
          {
            Delete: {
              TableName: TABLE_NAME,
              Key: { PK: `USERNAME#${oldUsername}`, SK: 'RESERVED' },
            },
          },
          {
            Put: {
              TableName: TABLE_NAME,
              Item: {
                PK: `USERNAME#${updates.username}`,
                SK: 'RESERVED',
                entityType: 'UsernameReservation',
                userId: id,
                username: updates.username,
              },
              ConditionExpression: 'attribute_not_exists(PK)',
            },
          },
        ],
      }));
    } catch (err) {
      if (err.name === 'TransactionCanceledException') {
        // Username đã tồn tại — rollback user update
        const rollback = { username: oldUsername, updatedAt: isoNow() };
        const rExpr = [];
        const rNames = {};
        const rVals = {};
        for (const [k, v] of Object.entries(rollback)) {
          rNames[`#${k}`] = k;
          rVals[`:${k}`] = v;
          rExpr.push(`#${k} = :${k}`);
        }
        await docClient.send(new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: `USER#${id}`, SK: 'PROFILE' },
          UpdateExpression: `SET ${rExpr.join(', ')}`,
          ExpressionAttributeNames: rNames,
          ExpressionAttributeValues: rVals,
        }));
        const error = new Error('Username đã tồn tại.');
        error.statusCode = 409;
        throw error;
      }
      throw err;
    }
  }

  return toUser(Attributes);
}

async function countUserPosts(userId) {
  let count = 0;
  let lastKey;
  do {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :pk AND begins_with(GSI2SK, :prefix)',
      ExpressionAttributeValues: { ':pk': `AUTHOR#${userId}`, ':prefix': 'POST#' },
      Select: 'COUNT',
      ExclusiveStartKey: lastKey,
    }));
    count += result.Count || 0;
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return count;
}

/**
 * Quét toàn bộ users (Admin).
 * search: tìm theo username hoặc email (case-insensitive contains).
 */
async function queryAllUsers({ cursor, limit = 20, search } = {}) {
  const exclusiveStartKey = decodeCursor(cursor);

  // Scan all User entities
  const params = {
    TableName: TABLE_NAME,
    FilterExpression: 'entityType = :et',
    ExpressionAttributeValues: { ':et': 'User' },
    Limit: 500, // Scan batch size — filter sẽ reduce
    ExclusiveStartKey: exclusiveStartKey,
  };

  const allUsers = [];
  let lastKey = exclusiveStartKey;
  const maxItems = limit + 1;

  do {
    params.ExclusiveStartKey = lastKey;
    const result = await docClient.send(new ScanCommand(params));

    for (const item of (result.Items || [])) {
      if (search) {
        const s = search.toLowerCase();
        const matchUsername = (item.username || '').toLowerCase().includes(s);
        const matchEmail = (item.email || '').toLowerCase().includes(s);
        if (!matchUsername && !matchEmail) continue;
      }
      allUsers.push(toUser(item));
      if (allUsers.length >= maxItems) break;
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey && allUsers.length < maxItems);

  const hasMore = allUsers.length > limit;
  if (hasMore) allUsers.pop();

  // Sort by createdAt desc
  allUsers.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  return {
    items: allUsers,
    hasMore,
    nextCursor: hasMore && lastKey ? encodeCursor(lastKey) : null,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// POST OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

async function getPostById(id) {
  const { Item } = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: `POST#${id}`, SK: 'META' },
  }));
  return toPost(Item);
}

async function createPost({ authorId, content, imageUrl, imageUrls, status }) {
  const id = uuidv4();
  const now = isoNow();

  const item = {
    PK: `POST#${id}`,
    SK: 'META',
    GSI1PK: `POST_STATUS#${status}`,
    GSI1SK: `${now}#${id}`,
    GSI2PK: `AUTHOR#${authorId}`,
    GSI2SK: `POST#${now}#${id}`,
    entityType: 'Post',
    id,
    authorId,
    content,
    imageUrl: imageUrl || null,
    imageUrlsRaw: imageUrls || null, // JSON string
    status,
    likeCount: 0,
    commentCount: 0,
    isHidden: false,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return toPost(item);
}

async function queryApprovedPosts({ cursor, limit = 10 } = {}) {
  const exclusiveStartKey = decodeCursor(cursor);

  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    FilterExpression: 'isHidden = :false',
    ExpressionAttributeValues: {
      ':pk': 'POST_STATUS#APPROVED',
      ':false': false,
    },
    ScanIndexForward: false, // desc by createdAt
    Limit: limit + 1,
    ExclusiveStartKey: exclusiveStartKey,
  }));

  const items = (result.Items || []).map(toPost);
  const hasMore = items.length > limit;
  if (hasMore) items.pop();

  const nextCursor = hasMore && result.LastEvaluatedKey
    ? encodeCursor(result.LastEvaluatedKey)
    : null;

  return { items, hasMore, nextCursor };
}

async function queryPostsByAuthor(authorId, { cursor, limit = 10 } = {}) {
  const exclusiveStartKey = decodeCursor(cursor);

  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :pk AND begins_with(GSI2SK, :prefix)',
    FilterExpression: '#s = :approved AND isHidden = :false',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':pk': `AUTHOR#${authorId}`,
      ':prefix': 'POST#',
      ':approved': 'APPROVED',
      ':false': false,
    },
    ScanIndexForward: false,
    Limit: limit + 1,
    ExclusiveStartKey: exclusiveStartKey,
  }));

  const items = (result.Items || []).map(toPost);
  const hasMore = items.length > limit;
  if (hasMore) items.pop();

  const nextCursor = hasMore && result.LastEvaluatedKey
    ? encodeCursor(result.LastEvaluatedKey)
    : null;

  return { items, hasMore, nextCursor };
}

async function queryPendingPosts({ cursor, limit = 10 } = {}) {
  const exclusiveStartKey = decodeCursor(cursor);

  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: { ':pk': 'POST_STATUS#PENDING' },
    ScanIndexForward: true, // asc — duyệt cũ nhất trước
    Limit: limit + 1,
    ExclusiveStartKey: exclusiveStartKey,
  }));

  const items = (result.Items || []).map(toPost);
  const hasMore = items.length > limit;
  if (hasMore) items.pop();

  const nextCursor = hasMore && result.LastEvaluatedKey
    ? encodeCursor(result.LastEvaluatedKey)
    : null;

  return { items, hasMore, nextCursor };
}

async function queryHiddenPosts({ cursor, limit = 20 } = {}) {
  const exclusiveStartKey = decodeCursor(cursor);

  // Scan — chỉ dùng cho admin
  const allItems = [];
  let lastKey = exclusiveStartKey;
  const maxItems = limit + 1;

  do {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'entityType = :et AND isHidden = :true',
      ExpressionAttributeValues: { ':et': 'Post', ':true': true },
      Limit: 500,
      ExclusiveStartKey: lastKey,
    }));

    for (const item of (result.Items || [])) {
      allItems.push(toPost(item));
      if (allItems.length >= maxItems) break;
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey && allItems.length < maxItems);

  const hasMore = allItems.length > limit;
  if (hasMore) allItems.pop();

  allItems.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  return {
    items: allItems,
    hasMore,
    nextCursor: hasMore && lastKey ? encodeCursor(lastKey) : null,
  };
}

/**
 * Cập nhật status của post.
 * Vì GSI1PK chứa status, khi đổi status cần update GSI1PK.
 */
async function updatePostStatus(id, newStatus) {
  const now = isoNow();
  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: `POST#${id}`, SK: 'META' },
    UpdateExpression: 'SET #s = :status, GSI1PK = :gsi1pk, updatedAt = :now',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: {
      ':status': newStatus,
      ':gsi1pk': `POST_STATUS#${newStatus}`,
      ':now': now,
    },
    ReturnValues: 'ALL_NEW',
  }));
  return toPost(Attributes);
}

async function updatePostHidden(id, isHidden) {
  const now = isoNow();
  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: `POST#${id}`, SK: 'META' },
    UpdateExpression: 'SET isHidden = :h, updatedAt = :now',
    ExpressionAttributeValues: { ':h': isHidden, ':now': now },
    ReturnValues: 'ALL_NEW',
  }));
  return toPost(Attributes);
}

async function incrementPostCounter(id, field, delta) {
  const now = isoNow();
  await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: `POST#${id}`, SK: 'META' },
    UpdateExpression: `SET updatedAt = :now ADD #f :delta`,
    ExpressionAttributeNames: { '#f': field },
    ExpressionAttributeValues: { ':delta': delta, ':now': now },
  }));
}

/**
 * Xóa post + cascade delete tất cả comments và likes thuộc post đó.
 */
async function deletePostCascade(id) {
  // 1. Xóa post item
  await docClient.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { PK: `POST#${id}`, SK: 'META' },
  }));

  // 2. Query và xóa tất cả child items (comments + likes) có PK = POST#<id>
  let lastKey;
  do {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': `POST#${id}` },
      ExclusiveStartKey: lastKey,
      Limit: 25, // BatchWrite tối đa 25 items
    }));

    if (result.Items && result.Items.length > 0) {
      await docClient.send(new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: result.Items.map(item => ({
            DeleteRequest: { Key: { PK: item.PK, SK: item.SK } },
          })),
        },
      }));
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
}

// ══════════════════════════════════════════════════════════════════════════════
// COMMENT OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

async function queryCommentsByPost(postId, { cursor, limit = 20 } = {}) {
  const exclusiveStartKey = decodeCursor(cursor);

  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
    FilterExpression: 'isHidden = :false',
    ExpressionAttributeValues: {
      ':pk': `POST#${postId}`,
      ':prefix': 'COMMENT#',
      ':false': false,
    },
    ScanIndexForward: true, // asc
    Limit: limit + 1,
    ExclusiveStartKey: exclusiveStartKey,
  }));

  const items = (result.Items || []).map(toComment);
  const hasMore = items.length > limit;
  if (hasMore) items.pop();

  const nextCursor = hasMore && result.LastEvaluatedKey
    ? encodeCursor(result.LastEvaluatedKey)
    : null;

  return { items, hasMore, nextCursor };
}

async function createComment({ postId, authorId, content, imageUrls }) {
  const id = uuidv4();
  const now = isoNow();

  const item = {
    PK: `POST#${postId}`,
    SK: `COMMENT#${now}#${id}`,
    GSI2PK: `AUTHOR#${authorId}`,
    GSI2SK: `COMMENT#${now}#${id}`,
    entityType: 'Comment',
    id,
    postId,
    authorId,
    content,
    imageUrlsRaw: imageUrls || null,
    isHidden: false,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return toComment(item);
}

/**
 * Tìm comment bằng id.
 * Cần scan vì comment id không phải PK — nhưng chỉ dùng cho admin operations.
 */
async function getCommentById(commentId) {
  // Query trên chính table tìm comment (dùng Scan filter)
  let lastKey;
  do {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'entityType = :et AND id = :id',
      ExpressionAttributeValues: { ':et': 'Comment', ':id': commentId },
      Limit: 500,
      ExclusiveStartKey: lastKey,
    }));
    if (result.Items && result.Items.length > 0) {
      return { ...toComment(result.Items[0]), _PK: result.Items[0].PK, _SK: result.Items[0].SK };
    }
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return null;
}

async function deleteCommentByKeys(pk, sk) {
  await docClient.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { PK: pk, SK: sk },
  }));
}

async function updateCommentHidden(pk, sk, isHidden) {
  const now = isoNow();
  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: pk, SK: sk },
    UpdateExpression: 'SET isHidden = :h, updatedAt = :now',
    ExpressionAttributeValues: { ':h': isHidden, ':now': now },
    ReturnValues: 'ALL_NEW',
  }));
  return toComment(Attributes);
}

// ══════════════════════════════════════════════════════════════════════════════
// LIKE OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

async function getLike(postId, userId) {
  const { Item } = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: `POST#${postId}`, SK: `LIKE#${userId}` },
  }));
  return Item || null;
}

async function createLike(postId, userId) {
  const now = isoNow();
  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: `POST#${postId}`,
      SK: `LIKE#${userId}`,
      GSI1PK: `USERLIKE#${userId}`,
      GSI1SK: postId,
      entityType: 'Like',
      postId,
      userId,
      createdAt: now,
    },
  }));
}

async function deleteLike(postId, userId) {
  await docClient.send(new DeleteCommand({
    TableName: TABLE_NAME,
    Key: { PK: `POST#${postId}`, SK: `LIKE#${userId}` },
  }));
}

async function checkUserLikedPost(postId, userId) {
  if (!userId) return false;
  const item = await getLike(postId, userId);
  return !!item;
}

// ══════════════════════════════════════════════════════════════════════════════
// EXP HISTORY OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

async function createExpHistory({ userId, action, amount }) {
  const id = uuidv4();
  const now = isoNow();

  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: `USER#${userId}`,
      SK: `EXP#${now}#${id}`,
      entityType: 'ExpHistory',
      id,
      userId,
      action,
      amount,
      createdAt: now,
    },
  }));
}

async function getTodayExpSum(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayPrefix = today.toISOString().slice(0, 10); // "YYYY-MM-DD"

  let totalExp = 0;
  let lastKey;

  do {
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':prefix': `EXP#${todayPrefix}`,
      },
      ExclusiveStartKey: lastKey,
    }));

    for (const item of (result.Items || [])) {
      totalExp += item.amount || 0;
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return totalExp;
}

/**
 * Atomic: cập nhật totalExp và title cho user + tạo ExpHistory record.
 */
async function addExpToUser(userId, { totalExp, title, expAmount, action }) {
  const now = isoNow();
  const expId = uuidv4();

  await docClient.send(new TransactWriteCommand({
    TransactItems: [
      {
        Update: {
          TableName: TABLE_NAME,
          Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
          UpdateExpression: 'SET totalExp = :exp, title = :title, updatedAt = :now',
          ExpressionAttributeValues: {
            ':exp': totalExp,
            ':title': title,
            ':now': now,
          },
        },
      },
      {
        Put: {
          TableName: TABLE_NAME,
          Item: {
            PK: `USER#${userId}`,
            SK: `EXP#${now}#${expId}`,
            entityType: 'ExpHistory',
            id: expId,
            userId,
            action,
            amount: expAmount,
            createdAt: now,
          },
        },
      },
    ],
  }));
}

// ══════════════════════════════════════════════════════════════════════════════
// SYSTEM CONFIG OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

async function getConfigByKey(key) {
  const { Item } = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: 'CONFIG', SK: key },
  }));
  return Item ? { key: Item.SK, value: Item.value, description: Item.description, updatedAt: Item.updatedAt } : null;
}

async function getConfigsByKeys(keys) {
  if (!keys || keys.length === 0) return {};

  // BatchGetItem — tối đa 100 keys mỗi batch
  const batchKeys = keys.map(k => ({ PK: 'CONFIG', SK: k }));
  const { Responses } = await docClient.send(new BatchGetCommand({
    RequestItems: {
      [TABLE_NAME]: { Keys: batchKeys },
    },
  }));

  const result = {};
  for (const item of (Responses?.[TABLE_NAME] || [])) {
    result[item.SK] = item.value;
  }
  return result;
}

async function getAllConfigs() {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': 'CONFIG' },
  }));

  return (result.Items || [])
    .map(item => ({
      key: item.SK,
      value: item.value,
      description: item.description || null,
      updatedAt: item.updatedAt || null,
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

async function upsertConfig(key, value, description) {
  const now = isoNow();
  const item = {
    PK: 'CONFIG',
    SK: key,
    entityType: 'SystemConfig',
    value: String(value),
    updatedAt: now,
  };
  if (description !== undefined) item.description = description;

  // Nếu có description, dùng UpdateExpression để không ghi đè description cũ khi update
  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: item,
  }));

  return { key, value: String(value), description, updatedAt: now };
}

async function upsertConfigPreserveDescription(key, value) {
  const now = isoNow();
  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: 'CONFIG', SK: key },
    UpdateExpression: 'SET #v = :val, updatedAt = :now, entityType = :et',
    ExpressionAttributeNames: { '#v': 'value' },
    ExpressionAttributeValues: { ':val': String(value), ':now': now, ':et': 'SystemConfig' },
    ReturnValues: 'ALL_NEW',
  }));
  return { key, value: String(value), updatedAt: now };
}

// ══════════════════════════════════════════════════════════════════════════════
// AGGREGATE / STATS (Admin)
// ══════════════════════════════════════════════════════════════════════════════

async function countByEntityType(entityType, filterFn) {
  let count = 0;
  let lastKey;
  do {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'entityType = :et',
      ExpressionAttributeValues: { ':et': entityType },
      Select: filterFn ? 'ALL_ATTRIBUTES' : 'COUNT',
      Limit: 1000,
      ExclusiveStartKey: lastKey,
    }));

    if (filterFn) {
      count += (result.Items || []).filter(filterFn).length;
    } else {
      count += result.Count || 0;
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return count;
}

async function getRecentPosts(limit = 5) {
  // Scan tất cả Post, sort by createdAt desc, lấy top N
  const allPosts = [];
  let lastKey;
  do {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'entityType = :et',
      ExpressionAttributeValues: { ':et': 'Post' },
      Limit: 500,
      ExclusiveStartKey: lastKey,
    }));
    allPosts.push(...(result.Items || []));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  allPosts.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return allPosts.slice(0, limit).map(toPost);
}

async function getRecentUsers(limit = 5) {
  const allUsers = [];
  let lastKey;
  do {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'entityType = :et',
      ExpressionAttributeValues: { ':et': 'User' },
      Limit: 500,
      ExclusiveStartKey: lastKey,
    }));
    allUsers.push(...(result.Items || []));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  allUsers.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return allUsers.slice(0, limit).map(toUser);
}

/**
 * Batch get nhiều users theo id array.
 * Dùng để "join" author info cho posts/comments.
 */
async function batchGetUsers(userIds) {
  if (!userIds || userIds.length === 0) return {};

  const uniqueIds = [...new Set(userIds)];
  const result = {};

  // BatchGet tối đa 100 items
  for (let i = 0; i < uniqueIds.length; i += 100) {
    const batch = uniqueIds.slice(i, i + 100);
    const keys = batch.map(id => ({ PK: `USER#${id}`, SK: 'PROFILE' }));

    const { Responses } = await docClient.send(new BatchGetCommand({
      RequestItems: {
        [TABLE_NAME]: { Keys: keys },
      },
    }));

    for (const item of (Responses?.[TABLE_NAME] || [])) {
      result[item.id] = toUser(item);
    }
  }

  return result;
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

module.exports = {
  // Helpers
  encodeCursor,
  decodeCursor,

  // User
  getUserById,
  getUserByCognitoSub,
  getUserByUsername,
  createUser,
  updateUser,
  countUserPosts,
  queryAllUsers,
  batchGetUsers,

  // Post
  getPostById,
  createPost,
  queryApprovedPosts,
  queryPostsByAuthor,
  queryPendingPosts,
  queryHiddenPosts,
  updatePostStatus,
  updatePostHidden,
  incrementPostCounter,
  deletePostCascade,

  // Comment
  queryCommentsByPost,
  createComment,
  getCommentById,
  deleteCommentByKeys,
  updateCommentHidden,

  // Like
  getLike,
  createLike,
  deleteLike,
  checkUserLikedPost,

  // ExpHistory
  createExpHistory,
  getTodayExpSum,
  addExpToUser,

  // SystemConfig
  getConfigByKey,
  getConfigsByKeys,
  getAllConfigs,
  upsertConfig,
  upsertConfigPreserveDescription,

  // Stats / Aggregates
  countByEntityType,
  getRecentPosts,
  getRecentUsers,
};
