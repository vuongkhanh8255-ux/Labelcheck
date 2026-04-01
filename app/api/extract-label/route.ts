import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Hệ thống thiếu cấu hình API Key (OPENAI_API_KEY).');
  }
  return new OpenAI({ apiKey });
}

/**
 * Normalize OCR text — fix common GPT-4o OCR errors:
 * - Extra spaces before punctuation: " ," → ","  " ." → "."
 * - Multiple spaces → single space
 * - Trim whitespace
 */
function normalizeOcrText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\s+([,.\;:!?])/g, '$1')  // Remove space before punctuation
    .replace(/\s{2,}/g, ' ')            // Collapse multiple spaces
    .trim();
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    // Support multiple page images (labelPages) or single file (labelFile)
    const labelPages = formData.getAll('labelPages') as File[];
    const labelFileSingle = formData.get('labelFile') as File | null;
    const files = labelPages.length > 0 ? labelPages : (labelFileSingle ? [labelFileSingle] : []);

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'File nhãn là bắt buộc' },
        { status: 400 },
      );
    }

    // Convert all pages to base64
    const pagesBase64: { base64: string; mime: string }[] = [];
    for (const file of files) {
      const base64 = await fileToBase64(file);
      pagesBase64.push({ base64, mime: file.type });
    }

    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Bạn là trợ lý trích xuất thông tin từ NHÃN SẢN PHẨM MỸ PHẨM.
Nhiệm vụ: Đọc CHÍNH XÁC văn bản in trên nhãn sản phẩm mỹ phẩm.

QUAN TRỌNG — LỌC VÙNG NHÃN THẬT:
File ảnh có thể là file thiết kế chứa NHIỀU yếu tố phụ xung quanh nhãn. Bạn PHẢI:
- CHỈ đọc thông tin IN TRỰC TIẾP trên bao bì/nhãn sản phẩm thật.
- BỎ QUA hoàn toàn các yếu tố thiết kế xung quanh như:
  + Ghi chú kích thước (cm, mm, inches)
  + Thông số màu (CMYK, HEX, RGB)
  + Ghi chú kỹ thuật ("ép kim", "cán màng", "in offset")
  + Ảnh mẫu sản phẩm, ảnh tham khảo
  + Tiêu đề file ("NHÃN 1:", "NHÃN 2:", "MẶT TRƯỚC", "MẶT SAU")
  + Mũi tên, đường kẻ đo, annotation
  + Bất kỳ text nào NGOÀI vùng nhãn thật
- Vùng nhãn thật là phần hình chữ nhật chứa: tên SP, thành phần, hướng dẫn, barcode, logo thương hiệu.

HƯỚNG DẪN ĐỌC TÊN SẢN PHẨM TỪ NHÃN — CỰC KỲ QUAN TRỌNG:
Tên sản phẩm trên nhãn mỹ phẩm thường được TÁCH THÀNH NHIỀU DÒNG với nhiều kích cỡ chữ khác nhau.
Bạn PHẢI đọc TẤT CẢ các dòng chữ tạo thành tên sản phẩm, KHÔNG CHỈ dòng chữ lớn nhất.

Các thành phần của tên sản phẩm đầy đủ thường bao gồm (theo thứ tự xuất hiện trên nhãn):
1. Tên tiếng Anh (VD: "Moisturizing & Protecting Hair Serum")
2. Tên dòng sản phẩm / thành phần chính — thường là chữ LỚN NHẤT (VD: "SACHI OIL, ARGAN OIL, EHMC")
3. Loại sản phẩm (VD: "SERUM")
4. Tên tiếng Việt của dòng sản phẩm (VD: "SACHI, DẦU ARGAN, EHMC")
5. Mô tả công dụng tiếng Việt (VD: "Dưỡng Ẩm Bảo Vệ Tóc" hoặc "Dưỡng Ẩm, Bảo Vệ Tóc")

→ Ghép TẤT CẢ các phần trên thành MỘT chuỗi duy nhất, cách nhau bằng " " (khoảng trắng).
→ Thứ tự ghép: Tên tiếng Anh + Tên dòng SP + Loại SP + Tên Việt dòng SP + Mô tả công dụng Việt
→ Nếu tên tiếng Anh nằm phía trên → đặt đầu tiên. Nếu nằm phía dưới → đặt đầu tiên vẫn được.
→ VD kết quả: "MOISTURIZING & PROTECTING HAIR SERUM SACHI OIL, ARGAN OIL, EHMC SERUM SACHI, DẦU ARGAN, EHMC DƯỠNG ẨM BẢO VỆ TÓC"

QUY TẮC ĐỌC TỪNG KÝ TỰ:
- Đọc TỪNG KÝ TỰ MỘT, bao gồm: chữ cái, số, dấu câu (dấu phẩy, dấu gạch ngang, dấu chấm, dấu ngoặc, dấu &), và khoảng trắng.
- KHÔNG ĐƯỢC thêm bất kỳ dấu câu nào mà nhãn KHÔNG có.
- KHÔNG ĐƯỢC bỏ bất kỳ dấu câu nào mà nhãn CÓ.
- KHÔNG ĐƯỢC sửa chính tả, thêm dấu phẩy, hay thay đổi bất kỳ ký tự nào.
- Nếu nhãn ghi "DƯỠNG ẨM BẢO VỆ TÓC" (không có dấu phẩy) → giữ đúng "DƯỠNG ẨM BẢO VỆ TÓC".
- Nếu nhãn ghi "DƯỠNG ẨM, BẢO VỆ TÓC" (có dấu phẩy) → giữ đúng "DƯỠNG ẨM, BẢO VỆ TÓC".

LƯU Ý: KHÔNG tính tên thương hiệu/logo (VD: "L'Oréal", "Cocoon") vào tên sản phẩm.
Chỉ lấy các phần mô tả sản phẩm, công dụng, thành phần, loại sản phẩm.

HƯỚNG DẪN ĐỌC DUNG TÍCH / KHỐI LƯỢNG:
- Tìm số ghi dung tích/khối lượng trên nhãn (thường ở phía dưới hoặc mặt sau).
- Trích xuất con số và đơn vị (ml, g, L, kg, v.v.)
- Ví dụ: "150 ml", "50 g", "250ml" → volume = "150", volumeUnit = "ml"

HƯỚNG DẪN ĐỌC SỐ MÃ VẠCH (BARCODE) — CỰC KỲ QUAN TRỌNG, ĐỌC TỪNG SỐ MỘT:
- Tìm mã vạch (barcode) trên nhãn — các vạch đen trắng song song (EAN-13).
- Barcode có thể nằm ngang hoặc dọc. Có thể ở góc, cạnh, mặt sau nhãn.
- Đọc DÃY SỐ IN BÊN DƯỚI hoặc BÊN CẠNH các vạch barcode.
- ĐỌC TỪNG CHỮ SỐ MỘT, từ trái sang phải:
  + Chữ số 1 (đứng riêng bên trái): ?
  + Nhóm 6 số tiếp theo: ? ? ? ? ? ?
  + Nhóm 6 số cuối: ? ? ? ? ? ?
  + Ghép lại thành 13 chữ số liên tục.
- KHÔNG đoán, KHÔNG suy luận, KHÔNG dùng kiến thức có sẵn về sản phẩm.
- CHỈ đọc chính xác số IN TRÊN NHÃN.
- Nếu không nhìn rõ hoặc không chắc chắn → trả "" cho barcodeNumber.
- VD: Nhãn in "8 936089 071971" → barcodeNumber = "8936089071971"
- VD: Nhãn in "8 936237 960201" → barcodeNumber = "8936237960201"

HƯỚNG DẪN ĐỌC CÔNG DỤNG TỪ NHÃN — CỰC KỲ QUAN TRỌNG:
- Tìm phần "CÔNG DỤNG:" hoặc "Công dụng:" trên nhãn
- ĐỌC THEO PHƯƠNG PHÁP "ĐÁNH VẦN TỪNG TỪ":
  Bước 1: Chỉ tay vào từ đầu tiên sau "Công dụng:", đọc nó ra.
  Bước 2: Chỉ tay vào từ tiếp theo, đọc nó ra.
  Bước 3: Lặp lại cho đến hết câu.
  Bước 4: Ghép tất cả các từ đã đọc lại thành chuỗi.

- 🚨 LỖI THƯỜNG GẶP — BẠN HAY MẮC LỖI NÀY, CHÚ Ý:
  ❌ SAI: "Tẩy tế bào chết" — THIẾU chữ "da"!
  ✅ ĐÚNG: "Tẩy tế bào da chết" — ĐỦ 4 từ: tế + bào + da + chết

  ❌ SAI: "dưỡng ẩm mịn" — THIẾU chữ "da"!
  ✅ ĐÚNG: "dưỡng da ẩm mịn" — ĐỦ: dưỡng + da + ẩm + mịn

  → Trong mỹ phẩm Việt Nam, từ "da" (skin) xuất hiện RẤT NHIỀU.
  → "tế bào da chết" = dead skin cells (4 từ, KHÔNG PHẢI 3 từ)
  → "dưỡng da ẩm mịn" = moisturize skin smoothly (KHÔNG PHẢI "dưỡng ẩm mịn")
  → "làm sạch da" = cleanse skin (KHÔNG PHẢI "làm sạch")
  → "sáng da" = brighten skin (KHÔNG PHẢI "sáng")
  → TUYỆT ĐỐI KHÔNG ĐƯỢC bỏ chữ "da" ở bất kỳ đâu!

- Giữ nguyên 100% dấu câu (dấu phẩy, dấu chấm, dấu gạch ngang)
- Các gạch đầu dòng (•, -, ·) tách thành các mục, nối bằng dấu phẩy
- Sau khi đọc xong, KIỂM TRA LẠI: đếm số lần xuất hiện của chữ "da" trong ảnh nhãn phần công dụng → số lần trong kết quả phải BẰNG NHAU.

HƯỚNG DẪN ĐỌC THÀNH PHẦN TỪ NHÃN — ĐỌC TỪNG TÊN MỘT:
- Tìm phần "THÀNH PHẦN:" hoặc "Thành phần:" hoặc "Ingredients:" trên nhãn
- Đọc TỪNG tên thành phần một, KHÔNG ĐƯỢC bỏ sót
- Giữ nguyên thứ tự và tên INCI (tên khoa học)
- Giữ nguyên nội dung trong ngoặc đơn nếu có, VD: "(Himalayan Pink Salt)"
- Cách nhau bởi dấu phẩy
- Sau khi đọc xong, ĐỌC LẠI LẦN 2 để xác nhận không bỏ sót thành phần nào

🚨 TUYỆT ĐỐI KHÔNG ĐƯỢC AUTO-CORRECT TÊN THÀNH PHẦN (INCI):
- Đọc CHÍNH XÁC từng chữ cái in trên nhãn, KHÔNG sửa thành tên "đúng" theo kiến thức của bạn.
- Bạn KHÔNG PHẢI nhà hóa học — KHÔNG ĐƯỢC "sửa lỗi chính tả" cho tên thành phần.
- VD LỖI BẠN HAY MẮC:
  ❌ Nhãn ghi "TOCOPHERYL" → bạn đọc "Tocopherol" → SAI! Đọc đúng "Tocopheryl"
  ❌ Nhãn ghi "DMDM HYDANTOIN" → bạn đọc "Dimethyl Hydantoin" → SAI! Đọc đúng "DMDM Hydantoin"
  ❌ Nhãn ghi "PARKII" → bạn đọc "Parkia" → SAI! Đọc đúng "Parkii"
  ❌ Nhãn ghi "PEG-7" → bạn đọc "PEG-70" → SAI! Đọc đúng "PEG-7"
  ❌ Nhãn ghi "Glyceryl Cocoate" → bạn đọc "Glycerol Cocoate" → SAI! Đọc đúng "Glyceryl Cocoate"
- Quy tắc vàng: NẾU BẠN THẤY MUỐN SỬA MỘT TỪ → DỪNG LẠI → GIỮ NGUYÊN NHƯ IN TRÊN NHÃN.
- Viết HOA/thường: giữ đúng như in trên nhãn. Nếu nhãn in HOA hết → giữ HOA.

Trả về JSON thuần (KHÔNG markdown, KHÔNG code block):
{
  "productName": "tên sản phẩm ĐẦY ĐỦ gồm TẤT CẢ các dòng chữ tạo thành tên, ghép lại thành 1 chuỗi",
  "volume": "con số dung tích/khối lượng, chỉ số (VD: 150)",
  "volumeUnit": "đơn vị: ml hoặc g",
  "barcodeNumber": "dãy số in dưới/bên cạnh barcode trên nhãn (VD: 8936237960201)",
  "intendedUse": "công dụng đọc chính xác từ nhãn",
  "ingredients": "danh sách thành phần đầy đủ từ nhãn, cách nhau bởi dấu phẩy",
  "confidence": "high | medium | low"
}

Nếu không tìm thấy thông tin nào, trả giá trị rỗng "" cho field đó.`,
        },
        {
          role: 'user',
          content: (() => {
            const parts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
            parts.push({
              type: 'text',
              text: `Hãy đọc nhãn sản phẩm mỹ phẩm (${pagesBase64.length} trang) dưới đây và trích xuất TẤT CẢ thông tin sau:

1. TÊN SẢN PHẨM ĐẦY ĐỦ: Đọc TẤT CẢ các dòng chữ tạo thành tên sản phẩm (tên tiếng Anh, tên dòng SP, loại SP, tên tiếng Việt, mô tả công dụng) rồi GHÉP THÀNH MỘT CHUỖI. Đọc TỪNG KÝ TỰ MỘT, giữ nguyên 100% dấu câu.

2. DUNG TÍCH/KHỐI LƯỢNG: Số + đơn vị (ml, g, v.v.)

3. SỐ MÃ VẠCH (BARCODE): Đọc 13 chữ số EAN-13 in dưới/bên cạnh các vạch barcode.

4. CÔNG DỤNG: Tìm phần "CÔNG DỤNG:" hoặc "Công dụng:" trên nhãn, đọc TỪNG TỪ MỘT. KHÔNG ĐƯỢC bỏ sót bất kỳ từ nào.

5. THÀNH PHẦN (INGREDIENTS): Tìm phần "THÀNH PHẦN:" hoặc "Thành phần:" hoặc "Ingredients:" trên nhãn, đọc CHÍNH XÁC TOÀN BỘ danh sách thành phần. KHÔNG ĐƯỢC bỏ sót.

QUAN TRỌNG: Trả về ĐẦY ĐỦ tất cả 5 mục trên. Nếu không tìm thấy mục nào thì trả "" cho field đó.`,
            });
            for (let i = 0; i < pagesBase64.length; i++) {
              if (pagesBase64.length > 1) {
                parts.push({ type: 'text', text: `📸 Trang ${i + 1}/${pagesBase64.length} của nhãn:` });
              }
              parts.push({
                type: 'image_url',
                image_url: {
                  url: `data:${pagesBase64[i].mime};base64,${pagesBase64[i].base64}`,
                  detail: 'high',
                },
              });
            }
            return parts;
          })(),
        },
      ],
      max_tokens: 2048,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: 'Không nhận được phản hồi từ AI' },
        { status: 500 },
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: 'AI trả về format không hợp lệ', raw: content },
        { status: 500 },
      );
    }

    // Validate EAN-13 checksum
    let barcodeNumber = (parsed.barcodeNumber || '').replace(/\s/g, '');
    let barcodeValid = false;
    if (barcodeNumber.length === 13 && /^\d{13}$/.test(barcodeNumber)) {
      const digits = barcodeNumber.split('').map(Number);
      const checksum = digits.slice(0, 12).reduce((sum: number, d: number, i: number) =>
        sum + d * (i % 2 === 0 ? 1 : 3), 0);
      const expected = (10 - (checksum % 10)) % 10;
      barcodeValid = digits[12] === expected;
      if (!barcodeValid) {
        console.warn(`[Barcode] EAN-13 checksum FAILED: ${barcodeNumber}, expected last digit ${expected}, got ${digits[12]}`);
        barcodeNumber = ''; // Discard invalid barcode
      } else {
        console.log(`[Barcode] EAN-13 checksum OK: ${barcodeNumber}`);
      }
    } else if (barcodeNumber.length > 0) {
      console.warn(`[Barcode] Not a valid 13-digit EAN: ${barcodeNumber}`);
      barcodeNumber = ''; // Discard non-EAN
    }

    return NextResponse.json({
      success: true,
      data: {
        productName: normalizeOcrText(parsed.productName || ''),
        volume: parsed.volume || '',
        volumeUnit: parsed.volumeUnit || 'ml',
        barcodeNumber,
        barcodeValid,
        intendedUse: normalizeOcrText(parsed.intendedUse || ''),
        ingredients: normalizeOcrText(parsed.ingredients || ''),
        confidence: parsed.confidence || 'medium',
      },
      usage: response.usage,
    });
  } catch (error: unknown) {
    console.error('Label extraction error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Lỗi trích xuất nhãn: ${message}` },
      { status: 500 },
    );
  }
}
