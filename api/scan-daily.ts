import { GoogleGenAI, Type } from "@google/genai";

function getGeminiKey(): string | undefined {
  const envKey = process.env.GEMINI_API_KEY;
  if (envKey && envKey !== "AIzaSyBQltxpLD8jLySSv0OcSd15CxTdGnpkET0" && !envKey.startsWith("AIzaSyBQlt")) {
    return envKey;
  }
  return undefined;
}

const GEMINI_KEY = getGeminiKey();

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    const { image, monthYear } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image data provided" });
    }

    if (!GEMINI_KEY) {
      return res.status(400).json({
        error: "GEMINI_API_KEY_MISSING",
        message: "Chưa cấu hình API Key cho Gemini. Vui lòng thêm GEMINI_API_KEY để sử dụng tính năng."
      });
    }

    const ai = new GoogleGenAI({
      apiKey: GEMINI_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    let mimeType = "image/jpeg";
    let base64Data = image;
    if (image.startsWith("data:")) {
      const match = image.match(/^data:([^;]+);base64,(.*)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      },
    };

    const promptText = `
Bạn là một trợ lý AI chuyên nghiệp phân tích sổ sách/biểu mẫu ghi chỉ số nước hằng ngày dạng bảng viết tay (OCR).
Hình ảnh đính kèm là "BẢNG THEO DÕI CHỈ SỐ TIÊU THỤ HẰNG NGÀY" (hoặc bảng theo dõi chỉ số đồng hồ tổng cấp nước).
Nó thường có các cột cho Ngày (1 đến 31), Giờ ghi (ví dụ "07:00", "07h"), Chỉ số của Đồng hồ 1 (Đồng hồ 1, ĐH 1, M1) và Chỉ số của Đồng hồ 2 (Đồng hồ 2, ĐH 2, M2).
Một số bảng chia làm 2 nửa: Nửa bên trái là các ngày từ 1 đến 15, nửa bên phải là các ngày từ 16 đến 31.

Hãy phân tích kỹ hình ảnh và trích xuất chỉ số của Đồng hồ số 1 và Đồng hồ số 2 cho các ngày từ 1 đến 31.
Tháng/Năm hiện tại của kỳ ghi chép này là: ${monthYear || "tháng hiện tại"}.

Yêu cầu trích xuất:
1. Đọc chính xác từng dòng ứng với Số ngày (Day) từ 1 đến 31.
2. Trích xuất chỉ số ĐỒNG HỒ 1 (Đồng hồ 1, master 1) và ĐỒNG HỒ 2 (Đồng hồ 2, master 2) được viết tay. Đảm bảo đọc đúng chữ viết tay có dấu bụi hoặc bóng mờ.
3. Trích xuất cột "Giờ" (ví dụ "07:00"). Nếu không ghi, mặc định là "07:00".
4. Nếu có dòng nào không có chỉ số hoặc trống chỉ số, vui lòng BỎ QUA không đưa vào mảng kết quả. Chỉ trả về những ngày ghi nhận được số liệu thực tế viết tay.
5. Trả về kết quả dưới dạng danh sách JSON đúng Schema cấu trúc quy định.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, { text: promptText }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { 
                type: Type.INTEGER,
                description: "Số ngày ghi nước (từ 1 đến 31)."
              },
              time: { 
                type: Type.STRING,
                description: "Giờ ghi nước (ví dụ: '07:00'). Nếu trống thì mặc định '07:00'."
              },
              master1: { 
                type: Type.INTEGER,
                description: "Chỉ số đọc được của Đồng hồ số 1 (DH1). Nếu không có hoặc trống thì trả về 0."
              },
              master2: { 
                type: Type.INTEGER,
                description: "Chỉ số đọc được của Đồng hồ số 2 (DH2). Nếu không có hoặc trống thì trả về 0."
              },
              notes: { 
                type: Type.STRING,
                description: "Ghi chú viết tay trên dòng đó nếu có."
              }
            },
            required: ["day", "time", "master1", "master2"]
          }
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("Empty response from AI model");
    }

    const results = JSON.parse(textOutput);
    res.status(200).json({ success: true, results });

  } catch (error: any) {
    console.error("Error in scan-daily API:", error);
    res.status(500).json({ 
      error: "SERVER_ERROR", 
      message: error.message || "Đã xảy ra lỗi khi xử lý hình ảnh bảng hằng ngày." 
    });
  }
}
