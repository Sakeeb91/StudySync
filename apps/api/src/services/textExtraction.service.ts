import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';

export interface ExtractionResult {
  text: string;
  pageCount?: number;
  metadata?: Record<string, unknown>;
}

export class TextExtractionService {
  /**
   * Extract text from a PDF file
   */
  async extractFromPDF(buffer: Buffer): Promise<ExtractionResult> {
    try {
      const data = await pdfParse(buffer);
      return {
        text: data.text.trim(),
        pageCount: data.numpages,
        metadata: {
          info: data.info,
          version: data.version,
        },
      };
    } catch (error) {
      throw new Error(`PDF extraction failed: ${(error as Error).message}`);
    }
  }

  /**
   * Extract text from a DOCX file
   */
  async extractFromDOCX(buffer: Buffer): Promise<ExtractionResult> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return {
        text: result.value.trim(),
        metadata: {
          messages: result.messages,
        },
      };
    } catch (error) {
      throw new Error(`DOCX extraction failed: ${(error as Error).message}`);
    }
  }

  /**
   * Extract text from a plain text file
   */
  async extractFromTXT(buffer: Buffer): Promise<ExtractionResult> {
    return {
      text: buffer.toString('utf-8').trim(),
    };
  }

  /**
   * Extract text from an image using OCR (Tesseract)
   */
  async extractFromImage(buffer: Buffer): Promise<ExtractionResult> {
    try {
      const result = await Tesseract.recognize(buffer, 'eng', {
        logger: (m) => {
          if (process.env.NODE_ENV === 'development') {
            console.log(`OCR Progress: ${m.status} - ${Math.round((m.progress || 0) * 100)}%`);
          }
        },
      });

      return {
        text: result.data.text.trim(),
        metadata: {
          confidence: result.data.confidence,
        },
      };
    } catch (error) {
      throw new Error(`OCR extraction failed: ${(error as Error).message}`);
    }
  }

  /**
   * Extract text based on MIME type
   */
  async extract(buffer: Buffer, mimeType: string): Promise<ExtractionResult> {
    switch (mimeType) {
      case 'application/pdf':
        return this.extractFromPDF(buffer);

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      case 'application/msword':
        return this.extractFromDOCX(buffer);

      case 'text/plain':
        return this.extractFromTXT(buffer);

      case 'image/jpeg':
      case 'image/jpg':
      case 'image/png':
      case 'image/webp':
      case 'image/tiff':
        return this.extractFromImage(buffer);

      default:
        throw new Error(`Unsupported file type: ${mimeType}`);
    }
  }

  /**
   * Get FileType enum value from MIME type
   */
  getFileTypeFromMime(mimeType: string): 'PDF' | 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'AUDIO' | 'PRESENTATION' {
    if (mimeType === 'application/pdf') return 'PDF';
    if (mimeType.startsWith('image/')) return 'IMAGE';
    if (mimeType.startsWith('video/')) return 'VIDEO';
    if (mimeType.startsWith('audio/')) return 'AUDIO';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'PRESENTATION';
    return 'DOCUMENT';
  }
}

export const textExtractionService = new TextExtractionService();
