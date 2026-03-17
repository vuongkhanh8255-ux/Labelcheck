/**
 * Client-side PDF to Image converter using pdfjs-dist
 * Renders the first page of a PDF as a PNG image
 * 
 * NOTE: pdfjs-dist can only run in browser (needs DOMMatrix, Canvas, etc.)
 * All imports are dynamic to avoid SSR issues.
 */

/**
 * Convert a PDF file to a PNG image (first page only)
 * @param pdfFile - The PDF File object
 * @param scale - Render scale (2 = high quality, 1 = normal)
 * @returns A new File object containing the PNG image
 */
export async function pdfToImage(pdfFile: File, scale: number = 2): Promise<File> {
  // Dynamic import to avoid SSR (pdfjs-dist uses DOMMatrix which doesn't exist in Node.js)
  const pdfjsLib = await import('pdfjs-dist');
  
  // Set worker source to local file (copied from node_modules to public/)
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale });

  // Create an offscreen canvas
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

  // Convert canvas to blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => {
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
