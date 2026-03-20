/**
 * Client-side barcode scanner
 * Priority: BarcodeDetector API (native, accurate) → ZXing (fallback)
 * Explicitly excludes QR codes to avoid reading QR on labels
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

async function scanWithNativeAPI(imageBitmap: ImageBitmap): Promise<string | null> {
  if (!isBarcodeDetectorSupported()) return null;

  try {
    // First try EAN/UPC only
    const eanDetector = new BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf'],
    });
    const results = await eanDetector.detect(imageBitmap);
    // Filter for numeric barcodes only (skip QR codes etc.)
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

// ─── ZXing fallback ─────────────────────────────────────────

let eanReaderInstance: BrowserMultiFormatReader | null = null;

function getEanReader(): BrowserMultiFormatReader {
  if (!eanReaderInstance) {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF,
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
    const eanReader = getEanReader();
    const result = await eanReader.decodeFromImageElement(img);
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

// ─── Public API ─────────────────────────────────────────────

/**
 * Decode barcode from an image File (PNG, JPG, etc.)
 * Tries BarcodeDetector API first (native, more accurate), then ZXing fallback
 * Returns the barcode number string, or null if not detected
 */
export async function decodeBarcodeFromFile(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    // Step 1: Try native BarcodeDetector API (Chrome/Edge — most accurate)
    if (isBarcodeDetectorSupported()) {
      try {
        const blob = new Blob([await file.arrayBuffer()], { type: file.type });
        const bitmap = await createImageBitmap(blob);
        const nativeResult = await scanWithNativeAPI(bitmap);
        if (nativeResult) return nativeResult;

        // Try with enhanced contrast (scale up small barcodes)
        const canvas = document.createElement('canvas');
        const scale = Math.max(2, Math.ceil(2000 / Math.max(bitmap.width, bitmap.height)));
        canvas.width = bitmap.width * scale;
        canvas.height = bitmap.height * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          // Increase contrast
          ctx.filter = 'contrast(2) brightness(1.1)';
          ctx.drawImage(canvas, 0, 0);
          const enhancedBitmap = await createImageBitmap(canvas);
          const enhancedResult = await scanWithNativeAPI(enhancedBitmap);
          if (enhancedResult) return enhancedResult;
        }
      } catch (err) {
        console.warn('[BarcodeDetector] Failed, falling back to ZXing:', err);
      }
    }

    // Step 2: ZXing fallback
    const img = await loadImage(url);
    const zxingResult = await scanWithZXing(img);
    if (zxingResult) return zxingResult;

    return null;
  } catch (error) {
    console.warn('Barcode scan error:', error);
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Decode barcode from a base64 data URL string
 */
export async function decodeBarcodeFromDataUrl(dataUrl: string): Promise<string | null> {
  try {
    // Try native BarcodeDetector
    if (isBarcodeDetectorSupported()) {
      try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);
        const nativeResult = await scanWithNativeAPI(bitmap);
        if (nativeResult) return nativeResult;
      } catch {
        // fallback
      }
    }

    // ZXing fallback
    const img = await loadImage(dataUrl);
    return await scanWithZXing(img);
  } catch (error) {
    console.warn('Barcode scan error:', error);
    return null;
  }
}
