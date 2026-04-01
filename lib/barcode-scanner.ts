/**
 * Client-side barcode scanner
 * Priority: BarcodeDetector API (native, accurate) → ZXing (fallback)
 * Handles rotated barcodes (90°/180°/270°) common on product labels
 * Explicitly excludes QR codes
 */

import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';

// ─── BarcodeDetector API (Chrome/Edge native) ───────────────

interface BarcodeDetectorResult {
  rawValue: string;
  format: string;
}

declare class BarcodeDetector {
  constructor(options?: { formats: string[] });
  detect(source: ImageBitmapSource): Promise<BarcodeDetectorResult[]>;
  static getSupportedFormats(): Promise<string[]>;
}

function isBarcodeDetectorSupported(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

const EAN_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf'];

async function scanWithNativeAPI(source: ImageBitmapSource): Promise<string | null> {
  if (!isBarcodeDetectorSupported()) return null;
  try {
    const detector = new BarcodeDetector({ formats: EAN_FORMATS });
    const results = await detector.detect(source);
    const numericResult = results.find(r => /^\d+$/.test(r.rawValue));
    if (numericResult) {
      console.log('✅ [BarcodeDetector] Found:', numericResult.rawValue, '(format:', numericResult.format, ')');
      return numericResult.rawValue;
    }
  } catch (err) {
    console.warn('[BarcodeDetector] Error:', err);
  }
  return null;
}

// ─── Canvas rotation helpers ────────────────────────────────

function rotateCanvas(source: HTMLCanvasElement | ImageBitmap, degrees: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const w = source instanceof HTMLCanvasElement ? source.width : source.width;
  const h = source instanceof HTMLCanvasElement ? source.height : source.height;

  if (degrees === 90 || degrees === 270) {
    canvas.width = h;
    canvas.height = w;
  } else {
    canvas.width = w;
    canvas.height = h;
  }

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(source, -w / 2, -h / 2);
  return canvas;
}

function scaleUpCanvas(source: ImageBitmap, minDimension: number = 2000): HTMLCanvasElement {
  const scale = Math.max(1, Math.ceil(minDimension / Math.max(source.width, source.height)));
  const canvas = document.createElement('canvas');
  canvas.width = source.width * scale;
  canvas.height = source.height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// ─── ZXing fallback ─────────────────────────────────────────

let eanReaderInstance: BrowserMultiFormatReader | null = null;

function getEanReader(): BrowserMultiFormatReader {
  if (!eanReaderInstance) {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.ITF,
    ]);
    eanReaderInstance = new BrowserMultiFormatReader(hints);
  }
  return eanReaderInstance;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  const img = document.createElement('img');
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
  return img;
}

async function scanWithZXing(img: HTMLImageElement): Promise<string | null> {
  try {
    const reader = getEanReader();
    const result = await reader.decodeFromImageElement(img);
    const text = result.getText();
    if (text && /^\d+$/.test(text)) {
      console.log('✅ [ZXing] Found:', text);
      return text;
    }
  } catch {
    // not found
  }
  return null;
}

async function scanCanvasWithZXing(canvas: HTMLCanvasElement): Promise<string | null> {
  const dataUrl = canvas.toDataURL('image/png');
  const img = await loadImage(dataUrl);
  return scanWithZXing(img);
}

// ─── Multi-rotation scan ────────────────────────────────────

async function scanAllRotations(bitmap: ImageBitmap): Promise<string | null> {
  const rotations = [0, 90, 180, 270];
  const scaled = scaleUpCanvas(bitmap);

  for (const deg of rotations) {
    const rotated = deg === 0 ? scaled : rotateCanvas(scaled, deg);

    // Try native BarcodeDetector on rotated canvas
    if (isBarcodeDetectorSupported()) {
      try {
        const rotatedBitmap = await createImageBitmap(rotated);
        const result = await scanWithNativeAPI(rotatedBitmap);
        if (result) {
          console.log(`✅ Found barcode at ${deg}° rotation`);
          return result;
        }
      } catch { /* continue */ }
    }

    // Try ZXing on rotated canvas
    const zxResult = await scanCanvasWithZXing(rotated);
    if (zxResult) {
      console.log(`✅ [ZXing] Found barcode at ${deg}° rotation`);
      return zxResult;
    }
  }

  return null;
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Decode barcode from an image File (PNG, JPG, etc.)
 * Tries all 4 rotations (0°, 90°, 180°, 270°) with both BarcodeDetector and ZXing
 * Returns the barcode number string, or null if not detected
 */
export async function decodeBarcodeFromFile(file: File): Promise<string | null> {
  try {
    const blob = new Blob([await file.arrayBuffer()], { type: file.type });
    const bitmap = await createImageBitmap(blob);

    // Quick try: original orientation with native API
    if (isBarcodeDetectorSupported()) {
      const quickResult = await scanWithNativeAPI(bitmap);
      if (quickResult) return quickResult;
    }

    // Full scan: all rotations with both engines
    const result = await scanAllRotations(bitmap);
    if (result) return result;

    return null;
  } catch (error) {
    console.warn('Barcode scan error:', error);
    return null;
  }
}

/**
 * Decode barcode from a base64 data URL string
 */
export async function decodeBarcodeFromDataUrl(dataUrl: string): Promise<string | null> {
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);

    if (isBarcodeDetectorSupported()) {
      const quickResult = await scanWithNativeAPI(bitmap);
      if (quickResult) return quickResult;
    }

    return await scanAllRotations(bitmap);
  } catch (error) {
    console.warn('Barcode scan error:', error);
    return null;
  }
}
