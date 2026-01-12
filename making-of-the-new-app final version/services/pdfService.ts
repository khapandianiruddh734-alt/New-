
import { CompressionLevel } from '../types';

declare const jspdf: any;
declare const pdfjsLib: any;
declare const html2pdf: any;
declare const mammoth: any;

/**
 * JPG/PNG to PDF
 */
export async function imagesToPdf(files: File[]): Promise<Blob> {
  const doc = new jspdf.jsPDF();
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const imgData = await fileToDataUrl(file);
    const img = await loadImage(imgData);
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
    const w = img.width * ratio;
    const h = img.height * ratio;
    const x = (pageWidth - w) / 2;
    const y = (pageHeight - h) / 2;

    if (i > 0) doc.addPage();
    doc.addImage(imgData, 'JPEG', x, y, w, h);
  }
  return doc.output('blob');
}

/**
 * Word to PDF (Docx to PDF)
 */
export async function wordToPdf(file: File): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
  const html = `
    <div style="padding: 40px; font-family: 'Inter', sans-serif; line-height: 1.6; color: #1e293b;">
      ${result.value}
    </div>
  `;

  const opt = {
    margin: 10,
    filename: file.name.replace('.docx', '.pdf'),
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  return await (window as any).html2pdf().set(opt).from(html).output('blob');
}

/**
 * PDF Compression with advanced text-preservation logic.
 */
export async function compressPdf(file: File, level: CompressionLevel = 'Standard'): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(buffer).promise;
  const doc = new jspdf.jsPDF();
  
  const settings = {
    'Standard': { scale: 3.5, quality: 0.92 }, 
    'High': { scale: 2.5, quality: 0.70 }, 
    'Maximum': { scale: 1.8, quality: 0.45 } 
  }[level];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: settings.scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    if (context) {
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
    }
    
    await page.render({ canvasContext: context, viewport: viewport }).promise;
    const imgData = canvas.toDataURL('image/jpeg', settings.quality); 
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    if (i > 1) doc.addPage();
    doc.addImage(imgData, 'JPEG', 0, 0, pw, ph, undefined, 'FAST');
  }
  return doc.output('blob');
}

/**
 * PDF to JPG Zip
 */
export async function pdfToJpgs(file: File): Promise<Blob> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(buffer).promise;
  const zip = new (window as any).JSZip();
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.5 }); 
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: context, viewport: viewport }).promise;
    
    const base64 = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
    zip.file(`page-${i}.jpg`, base64, { base64: true });
  }
  
  return await zip.generateAsync({ type: "blob" });
}

/**
 * Extract Text from PDF (for summary)
 */
export async function extractPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument(buffer).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map((it: any) => it.str).join(' ') + "\n";
  }
  return fullText;
}

// Helpers
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = src;
  });
}
