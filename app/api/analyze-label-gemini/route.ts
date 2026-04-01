import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getSystemPrompt } from '@/lib/label-guidelines';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('CRITICAL: process.env.GEMINI_API_KEY is missing.');
    throw new Error('Hệ thống thiếu cấu hình API Key (GEMINI_API_KEY). Vui lòng cấu hình biến môi trường.');
  }
  return new GoogleGenAI({ apiKey });
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
  barcodeRef: string;
  labelBarcodeScanned: string;
  labelProductName: string;
  labelVolume: string;
  labelIntendedUse: string;
  labelIngredients: string;
  hscbIntendedUse: string;
  hscbIngredients: string;
}

function buildContextText(p: ContentParams): string {
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
   → So sánh TỪNG TỪ giữa nhãn và HSCB. Nếu GIỐNG NHAU → status = "ok".
   → CHỈ báo "error" khi CHẮC CHẮN 100% có từ thực sự KHÁC NHAU giữa 2 ảnh.
   → Nếu không chắc chắn → status = "ok".` : ''}
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
   → Với TỪNG thành phần trong danh sách gốc, zoom vào ẢNH NHÃN (Ảnh 1) kiểm tra.
   → CHỈ báo "error" khi thành phần THỰC SỰ bị thiếu hoặc tên THỰC SỰ khác.
   → Nếu không chắc chắn → status = "ok".` : ''}
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

  const imageList = ['📸 Ảnh 1: NHÃN SẢN PHẨM (bắt buộc kiểm tra)'];
  if (p.hscbBase64) imageList.push('📸 Ảnh 2: HỒ SƠ CÔNG BỐ (HSCB) — đối chiếu thông tin với nhãn');
  if (p.barcodeBase64) imageList.push('📸 Ảnh 3: MÃ VẠCH GỐC — kiểm tra chất lượng in');
  if (p.logoBase64) imageList.push(`📸 Ảnh ${imageList.length + 1}: LOGO THƯƠNG HIỆU GỐC`);

  contextText += `
📋 CÁC HÌNH ẢNH ĐƯỢC CUNG CẤP:
${imageList.join('\n')}

⚠️ QUAN TRỌNG:
- Kiểm tra TẤT CẢ các mục bắt buộc theo loại nhãn ${p.labelType}
${p.hscbBase64 ? '- ĐỐI CHIẾU thông tin trên nhãn với HSCB' : ''}
${p.barcodeBase64 ? '- File mã vạch gốc được cung cấp để kiểm tra chất lượng in.' : ''}
${p.barcodeRef ? `- 🔢 Số barcode tham chiếu: "${p.barcodeRef}"` : ''}
${p.logoBase64 ? `- 🚨 KIỂM TRA LOGO: So sánh logo trên nhãn với LOGO GỐC của brand "${p.brandName}".` : ''}
- Trả kết quả JSON theo format đã quy định trong system prompt.
`;

  return contextText;
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
    const barcodeRef = (formData.get('barcodeRef') as string) || '';
    const labelBarcodeScanned = (formData.get('labelBarcodeScanned') as string) || '';
    const labelProductName = (formData.get('labelProductName') as string) || '';
    const labelVolume = (formData.get('labelVolume') as string) || '';
    const labelIntendedUse = (formData.get('labelIntendedUse') as string) || '';
    const labelIngredients = (formData.get('labelIngredients') as string) || '';
    const hscbIntendedUse = (formData.get('hscbIntendedUse') as string) || '';
    const hscbIngredients = (formData.get('hscbIngredients') as string) || '';

    if (!labelFile) {
      return NextResponse.json({ error: 'File nhãn là bắt buộc' }, { status: 400 });
    }

    // Convert files to base64
    const labelBase64 = await fileToBase64(labelFile);
    const hscbBase64 = hscbFile ? await fileToBase64(hscbFile) : null;
    const barcodeBase64 = barcodeFile ? await fileToBase64(barcodeFile) : null;

    // Fetch brand logo
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
        // ignore
      }
    }

    const params: ContentParams = {
      labelBase64, labelMime: labelFile.type,
      hscbBase64, hscbMime: hscbFile?.type || null,
      barcodeBase64, barcodeMime: barcodeFile?.type || null,
      logoBase64, logoMime,
      productName, brandName, volume, labelType, brandInfo,
      barcodeRef, labelBarcodeScanned,
      labelProductName, labelVolume,
      labelIntendedUse, labelIngredients,
      hscbIntendedUse, hscbIngredients,
    };

    // Build Gemini content parts
    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    // System prompt + context text
    parts.push({ text: getSystemPrompt(labelType) + '\n\n' + buildContextText(params) });

    // Label image
    parts.push({ text: '📸 ĐÂY LÀ ẢNH CHỤP NHÃN SẢN PHẨM:' });
    parts.push({ inlineData: { mimeType: labelFile.type, data: labelBase64 } });

    // HSCB image
    if (hscbBase64 && hscbFile) {
      parts.push({ text: '📄 ĐÂY LÀ HỒ SƠ CÔNG BỐ (HSCB). Đối chiếu Tên SP, Thành phần, Số công bố, Công dụng từ nhãn với HSCB.' });
      parts.push({ inlineData: { mimeType: hscbFile.type, data: hscbBase64 } });
    }

    // Barcode image
    if (barcodeBase64 && barcodeFile) {
      parts.push({ text: `🔍 ĐÂY LÀ ẢNH MÃ VẠCH GỐC. ${barcodeRef ? `Số tham chiếu: "${barcodeRef}"` : ''}` });
      parts.push({ inlineData: { mimeType: barcodeFile.type, data: barcodeBase64 } });
    }

    // Logo image
    if (logoBase64 && logoMime) {
      parts.push({ text: `🏷️ ĐÂY LÀ LOGO GỐC CỦA THƯƠNG HIỆU "${brandName}". So sánh với logo trên nhãn.` });
      parts.push({ inlineData: { mimeType: logoMime, data: logoBase64 } });
    }

    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro-preview-05-06',
      contents: [{ role: 'user', parts }],
      config: {
        temperature: 0.1,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    });

    const content = response.text;
    if (!content) {
      return NextResponse.json({ error: 'Không nhận được phản hồi từ Gemini' }, { status: 500 });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: 'Gemini trả về format không hợp lệ', raw: content }, { status: 500 });
    }

    // === BƯỚC 2: VERIFY các lỗi bằng câu hỏi CỤ THỂ (giống GPT) ===
    const verifyIds = ['thanh_phan', 'cong_dung_san_pham', 'cong_dung', 'thanh_phan_doi_chieu_anh', 'cong_dung_doi_chieu_anh', 'ten_san_pham', 'ten_san_pham_doi_chieu_anh'];
    const items: Array<{ id: string; field: string; expected: string; found: string; status: string; note: string }> = parsed.items || parsed.contentItems || [];
    const errorItems = items.filter((item) => item.status === 'error' && verifyIds.includes(item.id));

    if (errorItems.length > 0 && (labelBase64 || hscbBase64)) {
      const verifyQuestions = errorItems.map((item, i) => {
        return `Lỗi ${i + 1} (${item.field}):
  - Lớp 1 nói QUY ĐỊNH: "${item.expected}"
  - Lớp 1 nói TÌM THẤY trên nhãn: "${item.found}"
  - Lớp 1 kết luận: "${item.note}"
  → Hãy nhìn vào ẢNH NHÃN, tìm đúng phần text liên quan, đọc TỪNG CHỮ CÁI MỘT.
  → Nhãn thực sự ghi gì? Lỗi này có THẬT không?`;
      }).join('\n\n');

      const verifyParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
      verifyParts.push({
        text: `BẠN LÀ CHUYÊN GIA KIỂM ĐỊNH LẦN 2 — ĐỘC LẬP VỚI LẦN 1.

Lần kiểm tra thứ 1 đã tìm thấy ${errorItems.length} lỗi. Nhiệm vụ: XÁC MINH từng lỗi bằng cách nhìn TRỰC TIẾP vào ảnh nhãn.

${verifyQuestions}

Trả về JSON thuần:
{
  "verifications": [
    {
      "errorIndex": 0,
      "itemId": "id của item",
      "actualTextOnLabel": "text THỰC SỰ đọc được từ ảnh nhãn",
      "isRealError": true/false,
      "reason": "giải thích"
    }
  ]
}`,
      });
      verifyParts.push({ inlineData: { mimeType: labelFile.type, data: labelBase64 } });

      if (hscbBase64 && hscbFile) {
        verifyParts.push({ text: '📄 ẢNH HSCB để đối chiếu:' });
        verifyParts.push({ inlineData: { mimeType: hscbFile.type, data: hscbBase64 } });
      }

      try {
        const verifyResponse = await ai.models.generateContent({
          model: 'gemini-2.5-pro-preview-05-06',
          contents: [{ role: 'user', parts: verifyParts }],
          config: {
            temperature: 0.1,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json',
          },
        });

        const verifyContent = verifyResponse.text;
        if (verifyContent) {
          try {
            const verifyParsed = JSON.parse(verifyContent);
            const verifications = verifyParsed.verifications || [];

            for (const v of verifications) {
              if (!v.isRealError) {
                const idx = items.findIndex((item) => item.id === (v.itemId || errorItems[v.errorIndex]?.id));
                if (idx >= 0) {
                  items[idx].status = 'ok';
                  items[idx].note = `✅ Gemini xác minh lần 2: ${v.reason}. Text thực tế: "${v.actualTextOnLabel}"`;
                }
              } else {
                const idx = items.findIndex((item) => item.id === (v.itemId || errorItems[v.errorIndex]?.id));
                if (idx >= 0 && v.actualTextOnLabel) {
                  items[idx].found = v.actualTextOnLabel;
                  items[idx].note = `🔍 Gemini xác minh lần 2: ${v.reason}`;
                }
              }
            }

            const hasError = items.some((item) => item.status === 'error');
            if (parsed.overallStatus) {
              parsed.overallStatus = hasError ? 'fail' : 'pass';
            }
            if (parsed.summary) {
              parsed.summary.overallStatus = hasError ? 'fail' : 'pass';
              parsed.summary.totalErrors = items.filter(i => i.status === 'error').length;
              parsed.summary.totalOk = items.filter(i => i.status === 'ok').length;
              parsed.summary.totalWarnings = items.filter(i => i.status === 'warning').length;
            }
          } catch {
            console.warn('[Gemini] Verify parse failed, keeping original results');
          }
        }
      } catch (err) {
        console.warn('[Gemini] Verification step failed:', err);
      }
    }

    return NextResponse.json({
      success: true,
      result: parsed,
      model: 'gemini-2.5-pro',
      usage: response.usageMetadata || null,
    });
  } catch (error: unknown) {
    console.error('[Gemini] Label analysis error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Lỗi phân tích Gemini: ${message}` },
      { status: 500 },
    );
  }
}
