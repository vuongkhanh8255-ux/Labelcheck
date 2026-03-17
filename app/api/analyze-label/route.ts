import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getSystemPrompt } from '@/lib/label-guidelines';

// Force this route to be dynamic (no SSG)
export const dynamic = 'force-dynamic';

function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
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

    // Convert files to base64 for GPT Vision
    const labelBase64 = await fileToBase64(labelFile);

    // Build messages array
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: getSystemPrompt(labelType),
      },
      {
        role: 'user',
        content: buildUserContent(
          labelBase64,
          labelFile.type,
          hscbFile,
          barcodeFile,
          productName,
          brandName,
          volume,
          labelType,
          brandInfo,
        ),
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

function buildUserContent(
  labelBase64: string,
  mimeType: string,
  hscbFile: File | null,
  barcodeFile: File | null,
  productName: string,
  brandName: string,
  volume: string,
  labelType: '>20ml' | '<20ml',
  brandInfo: string,
): OpenAI.Chat.Completions.ChatCompletionContentPart[] {
  const parts: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

  // Context text
  let contextText = `Hãy kiểm tra nhãn sản phẩm mỹ phẩm sau đây:

📦 Thông tin sản phẩm:
- Tên sản phẩm: ${productName}
- Thương hiệu: ${brandName}
- Dung tích/Khối lượng: ${volume}
- Loại nhãn: ${labelType === '>20ml' ? 'Nhãn đầy đủ (≥20ml/20g)' : 'Nhãn tinh gọn (<20ml/20g)'}
`;

  if (brandInfo) {
    try {
      const info = JSON.parse(brandInfo);
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

  contextText += `
📋 Hãy phân tích hình ảnh nhãn bên dưới và trả kết quả JSON theo format đã quy định trong system prompt.
Kiểm tra TẤT CẢ các mục bắt buộc theo loại nhãn ${labelType}.
`;

  parts.push({ type: 'text', text: contextText });

  // Label image (primary)
  parts.push({
    type: 'image_url',
    image_url: {
      url: `data:${mimeType};base64,${labelBase64}`,
      detail: 'high',
    },
  });

  return parts;
}
