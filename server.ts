import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getGeminiKey(): string | undefined {
  const envKey = process.env.GEMINI_API_KEY;
  // If the key in the environment is the old leaked key starting with AIzaSyBQlt, ignore it
  if (envKey && envKey !== "AIzaSyBQltxpLD8jLySSv0OcSd15CxTdGnpkET0" && !envKey.startsWith("AIzaSyBQlt")) {
    return envKey;
  }
  return undefined;
}

const GEMINI_KEY = getGeminiKey();

function getGenAI(): GoogleGenAI {
  if (!aiInstance) {
    if (!GEMINI_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set GEMINI_API_KEY in Settings > Secrets.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: GEMINI_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Robust custom helper to make robust Gemini requests with automatic retries & fallback models
async function generateContentWithRetryAndFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config: any;
  }
) {
  // We prioritize gemini-3.5-flash but fall back automatically to gemini-flash-latest on high load (503/UNAVAILABLE)
  const modelsToTry = ["gemini-3.5-flash", "gemini-flash-latest"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    const maxRetries = 2;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini API] Querying model: ${model} (attempt ${attempt}/${maxRetries})...`);
        const response = await ai.models.generateContent({
          model: model,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errStr = String(err.message || err);
        console.warn(`[Gemini API] Warn: Error querying ${model} (attempt ${attempt}/${maxRetries}):`, errStr);

        // Treat temporary overloads or Google server outages as transient
        const isTransient = 
          errStr.includes("503") || 
          errStr.includes("UNAVAILABLE") || 
          errStr.includes("demand") || 
          errStr.includes("429") || 
          errStr.includes("RESOURCE_EXHAUSTED") || 
          errStr.includes("overloaded") ||
          errStr.includes("timeout") ||
          errStr.includes("Socket") ||
          errStr.includes("fetch");

        if (!isTransient) {
          // If the model name is incorrect or not found in their subscription/deployment, proceed to fallback model
          if (errStr.includes("model") || errStr.includes("not found") || errStr.includes("supported")) {
            console.log(`[Gemini API] Model ${model} is not supported or not found. Falling back to the next model...`);
            break; 
          }
          throw err;
        }

        // Wait before retrying
        if (attempt < maxRetries) {
          const delay = attempt * 1200 + Math.random() * 500;
          console.log(`[Gemini API] Transient issue detected. Retrying in ${Math.round(delay)}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }

  throw lastError || new Error("Không thể kết nối đến máy chủ AI của Google (Gemini). Vui lòng thử lại sau.");
}

// Clean translator to format raw API errors into user-friendly instructions in Vietnamese
function formatGeminiError(error: any): string {
  const errStr = typeof error === 'string' ? error : (error.message || String(error));
  if (errStr.includes("503") || errStr.includes("UNAVAILABLE") || errStr.includes("experience high demand") || errStr.includes("overloaded")) {
    return "Hệ thống AI của Google đang bị quá tải tạm thời (Lỗi 503). Hệ thống đã tự động thử lại 4 lần nhưng chưa thành công. Bạn vui lòng bấm nút 'QUÉT' lại một lần nữa hoặc đợi 5-10 giây để máy chủ rảnh hơn nhé!";
  }
  if (errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED") || errStr.includes("Rate limit")) {
    return "Yêu cầu chụp quét hiện đạt giới hạn tối đa của khoá API (Lỗi 429). Bạn vui lòng đợi khoảng 1 phút rồi thử quét lại nhé!";
  }
  if (errStr.includes("API key not valid") || errStr.includes("API_KEY_INVALID") || errStr.includes("invalid key")) {
    return "Khoá API Gemini (GEMINI_API_KEY) của bạn không chính xác hoặc không hoạt động. Vui lòng kiểm tra lại cấu hình khoá trong thiết lập Secrets (Settings -> Secrets) ở góc màn hình!";
  }
  return errStr;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser setup for handling large images
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ limit: "25mb", extended: true }));

  // API route for scanning handwritten notes using Gemini
  app.post("/api/scan-handwritten", async (req, res) => {
    try {
      const { image, customers } = req.body;
      if (!image) {
        return res.status(400).json({ error: "No image data provided" });
      }

      if (!customers || !Array.isArray(customers)) {
        return res.status(400).json({ error: "No customer list provided to match" });
      }

      // Check if API key exists
      if (!GEMINI_KEY) {
        return res.status(400).json({
          error: "GEMINI_API_KEY_MISSING",
          message: "Chưa cấu hình API Key cho Gemini. Vui lòng thêm GEMINI_API_KEY trong biểu tượng bánh răng bên dưới (Settings -> Secrets) để có thể dùng tính năng quét ảnh thông minh này."
        });
      }

      const ai = getGenAI();

      // Extract raw base64 data from potential data URL prefix
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
Bạn là một trợ lý AI chuyên nghiệp phân tích biểu mẫu ghi chỉ số nước ghi tay (OCR) và so khớp thông tin khách hàng.
Tài liệu hoặc hình ảnh đính kèm là trang ghi tay số nước, danh sách chỉ số nước mới, hoặc tệp tài liệu PDF (có thể gồm nhiều trang) của một kỳ ghi nước.
Hãy đọc kỹ toàn bộ các trang tài liệu hoặc hình ảnh, phân tích chữ viết tay hoặc chữ in và trích xuất chỉ số mới (Chỉ số mới ghi được) cho từng khách hàng.
Sử dụng "Danh sách Khách hàng hiện tại" được cung cấp bên dưới để ánh xạ (match) chính xác chữ viết tay trên tài liệu (có thể chỉ ghi tên viết tắt, số nhà, địa chỉ, số thứ tự sản xuất, hoặc mã số) với Mã KH (id) tương ứng.

Danh sách Khách hàng hiện tại:
${JSON.stringify(customers, null, 2)}

Yêu cầu trích xuất:
1. So khớp thông tin khách hàng: ánh xạ các ghi chú tên, địa chỉ hoặc mã số viết tay tới Mã KH (id) phù hợp nhất từ danh sách khách hàng được cung cấp. Nếu viết tay mập mờ hoặc ghi tắt (ví dụ: "T Hải Nam", "Nam", "241 Nam"), hãy dùng thông tin tên đầy đủ, địa chỉ hoặc 'oldIndex' (Chỉ số cũ) tương đồng để phán đoán hợp lý thông minh nhất.
2. Trích xuất CHỈ SỐ MỚI (chữ số đọc được ví dụ: "2098", "4563"). Đảm bảo chỉ số mới phải LỚN HƠN HOẶC BẰNG chỉ số cũ (oldIndex) của khách hàng đó. Không lấy phần chênh lệch tiêu thụ.
3. Nếu tài liệu PDF có nhiều trang, hãy duyệt qua toàn bộ tất cả các trang để không bỏ sót bất kỳ khách hàng nào.
4. Nếu không tìm thấy hoặc không đọc được khách hàng nào đó phù hợp hoàn toàn, hãy bỏ qua hoặc không đưa khách hàng đó vào mảng JSON kết quả để tránh sai lệch dữ liệu.
5. Trả về kết quả dưới dạng danh sách JSON đúng Schema cấu trúc quy định.
`;

      const response = await generateContentWithRetryAndFallback(ai, {
        contents: { parts: [imagePart, { text: promptText }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { 
                  type: Type.STRING,
                  description: "Mã KH (id) của khách hàng được so khớp từ Danh sách Khách hàng hiện tại."
                },
                name: { 
                  type: Type.STRING,
                  description: "Tên khách hàng đã so khớp để hiển thị đối chiếu."
                },
                extractedNewIndex: { 
                  type: Type.INTEGER,
                  description: "Chỉ số mới (New Index) ghi nhận được trên hình ảnh."
                },
                reason: { 
                  type: Type.STRING,
                  description: "Lý do so khớp hoặc trích xuất (nói rõ từ chữ ghi tay nào trên ảnh để người dùng đối chiếu lỗi)."
                }
              },
              required: ["id", "extractedNewIndex"]
            }
          }
        }
      });

      const textOutput = response.text;
      if (!textOutput) {
        throw new Error("Empty response from AI model");
      }

      const results = JSON.parse(textOutput);
      res.json({ success: true, results });

    } catch (error: any) {
      console.error("Error in scan-handwritten API:", error);
      res.status(500).json({ 
        error: "SERVER_ERROR", 
        message: formatGeminiError(error)
      });
    }
  });

  // API route for scanning daily water loss sheets
  app.post("/api/scan-daily", async (req, res) => {
    try {
      const { image, monthYear } = req.body;
      if (!image) {
        return res.status(400).json({ error: "No image data provided" });
      }

      // Check if API key exists
      if (!GEMINI_KEY) {
        return res.status(400).json({
          error: "GEMINI_API_KEY_MISSING",
          message: "Chưa cấu hình API Key cho Gemini. Vui lòng thêm GEMINI_API_KEY trong biểu tượng bánh răng bên dưới (Settings -> Secrets) để có thể dùng tính năng quét ảnh thông minh này."
        });
      }

      const ai = getGenAI();

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

      const response = await generateContentWithRetryAndFallback(ai, {
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
      res.json({ success: true, results });

    } catch (error: any) {
      console.error("Error in scan-daily API:", error);
      res.status(500).json({ 
        error: "SERVER_ERROR", 
        message: formatGeminiError(error)
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
