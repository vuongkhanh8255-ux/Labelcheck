import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getSystemPrompt } from '@/lib/label-guidelines';

// Force this route to be dynamic (no SSG)
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for OpenAI



function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('CRITICAL: process.env.OPENAI_API_KEY is missing or empty. Please check Vercel environment variables.');
    throw new Error('Hệ thống thiếu cấu hình API Key (OPENAI_API_KEY). Vui lòng cấu hình biến môi trường trên Vercel.');
  }

  return new OpenAI({
    apiKey,
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const labelFile = formData.get('labelFile') as File | null;
    const hscbFile = formData.get('hscbFile') as File | null;
    const barcodeFile = formData.get('barcodeFile') as File | null;
    const productName = formData.get('productName') as string;
    const brandName = formData.get('brandName') as string;
    const volume = formData.get('volume') as string;
    const labelType = formData.get('labelType') as '>20ml' | '<20ml';
    const brandInfo = formData.get('brandInfo') as string;
    const barcodeRef = (formData.get('barcodeRef') as string) || ''; // Số mã vạch gốc (quét tự động hoặc nhập tay)
    const labelBarcodeScanned = (formData.get('labelBarcodeScanned') as string) || ''; // Số mã vạch quét từ nhãn bằng ZXing
    const labelProductName = (formData.get('labelProductName') as string) || ''; // Tên SP trích xuất từ nhãn bằng OCR
    const labelVolume = (formData.get('labelVolume') as string) || ''; // Dung tích trích xuất từ nhãn bằng OCR
    const labelIntendedUse = (formData.get('labelIntendedUse') as string) || ''; // Công dụng trích xuất từ nhãn
    const labelIngredients = (formData.get('labelIngredients') as string) || ''; // Thành phần trích xuất từ nhãn
    const hscbIntendedUse = (formData.get('hscbIntendedUse') as string) || ''; // Công dụng trích xuất từ HSCB
    const hscbIngredients = (formData.get('hscbIngredients') as string) || ''; // Thành phần trích xuất từ HSCB

    if (!labelFile) {
      return NextResponse.json(
        { error: 'File nhãn là bắt buộc' },
        { status: 400 }
      );
    }

    // Convert all files to base64 for GPT Vision
    const labelBase64 = await fileToBase64(labelFile);
    const hscbBase64 = hscbFile ? await fileToBase64(hscbFile) : null;
    const barcodeBase64 = barcodeFile ? await fileToBase64(barcodeFile) : null;

    // Fetch brand logo from URL if available
    let logoBase64: string | null = null;
    let logoMime: string | null = null;
    if (brandInfo) {
      try {
        const info = JSON.parse(brandInfo);
        if (info.logoUrl) {
          const logoRes = await fetch(info.logoUrl);
          const logoBuffer = await logoRes.arrayBuffer();
          logoBase64 = Buffer.from(logoBuffer).toString('base64');
          logoMime = logoRes.headers.get('content-type') || 'image/png';
        }
      } catch {
        // ignore logo fetch error
      }
    }

    // Build messages array
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: getSystemPrompt(labelType),
      },
      {
        role: 'user',
        content: buildUserContent({
          labelBase64,
          labelMime: labelFile.type,
          hscbBase64,
          hscbMime: hscbFile?.type || null,
          barcodeBase64,
          barcodeMime: barcodeFile?.type || null,
          logoBase64,
          logoMime,
          productName,
          brandName,
          volume,
          labelType,
          brandInfo,
          barcodeRef,
          labelBarcodeScanned,
          labelProductName,
          labelVolume,
          labelIntendedUse,
          labelIngredients,
          hscbIntendedUse,
          hscbIngredients,
        }),
      },
    ];

    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: 4096,
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

    // === BƯỚC 2: VERIFY các lỗi bằng câu hỏi CỤ THỂ ===
    // Lấy các item có status "error" liên quan đến đọc text (thành phần, công dụng, tên)
    const verifyIds = ['thanh_phan', 'cong_dung_san_pham', 'cong_dung', 'thanh_phan_doi_chieu_anh', 'cong_dung_doi_chieu_anh', 'ten_san_pham', 'ten_san_pham_doi_chieu_anh'];
    const items: Array<{ id: string; field: string; expected: string; found: string; status: string; note: string }> = parsed.items || parsed.contentItems || [];
    const errorItems = items.filter((item: { id: string; status: string }) => item.status === 'error' && verifyIds.includes(item.id));

    if (errorItems.length > 0 && (labelBase64 || hscbBase64)) {
      // Build targeted verification questions
      const verifyQuestions = errorItems.map((item: { id: string; field: string; expected: string; found: string; note: string }, i: number) => {
        return `Lỗi ${i + 1} (${item.field}):
  - Lớp 1 nói QUY ĐỊNH: "${item.expected}"
  - Lớp 1 nói TÌM THẤY trên nhãn: "${item.found}"
  - Lớp 1 kết luận: "${item.note}"
  → Hãy nhìn vào ẢNH NHÃN, tìm đúng phần text liên quan, đọc TỪNG CHỮ CÁI MỘT.
  → Nhãn thực sự ghi gì? Lỗi này có THẬT không?`;
      }).join('\n\n');

      const verifyParts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
        {
          type: 'text',
          text: `BẠN LÀ CHUYÊN GIA KIỂM ĐỊNH LẦN 2 — ĐỘC LẬP VỚI LẦN 1.

Lần kiểm tra thứ 1 đã tìm thấy ${errorItems.length} lỗi. Nhiệm vụ của bạn: XÁC MINH từng lỗi bằng cách nhìn TRỰC TIẾP vào ảnh nhãn.

🚨 CẢNH BÁO: Lần 1 thường mắc các lỗi OCR sau:
- "DIMETHYLIMIDAZOLIDINE" bị đọc thành "Dimethylhydantoin" → KIỂM TRA KỸ từng chữ cái!
- "TOCOPHERYL" bị đọc thành "Tocopherol" → KHÁC NHAU! Kiểm tra nhãn ghi gì!
- "DMDM" bị đọc thành "Dimethyl" → KHÁC NHAU!
- Từ "da" bị bỏ sót trong "tế bào da chết"
- KHÔNG auto-correct tên hóa chất — đọc CHÍNH XÁC từng chữ cái trên nhãn.

${verifyQuestions}

Trả về JSON thuần:
{
  "verifications": [
    {
      "errorIndex": 0,
      "itemId": "id của item",
      "actualTextOnLabel": "text THỰC SỰ đọc được từ ảnh nhãn",
      "isRealError": true/false,
      "reason": "giải thích tại sao đây là lỗi thật hoặc lỗi giả (OCR sai)"
    }
  ]
}`,
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:${labelFile.type};base64,${labelBase64}`,
            detail: 'high',
          },
        },
      ];

      // Add HSCB image if available for cross-reference
      if (hscbBase64 && hscbFile) {
        verifyParts.push({
          type: 'text',
          text: '📄 ẢNH HSCB để đối chiếu:',
        });
        verifyParts.push({
          type: 'image_url',
          image_url: {
            url: `data:${hscbFile.type};base64,${hscbBase64}`,
            detail: 'high',
          },
        });
      }

      try {
        const verifyResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'user', content: verifyParts },
          ],
          max_tokens: 2048,
          temperature: 0.1,
          response_format: { type: 'json_object' },
        });

        const verifyContent = verifyResponse.choices[0]?.message?.content;
        if (verifyContent) {
          try {
            const verifyParsed = JSON.parse(verifyContent);
            const verifications = verifyParsed.verifications || [];

            // Update items: if verification says error is FALSE → change to "ok"
            for (const v of verifications) {
              if (!v.isRealError) {
                const idx = items.findIndex((item: { id: string }) => item.id === (v.itemId || errorItems[v.errorIndex]?.id));
                if (idx >= 0) {
                  items[idx].status = 'ok';
                  items[idx].note = `✅ Đã xác minh lần 2: ${v.reason}. Text thực tế trên nhãn: "${v.actualTextOnLabel}"`;
                }
              } else {
                // Confirmed real error — update with verified text
                const idx = items.findIndex((item: { id: string }) => item.id === (v.itemId || errorItems[v.errorIndex]?.id));
                if (idx >= 0 && v.actualTextOnLabel) {
                  items[idx].found = v.actualTextOnLabel;
                  items[idx].note = `🔍 Xác minh lần 2: ${v.reason}`;
                }
              }
            }

            // Recalculate overallStatus
            const hasError = items.some((item: { status: string }) => item.status === 'error');
            if (parsed.overallStatus) {
              parsed.overallStatus = hasError ? 'fail' : 'pass';
            }
          } catch {
            console.warn('Verify parse failed, keeping original results');
          }
        }
      } catch (err) {
        console.warn('Verification step failed, keeping original results:', err);
      }
    }

    return NextResponse.json({
      success: true,
      result: parsed,
      usage: response.usage,
    });

  } catch (error: unknown) {
    console.error('Label analysis error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Lỗi phân tích: ${message}` },
      { status: 500 },
    );
  }
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

interface ContentParams {
  labelBase64: string;
  labelMime: string;
  hscbBase64: string | null;
  hscbMime: string | null;
  barcodeBase64: string | null;
  barcodeMime: string | null;
  logoBase64: string | null;
  logoMime: string | null;
  productName: string;
  brandName: string;
  volume: string;
  labelType: '>20ml' | '<20ml';
  brandInfo: string;
  barcodeRef: string; // Số mã vạch gốc (quét từ file hoặc nhập tay)
  labelBarcodeScanned: string; // Số mã vạch quét từ nhãn bằng ZXing
  labelProductName: string; // Tên SP trích xuất từ nhãn bằng OCR riêng
  labelVolume: string; // Dung tích trích xuất từ nhãn bằng OCR riêng
  labelIntendedUse: string; // Công dụng trích xuất từ nhãn
  labelIngredients: string; // Thành phần trích xuất từ nhãn
  hscbIntendedUse: string; // Công dụng trích xuất từ HSCB
  hscbIngredients: string; // Thành phần trích xuất từ HSCB
}

function buildUserContent(p: ContentParams): OpenAI.Chat.Completions.ChatCompletionContentPart[] {
  const parts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

  // Context text
  let contextText = `Hãy kiểm tra nhãn sản phẩm mỹ phẩm sau đây:

📦 Thông tin sản phẩm:
- Tên sản phẩm: ${p.productName}
- Thương hiệu: ${p.brandName}
- Dung tích/Khối lượng: ${p.volume}
- Loại nhãn: ${p.labelType === '>20ml' ? 'Nhãn đầy đủ (≥20ml/20g)' : 'Nhãn tinh gọn (<20ml/20g)'}

🚨 SO SÁNH BẮT BUỘC — ĐỌC KỸ TRƯỚC KHI PHÂN TÍCH:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
① TÊN SẢN PHẨM — VÒNG 1: SO SÁNH VĂN BẢN VỚI VĂN BẢN (item id: "ten_san_pham"):
   Tên trên HSCB (người dùng nhập, tin 100%):
   "${p.productName}"
${p.labelProductName ? `   Tên trên nhãn (đã trích xuất bằng OCR riêng, tin 100%):
   "${p.labelProductName}"
   → KHÔNG đọc lại tên từ ảnh nhãn. Sử dụng CHÍNH XÁC hai chuỗi văn bản trên để so sánh.
   → So sánh TỪNG KÝ TỰ, kể cả dấu câu (dấu phẩy, dấu gạch ngang, dấu chấm, khoảng trắng).
   → Bất kỳ khác biệt nào (thiếu/thêm/sai ký tự hoặc dấu câu) → status = "error" ngay lập tức.
   → KHÔNG ĐƯỢC suy diễn "ý nghĩa giống nhau là được".` : `   → Chưa trích xuất được tên từ nhãn bằng OCR. Hãy đọc tên từ ảnh nhãn → So sánh TỪNG KÝ TỰ với chuỗi HSCB trên.
   → Nếu nhãn thiếu/thêm/sai bất kỳ ký tự hoặc dấu câu nào → status = "error" ngay lập tức.
   → KHÔNG ĐƯỢC suy diễn "ý nghĩa giống nhau là được".`}

①bis TÊN SẢN PHẨM — VÒNG 2: ĐỐI CHIẾU TRỰC TIẾP TỪ ẢNH NHÃN (item id: "ten_san_pham_doi_chieu_anh"):
   🚨 HOÀN TOÀN ĐỘC LẬP — QUÊN HẾT kết quả vòng 1, QUÊN HẾT text OCR ở trên.
   → Nhìn trực tiếp vào ẢNH NHÃN SẢN PHẨM (Ảnh 1).
   → Đọc TỪNG TỪ MỘT tất cả các dòng chữ tạo thành tên sản phẩm.
   → Ghép tất cả thành một chuỗi đầy đủ.
   → So sánh TỪNG TỪ với tên HSCB: "${p.productName}"
   → CHỈ báo "error" khi CHẮC CHẮN 100% có từ/ký tự thực sự KHÁC NHAU.
   → Nếu không chắc chắn → status = "ok" (thà bỏ sót còn hơn bịa lỗi).
   → Trong field "found": ghi CHÍNH XÁC chuỗi tên đọc được từ ảnh.
   → Trong field "expected": ghi tên từ HSCB.
${p.labelVolume ? `
① bis. DUNG TÍCH/KHỐI LƯỢNG — SO SÁNH VĂN BẢN VỚI VĂN BẢN:
   Dung tích trên HSCB: "${p.volume}"
   Dung tích trên nhãn (đã trích xuất bằng OCR riêng): "${p.labelVolume}"
   → So sánh hai giá trị trên. Nếu khác → status = "error".` : ''}
${p.barcodeRef ? `
② SỐ MÃ VẠCH GỐC (quét tự động từ file barcode, tin 100%):
   "${p.barcodeRef}"` : ''}
${p.labelBarcodeScanned ? `
③ SỐ MÃ VẠCH TRÊN NHÃN (quét tự động bằng barcode scanner, tin 100%):
   "${p.labelBarcodeScanned}"` : ''}
${p.barcodeRef && p.labelBarcodeScanned ? `
🔍 KẾT QUẢ SO KHỚP (đã xác minh bằng phần mềm):
   → Nhãn: "${p.labelBarcodeScanned}" vs Gốc: "${p.barcodeRef}"
   → ${p.labelBarcodeScanned === p.barcodeRef ? 'KHỚP ✓ → numberMatch = "ok"' : 'KHÔNG KHỚP ✗ → numberMatch = "error" — BẮT BUỘC'}
   → Sử dụng CHÍNH XÁC hai số trên cho labelBarcodeNumber và uploadedBarcodeNumber. KHÔNG ĐỌC LẠI TỪ ẢNH.` : ''}
${p.barcodeRef && !p.labelBarcodeScanned ? `
⚠️ BARCODE NHÃN KHÔNG QUÉT ĐƯỢC:
   → Phần mềm KHÔNG quét được barcode từ nhãn.
   → BẠN PHẢI đọc CÁC SỐ IN BÊN DƯỚI các vạch barcode trên nhãn (ảnh 1). Đây là dãy 13 chữ số (EAN-13) in rõ ràng bên dưới các vạch đen trắng.
   → TUYỆT ĐỐI KHÔNG copy/lặp lại số barcode gốc "${p.barcodeRef}".
   → TUYỆT ĐỐI KHÔNG đoán hoặc bịa số. Chỉ ghi số bạn thực sự nhìn thấy in trên nhãn.
   → Nếu không nhìn rõ số trên nhãn → ghi labelBarcodeNumber = "KHÔNG ĐỌC ĐƯỢC" và numberMatch = "error", numberNote = "Không đọc được số mã vạch trên nhãn"
   → Nếu đọc được số → so sánh với "${p.barcodeRef}". Khác dù 1 chữ số → numberMatch = "error".` : ''}
${p.hscbIntendedUse || p.labelIntendedUse ? `
④ CÔNG DỤNG — VÒNG 1: SO SÁNH VĂN BẢN VỚI VĂN BẢN (item id: "cong_dung_san_pham"):
${p.hscbIntendedUse ? `   Công dụng trên HSCB (đã trích xuất bằng OCR, tin 100%):
   "${p.hscbIntendedUse}"` : '   Công dụng trên HSCB: chưa trích xuất được — đọc từ ảnh HSCB'}
${p.labelIntendedUse ? `   Công dụng trên nhãn (đã trích xuất bằng OCR, tin 100%):
   "${p.labelIntendedUse}"
   → KHÔNG đọc lại từ ảnh. Sử dụng CHÍNH XÁC hai chuỗi văn bản trên để so sánh.` : '   Công dụng trên nhãn: chưa trích xuất được — đọc từ ảnh nhãn'}
   → So sánh TỪNG KÝ TỰ. Nhãn có thêm/bớt/sai nội dung so với HSCB → status = "error".

④bis CÔNG DỤNG — VÒNG 2: ĐỐI CHIẾU TRỰC TIẾP TỪ ẢNH (item id: "cong_dung_doi_chieu_anh"):
   🚨 HOÀN TOÀN ĐỘC LẬP — QUÊN HẾT kết quả vòng 1, QUÊN HẾT text OCR ở trên.
   → Nhìn trực tiếp vào ẢNH NHÃN (Ảnh 1) → tìm "Công dụng:" → đọc TỪNG TỪ MỘT.
   → Nhìn trực tiếp vào ẢNH HSCB (Ảnh 2) → tìm "3. Mục đích sử dụng" → đọc TỪNG TỪ MỘT.

   🚨 LỖI BẠN HAY MẮC — CẢNH BÁO:
   - KHÔNG ĐƯỢC bỏ chữ "da" (skin) khi đọc. VD:
     ❌ "Tẩy tế bào chết" → SAI, thiếu "da"
     ✅ "Tẩy tế bào da chết" → ĐÚNG
     ❌ "dưỡng ẩm mịn" → SAI, thiếu "da"
     ✅ "dưỡng da ẩm mịn" → ĐÚNG
   - Đếm số lần "da" xuất hiện trong ảnh nhãn → kết quả phải có SỐ LƯỢNG "da" BẰNG NHAU.

   → So sánh TỪNG TỪ giữa nhãn và HSCB. Nếu GIỐNG NHAU → status = "ok".
   → CHỈ báo "error" khi CHẮC CHẮN 100% có từ thực sự KHÁC NHAU giữa 2 ảnh.
   → Nếu không chắc chắn → status = "ok".
   → Trong field "found": ghi CHÍNH XÁC công dụng đọc được từ ảnh nhãn.
   → Trong field "expected": ghi công dụng đọc được từ ảnh HSCB.` : ''}
${p.hscbIngredients || p.labelIngredients ? `
⑤ THÀNH PHẦN — VÒNG 1: SO SÁNH VĂN BẢN VỚI VĂN BẢN (item id: "thanh_phan"):
${p.hscbIngredients ? `   Thành phần trên HSCB (đã trích xuất bằng OCR, tin 100%):
   "${p.hscbIngredients}"` : '   Thành phần trên HSCB: chưa trích xuất được — đọc từ ảnh HSCB'}
${p.labelIngredients ? `   Thành phần trên nhãn (đã trích xuất bằng OCR, tin 100%):
   "${p.labelIngredients}"
   → KHÔNG đọc lại từ ảnh. Sử dụng CHÍNH XÁC hai chuỗi văn bản trên để so sánh.` : '   Thành phần trên nhãn: chưa trích xuất được — đọc từ ảnh nhãn'}
   → So sánh TỪNG thành phần. Thiếu/thừa/sai tên thành phần → status = "error".
   → Thứ tự phải GIỐNG NHAU. Sai thứ tự → status = "warning".

⑤bis THÀNH PHẦN — VÒNG 2: XÁC MINH TỪ ẢNH (item id: "thanh_phan_doi_chieu_anh"):
   🚨 PHƯƠNG PHÁP KHÁC VÒNG 1 — DÙNG HSCB LÀM CHUẨN ĐỂ VERIFY:
   → Lấy danh sách thành phần từ HSCB (ảnh 2, bảng mục 11) làm DANH SÁCH GỐC.
   → Với TỪNG thành phần trong danh sách gốc, zoom vào ẢNH NHÃN (Ảnh 1) kiểm tra:
     "Thành phần X có xuất hiện trên nhãn không? Có viết đúng tên không?"
   → ĐẶC BIỆT CHÚ Ý: KHÔNG auto-correct tên INCI.
     - "TOCOPHERYL" ≠ "Tocopherol" (khác nhau!)
     - "DMDM" ≠ "Dimethyl" (khác nhau!)
     - "Glyceryl" ≠ "Glycerol" (khác nhau!)
     - Nếu nhãn in "TOCOPHERYL" và HSCB ghi "Tocopheryl" → GIỐNG NHAU (chỉ khác hoa/thường)
   → CHỈ báo "error" khi thành phần THỰC SỰ bị thiếu hoặc tên THỰC SỰ khác (không phải khác hoa/thường).
   → Nếu không chắc chắn → status = "ok".
   → Trong field "found": ghi danh sách thành phần đọc được từ ảnh nhãn.
   → Trong field "expected": ghi danh sách thành phần đọc được từ ảnh HSCB.
   → Mục đích: Xác nhận kết quả OCR vòng 1, phát hiện lỗi OCR bỏ sót.` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  if (p.brandInfo) {
    try {
      const info = JSON.parse(p.brandInfo);
      contextText += `
🏢 Thông tin Brand đã đăng ký:
- Công ty: ${info.registeredCompanyName || 'N/A'}
- Địa chỉ: ${info.address || 'N/A'}
- SĐT: ${info.phone || 'N/A'}
- Website: ${info.website || 'N/A'}
`;
    } catch {
      // ignore parse error
    }
  }

  // Describe what images are provided
  const imageList = ['📸 Ảnh 1: NHÃN SẢN PHẨM (bắt buộc kiểm tra)'];
  if (p.hscbBase64) imageList.push('📸 Ảnh 2: HỒ SƠ CÔNG BỐ (HSCB) — đối chiếu thông tin với nhãn');
  if (p.barcodeBase64) imageList.push('📸 Ảnh 3: MÃ VẠCH GỐC — kiểm tra chất lượng in, tương phản, kích thước (KHÔNG dùng để đọc số — số tham chiếu đã có ở trên)');
  if (p.logoBase64) imageList.push(`📸 Ảnh ${imageList.length + 1}: LOGO THƯƠNG HIỆU GỐC của brand "${p.brandName}" — so sánh với logo trên nhãn`);

  contextText += `
📋 CÁC HÌNH ẢNH ĐƯỢC CUNG CẤP:
${imageList.join('\n')}

⚠️ QUAN TRỌNG:
- Kiểm tra TẤT CẢ các mục bắt buộc theo loại nhãn ${p.labelType}
${p.hscbBase64 ? '- ĐỐI CHIẾU thông tin trên nhãn với HSCB: tên sản phẩm, thành phần, công ty, ngày SX/HSD phải KHỚP' : ''}
${p.barcodeBase64 ? '- File mã vạch gốc được cung cấp để kiểm tra chất lượng in (màu sắc, kích thước, quiet zone). Số tham chiếu đã nhập ở trên.' : ''}
${p.barcodeRef ? `- 🔢 Số barcode tham chiếu: "${p.barcodeRef}" — đọc số từ nhãn, so sánh với số này từng chữ số.` : ''}
${p.logoBase64 ? `- 🚨 KIỂM TRA LOGO: So sánh logo trên nhãn với LOGO GỐC của brand "${p.brandName}" (ảnh cuối cùng được cung cấp). Nếu logo trên nhãn KHÁC hoặc KHÔNG PHẢI logo của brand này → status = "warning" cho mục "logo_brand". Nếu không nhìn thấy logo brand trên nhãn → status = "warning".` : ''}
- Trả kết quả JSON theo format đã quy định trong system prompt.
`;

  parts.push({
    type: 'text',
    text: contextText,
  });

  // 1. Label Image
  parts.push({
    type: 'text',
    text: '📸 ĐÂY LÀ ẢNH CHỤP NHÃN SẢN PHẨM (Dùng để lấy mọi thông tin):',
  });
  parts.push({
    type: 'image_url',
    image_url: {
      url: `data:${p.labelMime};base64,${p.labelBase64}`,
      detail: 'high',
    },
  });

  // 2. HSCB Option
  if (p.hscbBase64 && p.hscbMime) {
    parts.push({
      type: 'text',
      text: '📄 ĐÂY LÀ HỒ SƠ CÔNG BỐ (HSCB). Bạn PHẢI đối chiếu Tên Sản Phẩm, Thành phần, Số công bố, và Công dụng từ ảnh nhãn với ảnh HSCB này. Nếu sai lệch 1 chữ cũng phải báo lỗi.',
    });
    parts.push({
      type: 'image_url',
      image_url: {
        url: `data:${p.hscbMime};base64,${p.hscbBase64}`,
        detail: 'high',
      },
    });
  }

  // 3. Barcode Option
  if (p.barcodeBase64 && p.barcodeMime) {
    parts.push({
      type: 'text',
      text: `🔍 ĐÂY LÀ ẢNH MÃ VẠCH GỐC (BARCODE). Dùng ảnh này CHỈ để kiểm tra chất lượng in (màu sắc, kích thước, quiet zone). ${p.barcodeRef ? `Số tham chiếu đã được cung cấp là "${p.barcodeRef}" — KHÔNG đọc số từ ảnh này để so sánh.` : 'Hãy đọc số từ ảnh này nếu không có số tham chiếu.'}`,
    });
    parts.push({
      type: 'image_url',
      image_url: {
        url: `data:${p.barcodeMime};base64,${p.barcodeBase64}`,
        detail: 'high',
      },
    });
  }

  // 4. Brand Logo (for comparison)
  if (p.logoBase64 && p.logoMime) {
    parts.push({
      type: 'text',
      text: `🏷️ ĐÂY LÀ LOGO GỐC CỦA THƯƠNG HIỆU "${p.brandName}". Hãy so sánh logo này với logo xuất hiện trên nhãn sản phẩm (Ảnh 1). Nếu logo trên nhãn KHÁC logo gốc này (khác hình dạng, khác chữ, hoặc là logo của brand khác) → ghi status = "warning" cho item "logo_brand" và giải thích cụ thể điểm khác biệt.`,
    });
    parts.push({
      type: 'image_url',
      image_url: {
        url: `data:${p.logoMime};base64,${p.logoBase64}`,
        detail: 'high',
      },
    });
  }

  return parts;
}
