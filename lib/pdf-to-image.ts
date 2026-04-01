/**
 * Client-side PDF to Image converter using pdfjs-dist
 * Renders the first page of a PDF as a PNG image
 * 
 * NOTE: pdfjs-dist can only run in browser (needs DOMMatrix, Canvas, etc.)
 * All imports are dynamic to avoid SSR issues.
 */

/**
 * Convert a PDF file to a PNG image (ALL pages, stitched vertically)
 * @param pdfFile - The PDF File object
 * @param scale - Render scale (2 = high quality, 1 = normal)
 * @returns A new File object containing the PNG image
 */
export async function pdfToImage(pdfFile: File, scale: number = 1.5): Promise<File> {
  // Dynamic import to avoid SSR (pdfjs-dist uses DOMMatrix which doesn't exist in Node.js)
  const pdfjsLib = await import('pdfjs-dist');

  // Set worker source to local file (copied from node_modules to public/)
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;

  // Render all pages into individual canvases
  const pageCanvases: HTMLCanvasElement[] = [];
  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Cannot create canvas context');

    await page.render({
      canvasContext: context,
      canvas,
      viewport,
    }).promise;

    pageCanvases.push(canvas);
  }

  // Stitch all pages vertically into one tall image
  const maxWidth = Math.max(...pageCanvases.map(c => c.width));
  const totalHeight = pageCanvases.reduce((sum, c) => sum + c.height, 0);

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = maxWidth;
  finalCanvas.height = totalHeight;

  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) throw new Error('Cannot create canvas context');

  let yOffset = 0;
  for (const pageCanvas of pageCanvases) {
    finalCtx.drawImage(pageCanvas, 0, yOffset);
    yOffset += pageCanvas.height;
  }

  // Convert canvas to blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    finalCanvas.toBlob(b => {
      if (b) resolve(b);
      else reject(new Error('Failed to convert canvas to blob'));
    }, 'image/png', 0.95);
  });

  // Create a new File from the blob
  const fileName = pdfFile.name.replace(/\.pdf$/i, '.png');
  return new File([blob], fileName, { type: 'image/png' });
}

/**
 * Check if a file is a PDF
 */
export function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Ensure a file is an image — if PDF, convert to image first
 */
export async function ensureImageFile(file: File): Promise<File> {
  if (isPdf(file)) {
    return pdfToImage(file);
  }
  return file;
}

/**
 * Convert a PDF file to multiple images (one per page)
 * Each page is rendered as a separate JPEG file
 */
export async function pdfToPages(pdfFile: File, scale: number = 1.5): Promise<File[]> {
  if (!isPdf(pdfFile)) return [pdfFile];

  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const pages: File[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Cannot create canvas context');

    await page.render({ canvasContext: context, canvas, viewport }).promise;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(b => {
        if (b) resolve(b);
        else reject(new Error('Failed to convert canvas to blob'));
      }, 'image/jpeg', 0.85);
    });

    const fileName = pdfFile.name.replace(/\.pdf$/i, `_page${i}.jpg`);
    pages.push(new File([blob], fileName, { type: 'image/jpeg' }));
  }

  return pages;
}

/**
 * Compress an image by resizing and converting to JPEG
 * @param file - Image file to compress
 * @param maxDimension - Max width or height in pixels
 * @param quality - JPEG quality 0-1
 */
export async function compressImage(file: File, maxDimension: number = 1800, quality: number = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Scale down if needed
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Cannot create canvas')); return; }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('Compression failed')); return; }
        const name = file.name.replace(/\.[^.]+$/, '.jpg');
        resolve(new File([blob], name, { type: 'image/jpeg' }));
      }, 'image/jpeg', quality);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}
