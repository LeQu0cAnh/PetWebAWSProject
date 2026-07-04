/**
 * src/controllers/petController.js
 *
 * Controller xử lý hồ sơ Pet (Desktop Pet App).
 * Lưu trữ trong cùng bảng DynamoDB với Web (Single-Table Design).
 *
 * PK: USER#${userId}
 * SK: PET_PROFILE
 *
 * Các trường dữ liệu: petName, hairColor, scale, lastUpdated
 *
 * LƯU Ý: Không sửa đổi bất kỳ controller hay route cũ nào.
 */

const { GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient, TABLE_NAME } = require('../config/dynamodb');
const db = require('../db/db');

// ── Helper: Lấy hoặc tự động tạo userId từ thông tin Cognito ──────────────────
async function getOrCreateUserId(cognitoUser) {
  const { cognitoSub, email, username } = cognitoUser;
  let user = await db.getUserByCognitoSub(cognitoSub);

  if (!user) {
    // Tự động tạo user mới khi lần đầu tương tác qua App Desktop
    const displayName = email ? email.split('@')[0] : (username || 'user');
    
    // Đảm bảo username độc nhất trong DB
    let finalUsername = displayName;
    let attempt = 0;
    while (true) {
      const existing = await db.getUserByUsername(finalUsername);
      if (!existing) break;
      attempt++;
      finalUsername = `${displayName}${attempt}`;
    }

    user = await db.createUser({
      cognitoSub,
      email,
      username: finalUsername,
    });
    console.log(`[PetController] 🆕 Auto-created user profile in DynamoDB for cognitoSub: ${cognitoSub}`);
  }

  return user.id;
}

// ── POST /api/pet/profile ────────────────────────────────────────────────────
/**
 * Lưu hồ sơ Pet của người dùng hiện tại lên DynamoDB.
 * Body: { petName: string, hairColor: string, scale: number }
 */
const savePetProfile = async (req, res, next) => {
  try {
    const { cognitoSub } = req.user;
    const { petName, hairColor, scale } = req.body;

    // Validate input
    if (!petName || typeof petName !== 'string') {
      return res.status(400).json({ success: false, message: 'Thiếu trường petName hoặc không hợp lệ.' });
    }
    if (!hairColor || typeof hairColor !== 'string') {
      return res.status(400).json({ success: false, message: 'Thiếu trường hairColor hoặc không hợp lệ.' });
    }
    if (scale === undefined || typeof scale !== 'number') {
      return res.status(400).json({ success: false, message: 'Thiếu trường scale hoặc không hợp lệ.' });
    }

    // Lấy userId từ DB (tạo mới nếu chưa có)
    const userId = await getOrCreateUserId(req.user);
    const lastUpdated = new Date().toISOString();

    // Ghi vào DynamoDB (PutCommand ghi đè toàn bộ)
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${userId}`,
        SK: 'PET_PROFILE',
        entityType: 'PetProfile',
        petName,
        hairColor,
        scale,
        lastUpdated,
      },
    }));

    console.log(`[PetController] ✅ Đã lưu hồ sơ Pet cho userId: ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'Đồng bộ hồ sơ Pet thành công!',
      data: { petName, hairColor, scale, lastUpdated },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/pet/profile ─────────────────────────────────────────────────────
/**
 * Lấy hồ sơ Pet của người dùng hiện tại từ DynamoDB.
 * Trả về 404 nếu chưa có hồ sơ.
 */
const getPetProfile = async (req, res, next) => {
  try {
    const { cognitoSub } = req.user;

    // Lấy userId từ DB (tạo mới nếu chưa có)
    const userId = await getOrCreateUserId(req.user);

    // Đọc từ DynamoDB
    const { Item } = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: 'PET_PROFILE',
      },
    }));

    if (!Item) {
      return res.status(404).json({
        success: false,
        message: 'Chưa có hồ sơ Pet nào được lưu trên Đám mây.',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        petName: Item.petName,
        hairColor: Item.hairColor,
        scale: Item.scale,
        lastUpdated: Item.lastUpdated,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/pet/chat ───────────────────────────────────────────────────────
/**
 * Làm cầu nối Proxy an toàn gọi tới Google Gemini AI từ Backend Lambda.
 * Tránh để lộ API Key ở phía Client.
 */
const chatWithPet = async (req, res, next) => {
  try {
    const { prompt, imageBytes, mimeType, chatHistory, personaPrompt, modelName } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ success: false, message: 'Thiếu trường prompt hoặc không hợp lệ.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'Chưa cấu hình GEMINI_API_KEY trên server.' });
    }

    // Mặc định là modelName nhận từ client, hoặc fallback về gemini-1.5-flash
    const selectedModel = modelName || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

    // Xây dựng parts cho lượt chat hiện tại của người dùng
    const userParts = [{ text: prompt }];
    if (imageBytes && mimeType) {
      userParts.push({
        inline_data: {
          mime_type: mimeType,
          data: imageBytes
        }
      });
    }

    // Xây dựng mảng contents (lịch sử + lượt chat mới)
    const contents = [];
    if (Array.isArray(chatHistory)) {
      contents.push(...chatHistory);
    }
    contents.push({
      role: 'user',
      parts: userParts
    });

    const geminiPayload = {
      contents
    };

    if (personaPrompt) {
      geminiPayload.system_instruction = {
        parts: [{ text: personaPrompt }]
      };
    }

    console.log(`[PetController] 📡 Đang chuyển tiếp yêu cầu tới Gemini (${selectedModel})...`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(geminiPayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[PetController] ❌ Lỗi từ Gemini API: ${response.status} | ${errText}`);
      return res.status(response.status).json({
        success: false,
        message: `Gemini API returned error: ${response.statusText}`,
        detail: errText
      });
    }

    const responseData = await response.json();
    
    // Trích xuất phản hồi text
    let aiResponse = '';
    try {
      aiResponse = responseData.candidates[0].content.parts[0].text;
    } catch (e) {
      console.error('[PetController] ❌ Lỗi parse JSON trả về từ Gemini:', e, responseData);
      return res.status(500).json({
        success: false,
        message: 'Lỗi cấu trúc phản hồi từ Gemini.',
        raw: responseData
      });
    }

    return res.status(200).json({
      success: true,
      text: aiResponse
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { savePetProfile, getPetProfile, chatWithPet };
