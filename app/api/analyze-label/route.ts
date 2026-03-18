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
  if (p.barcodeBase64) imageList.push('📸 Ảnh 3: MÃ VẠCH GỐC — kiểm tra chất lượng in, tương phản, kích thước');
  if (p.logoBase64) imageList.push(`📸 Ảnh ${imageList.length + 1}: LOGO THƯƠNG HIỆU GỐC của brand "${p.brandName}" — so sánh với logo trên nhãn`);

  contextText += `
📋 CÁC HÌNH ẢNH ĐƯỢC CUNG CẤP:
${imageList.join('\n')}

⚠️ QUAN TRỌNG:
- Kiểm tra TẤT CẢ các mục bắt buộc theo loại nhãn ${p.labelType}
${p.hscbBase64 ? '- ĐỐI CHIẾU thông tin trên nhãn với HSCB: tên sản phẩm, thành phần, công ty, ngày SX/HSD phải KHỚP' : ''}
${p.barcodeBase64 ? '- Kiểm tra mã vạch: độ tương phản, kích thước, vùng trống (quiet zone)' : ''}
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
      text: '🔍 ĐÂY LÀ ẢNH MÃ VẠCH GỐC (BARCODE). Bạn TUYỆT ĐỐI KHÔNG ĐƯỢC tự động cho rằng nó giống mã vạch trên nhãn. Hãy đọc từng số trên ảnh này, sau đó đọc từng số trên Ảnh Nhãn phía trên, và so sánh. Nếu khác nhau dù 1 chữ số, PHẢI báo lỗi!',
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
