/**
 * Client-side barcode scanner using ZXing library
 * Decodes EAN/UPC barcodes from uploaded images
 */

import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

let readerInstance: BrowserMultiFormatReader | null = null;

function getReader(): BrowserMultiFormatReader {
  if (!readerInstance) {
    readerInstance = new BrowserMultiFormatReader();
  }
  return readerInstance;
}

/**
 * Decode barcode from an image File (PNG, JPG, etc.)
 * Returns the barcode number string, or null if not detected
 */
export async function decodeBarcodeFromFile(file: File): Promise<string | null> {
  try {
    // Create object URL for the file
    const url = URL.createObjectURL(file);

    try {
      // Create an image element
      const img = document.createElement('img');
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = url;
      });

      // Decode barcode from the image
      const reader = getReader();
      const result = await reader.decodeFromImageElement(img);
      return result.getText();
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    if (error instanceof NotFoundException) {
      // No barcode found in the image
      return null;
    }
    console.warn('Barcode scan error:', error);
    return null;
  }
}

/**
 * Decode barcode from a base64 data URL string
 */
export async function decodeBarcodeFromDataUrl(dataUrl: string): Promise<string | null> {
  try {
    const img = document.createElement('img');
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = dataUrl;
    });

    const reader = getReader();
    const result = await reader.decodeFromImageElement(img);
    return result.getText();
  } catch (error) {
    if (error instanceof NotFoundException) {
      return null;
    }
    console.warn('Barcode scan error:', error);
    return null;
  }
}
