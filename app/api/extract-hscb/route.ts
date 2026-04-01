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

function normalizeOcrText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\s+([,.\;:!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    // Support multiple page images (hscbPages) or single file (hscbFile)
    const hscbPages = formData.getAll('hscbPages') as File[];
    const hscbFileSingle = formData.get('hscbFile') as File | null;
    const files = hscbPages.length > 0 ? hscbPages : (hscbFileSingle ? [hscbFileSingle] : []);

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'File HSCB là bắt buộc' },
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

    // Build image content parts - one per page
    const imageContentParts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
    imageContentParts.push({
      type: 'text',
      text: `Hãy đọc file HSCB (Hồ sơ công bố mỹ phẩm) gồm ${pagesBase64.length} trang dưới đây và trích xuất TẤT CẢ thông tin:
1. TÊN SẢN PHẨM: Đọc kỹ bảng ô vuông (grid) — mỗi ô là 1 ký tự, nối lại thành tên đầy đủ.
2. DUNG TÍCH/KHỐI LƯỢNG
3. CÔNG DỤNG: Tìm mục "3. Mục đích sử dụng"
4. THÀNH PHẦN: Tìm bảng "Danh sách thành phần đầy đủ" — đọc TẤT CẢ các thành phần trong bảng, kể cả trên nhiều trang. Đây là thông tin RẤT QUAN TRỌNG.

QUAN TRỌNG: Trả về ĐẦY ĐỦ tất cả 4 mục trên.`,
    });
    for (let i = 0; i < pagesBase64.length; i++) {
      imageContentParts.push({
        type: 'text',
        text: `📄 Trang ${i + 1}/${pagesBase64.length} của HSCB:`,
      });
      imageContentParts.push({
        type: 'image_url',
        image_url: {
          url: `data:${pagesBase64[i].mime};base64,${pagesBase64[i].base64}`,
          detail: 'high',
        },
      });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Bạn là trợ lý trích xuất thông tin từ Hồ sơ công bố mỹ phẩm (HSCB) Việt Nam.
Nhiệm vụ: Đọc TOÀN BỘ các trang HSCB và trích xuất TÊN SẢN PHẨM, DUNG TÍCH/KHỐI LƯỢNG, CÔNG DỤNG, và THÀNH PHẦN.

## HƯỚNG DẪN ĐỌC TÊN SẢN PHẨM — CỰC KỲ QUAN TRỌNG

Tên sản phẩm nằm ở mục "1.2. Tên sản phẩm (Product Name)" hoặc tương tự.

### BẢNG Ô VUÔNG (GRID):
- Tên sản phẩm thường được viết trong BẢNG Ô VUÔNG, mỗi ô chứa MỘT KÝ TỰ.
- Bạn PHẢI đọc TỪNG Ô từ trái sang phải, từ trên xuống dưới.
- ⚠️ DẤU CÂU: Mỗi ô có thể chứa dấu phẩy (,), dấu gạch ngang (-), dấu chấm (.), dấu ngoặc, hoặc khoảng trắng.
- 🚨 TUYỆT ĐỐI KHÔNG ĐƯỢC BỎ SÓT DẤU PHẨY (,) HOẶC DẤU GẠCH NGANG (-) TRONG Ô!

### QUY TRÌNH ĐỌC (BẮT BUỘC THEO TỪNG BƯỚC):
Bước 1: Đọc từng ô trong grid, ghi lại CHÍNH XÁC nội dung TỪNG Ô (bao gồm cả ô chứa dấu câu)
Bước 2: Nối tất cả các ô lại thành chuỗi
Bước 3: KIỂM TRA LẠI: Tìm mọi ô chứa dấu phẩy (,) — nếu bỏ sót dấu phẩy nào, bạn SẼ BỊ PHẠT NẶNG
Bước 4: KIỂM TRA LẠI: Tìm mọi ô chứa dấu gạch ngang (-) — nếu bỏ sót, bạn SẼ BỊ PHẠT NẶNG

### VÍ DỤ:
Grid:
|M|O|I|S|T|U|R|I|Z|I|N|G| |&| |P|R|O|T|E|C|T|I|N|G|
|H|A|I|R| |S|E|R|U|M| | |-| | |S|A|C|H|I| |O|I|L|,|
|A|R|G|A|N| |O|I|L|,| |E|H|M|C| | | | | | | | | | |
|S|E|R|U|M| |S|A|C|H|I|,| |D|Ầ|U| |A|R|G|A|N|,| | |
|E|H|M|C| |-| |D|Ư|Ỡ|N|G| |Ẩ|M|,| |B|Ả|O| |V|Ệ| |T|Ó|C|

→ Đọc: "MOISTURIZING & PROTECTING HAIR SERUM - SACHI OIL, ARGAN OIL, EHMC SERUM SACHI, DẦU ARGAN, EHMC - DƯỠNG ẨM, BẢO VỆ TÓC"

Chú ý: DẤU PHẨY sau "OIL", "SACHI", "ARGAN", "ẨM" — KHÔNG ĐƯỢC BỎ SÓT!

### GIỮA CÁC DÒNG GRID:
- Nếu có nhiều dòng, nối tất cả thành MỘT chuỗi liên tục
- Bỏ khoảng trắng thừa ở cuối dòng, giữ khoảng trắng giữa từ

## HƯỚNG DẪN ĐỌC DUNG TÍCH / KHỐI LƯỢNG:
- Tìm mục "1.3." hoặc phần ghi dung tích/khối lượng
- Trích xuất con số và đơn vị (ml, g, L, kg, v.v.)
- Ví dụ: "150 ml", "50 g" → volume = "150", volumeUnit = "ml"

## HƯỚNG DẪN ĐỌC CÔNG DỤNG (Intended Use):
- Tìm mục "3. Mục đích sử dụng (Intended use)" hoặc tương tự
- Đọc CHÍNH XÁC nội dung, giữ nguyên dấu câu (dấu phẩy, dấu chấm)
- VD: "Tẩy tế bào da chết, làm sạch da, sáng da, mờ vết thâm da và dưỡng da ẩm mịn."
- KHÔNG thêm hoặc bớt bất kỳ từ nào

## HƯỚNG DẪN ĐỌC THÀNH PHẦN (Ingredients) — RẤT QUAN TRỌNG:
- Tìm mục "Danh sách thành phần đầy đủ (Product full ingredient list)" hoặc bảng thành phần
- ⚠️ Bảng thành phần có thể TRẢI DÀI QUA NHIỀU TRANG — bạn PHẢI đọc TẤT CẢ các trang chứa bảng
- Đọc TẤT CẢ các thành phần trong danh sách, theo đúng thứ tự (từ No 1 đến hết)
- Giữ nguyên tên INCI (tên khoa học tiếng Anh) + tên thường trong ngoặc nếu có
- Cách nhau bởi dấu phẩy
- VD: "Sodium Chloride (Himalayan Pink Salt), Magnesium Sulfate (Epsom Salt), Zea Mays (Corn) Starch"
- KHÔNG ĐƯỢC bỏ sót bất kỳ thành phần nào, kể cả ở trang cuối
- 🚨 KHÔNG ĐƯỢC AUTO-CORRECT tên thành phần! Đọc ĐÚNG CHỮ IN trên tài liệu:
  ❌ "Tocopheryl" → đọc thành "Tocopherol" → SAI!
  ❌ "DMDM Hydantoin" → đọc thành "Dimethyl Hydantoin" → SAI!
  ❌ "Parkii" → đọc thành "Parkia" → SAI!
  → Giữ NGUYÊN 100% như văn bản gốc, KHÔNG sửa chính tả

## OUTPUT FORMAT:
Trả về JSON thuần (KHÔNG markdown, KHÔNG code block):
{
  "productName": "tên sản phẩm đầy đủ — BẮT BUỘC giữ nguyên MỌI dấu phẩy, gạch ngang, dấu chấm",
  "volume": "con số dung tích/khối lượng (VD: 150)",
  "volumeUnit": "đơn vị: ml hoặc g",
  "intendedUse": "công dụng/mục đích sử dụng đọc chính xác từ HSCB",
  "ingredients": "danh sách thành phần đầy đủ, cách nhau bởi dấu phẩy",
  "confidence": "high | medium | low",
  "rawGridReading": "ghi lại từng ký tự đọc được từ grid để kiểm chứng (debug)"
}

Nếu không tìm thấy thông tin nào, trả giá trị rỗng "" cho field đó.`,
        },
        {
          role: 'user',
          content: imageContentParts,
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

    return NextResponse.json({
      success: true,
      data: {
        productName: normalizeOcrText(parsed.productName || ''),
        volume: parsed.volume || '',
        volumeUnit: parsed.volumeUnit || 'ml',
        intendedUse: normalizeOcrText(parsed.intendedUse || ''),
        ingredients: normalizeOcrText(parsed.ingredients || ''),
        confidence: parsed.confidence || 'medium',
      },
      usage: response.usage,
    });
  } catch (error: unknown) {
    console.error('HSCB extraction error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Lỗi trích xuất HSCB: ${message}` },
      { status: 500 },
    );
  }
}
