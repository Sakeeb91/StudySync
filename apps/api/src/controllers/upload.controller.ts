import { Request, Response, NextFunction } from 'express';
import { PrismaClient, FileType, ProcessingStatus } from '@prisma/client';
import { z } from 'zod';
import { storageService } from '../services/storage.service';
import { textExtractionService } from '../services/textExtraction.service';

const prisma = new PrismaClient();

// Validation schemas
const uploadMetadataSchema = z.object({
  course: z.string().optional(),
  topic: z.string().optional(),
  date: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// File size limits
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

export class UploadController {
  /**
   * Upload a single file
   */
  async uploadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({ error: 'No file provided' });
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        res.status(400).json({
          error: 'File too large',
          maxSize: `${MAX_FILE_SIZE / (1024 * 1024)}MB`
        });
        return;
      }

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        res.status(400).json({
          error: 'Unsupported file type',
          allowedTypes: ALLOWED_MIME_TYPES,
        });
        return;
      }

      // Parse optional metadata
      let metadata = {};
      if (req.body.metadata) {
        try {
          metadata = uploadMetadataSchema.parse(JSON.parse(req.body.metadata));
        } catch {
          res.status(400).json({ error: 'Invalid metadata format' });
          return;
        }
      }

      // Generate storage key and upload to S3/MinIO
      const storageKey = storageService.generateStorageKey(req.user.userId, file.originalname);
      const uploadResult = await storageService.uploadFile(
        file.buffer,
        storageKey,
        file.mimetype
      );

      // Determine file type
      const fileType = textExtractionService.getFileTypeFromMime(file.mimetype) as FileType;

      // Create upload record in database
      const upload = await prisma.upload.create({
        data: {
          userId: req.user.userId,
          fileName: storageKey.split('/').pop() || file.originalname,
          originalName: file.originalname,
          fileType,
          mimeType: file.mimetype,
          fileUrl: uploadResult.url,
          fileSize: file.size,
          storageKey,
          checksum: uploadResult.checksum,
          processingStatus: ProcessingStatus.PENDING,
          metadata,
        },
      });

      // Start async processing (don't await)
      this.processFile(upload.id, file.buffer, file.mimetype).catch((error) => {
        console.error(`Error processing file ${upload.id}:`, error);
      });

      res.status(201).json({
        message: 'File uploaded successfully',
        upload: {
          id: upload.id,
          fileName: upload.originalName,
          fileType: upload.fileType,
          fileSize: upload.fileSize,
          processingStatus: upload.processingStatus,
          createdAt: upload.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process file in background (extract text)
   */
  private async processFile(uploadId: string, buffer: Buffer, mimeType: string): Promise<void> {
    try {
      // Update status to processing
      await prisma.upload.update({
        where: { id: uploadId },
        data: { processingStatus: ProcessingStatus.PROCESSING },
      });

      // Extract text
      const result = await textExtractionService.extract(buffer, mimeType);

      // Update with extracted text
      await prisma.upload.update({
        where: { id: uploadId },
        data: {
          processingStatus: ProcessingStatus.COMPLETED,
          extractedText: result.text,
          textLength: result.text.length,
          pageCount: result.pageCount,
          processedAt: new Date(),
        },
      });

      console.log(`Successfully processed file ${uploadId}: ${result.text.length} characters extracted`);
    } catch (error) {
      // Update with error
      await prisma.upload.update({
        where: { id: uploadId },
        data: {
          processingStatus: ProcessingStatus.FAILED,
          processingError: (error as Error).message,
          processedAt: new Date(),
        },
      });

      console.error(`Failed to process file ${uploadId}:`, error);
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No files provided' });
        return;
      }

      if (files.length > 10) {
        res.status(400).json({ error: 'Maximum 10 files per upload' });
        return;
      }

      const uploads = [];
      const errors = [];

      for (const file of files) {
        try {
          // Validate each file
          if (file.size > MAX_FILE_SIZE) {
            errors.push({ fileName: file.originalname, error: 'File too large' });
            continue;
          }

          if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            errors.push({ fileName: file.originalname, error: 'Unsupported file type' });
            continue;
          }

          // Upload to storage
          const storageKey = storageService.generateStorageKey(req.user.userId, file.originalname);
          const uploadResult = await storageService.uploadFile(
            file.buffer,
            storageKey,
            file.mimetype
          );

          const fileType = textExtractionService.getFileTypeFromMime(file.mimetype) as FileType;

          // Create database record
          const upload = await prisma.upload.create({
            data: {
              userId: req.user.userId,
              fileName: storageKey.split('/').pop() || file.originalname,
              originalName: file.originalname,
              fileType,
              mimeType: file.mimetype,
              fileUrl: uploadResult.url,
              fileSize: file.size,
              storageKey,
              checksum: uploadResult.checksum,
              processingStatus: ProcessingStatus.PENDING,
            },
          });

          // Start async processing
          this.processFile(upload.id, file.buffer, file.mimetype).catch((error) => {
            console.error(`Error processing file ${upload.id}:`, error);
          });

          uploads.push({
            id: upload.id,
            fileName: upload.originalName,
            fileType: upload.fileType,
            fileSize: upload.fileSize,
            processingStatus: upload.processingStatus,
          });
        } catch (error) {
          errors.push({ fileName: file.originalname, error: (error as Error).message });
        }
      }

      res.status(201).json({
        message: `${uploads.length} file(s) uploaded successfully`,
        uploads,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all uploads for current user
   */
  async getUploads(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const status = req.query.status as ProcessingStatus | undefined;

      const where = {
        userId: req.user.userId,
        ...(status && { processingStatus: status }),
      };

      const [uploads, total] = await Promise.all([
        prisma.upload.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            originalName: true,
            fileType: true,
            fileSize: true,
            processingStatus: true,
            textLength: true,
            pageCount: true,
            metadata: true,
            createdAt: true,
            processedAt: true,
          },
        }),
        prisma.upload.count({ where }),
      ]);

      res.json({
        uploads,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single upload by ID
   */
  async getUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { id } = req.params;

      const upload = await prisma.upload.findFirst({
        where: {
          id,
          userId: req.user.userId,
        },
        include: {
          flashcardSets: {
            select: { id: true, title: true },
          },
          quizzes: {
            select: { id: true, title: true },
          },
        },
      });

      if (!upload) {
        res.status(404).json({ error: 'Upload not found' });
        return;
      }

      // Generate fresh signed URL
      let fileUrl = upload.fileUrl;
      if (upload.storageKey) {
        fileUrl = await storageService.getSignedUrl(upload.storageKey);
      }

      res.json({
        upload: {
          ...upload,
          fileUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete an upload
   */
  async deleteUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { id } = req.params;

      const upload = await prisma.upload.findFirst({
        where: {
          id,
          userId: req.user.userId,
        },
      });

      if (!upload) {
        res.status(404).json({ error: 'Upload not found' });
        return;
      }

      // Delete from storage
      if (upload.storageKey) {
        await storageService.deleteFile(upload.storageKey).catch((error) => {
          console.error(`Failed to delete file from storage: ${error}`);
        });
      }

      // Delete from database
      await prisma.upload.delete({
        where: { id },
      });

      res.json({ message: 'Upload deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update upload metadata
   */
  async updateUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { id } = req.params;
      const validatedData = uploadMetadataSchema.parse(req.body);

      const upload = await prisma.upload.findFirst({
        where: {
          id,
          userId: req.user.userId,
        },
      });

      if (!upload) {
        res.status(404).json({ error: 'Upload not found' });
        return;
      }

      const updated = await prisma.upload.update({
        where: { id },
        data: {
          metadata: {
            ...(upload.metadata as object || {}),
            ...validatedData,
          },
        },
      });

      res.json({
        message: 'Upload updated successfully',
        upload: updated,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
        return;
      }
      next(error);
    }
  }

  /**
   * Retry processing a failed upload
   */
  async retryProcessing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { id } = req.params;

      const upload = await prisma.upload.findFirst({
        where: {
          id,
          userId: req.user.userId,
        },
      });

      if (!upload) {
        res.status(404).json({ error: 'Upload not found' });
        return;
      }

      if (upload.processingStatus !== ProcessingStatus.FAILED) {
        res.status(400).json({ error: 'Only failed uploads can be retried' });
        return;
      }

      if (!upload.storageKey) {
        res.status(400).json({ error: 'File not found in storage' });
        return;
      }

      // Get file from storage
      const buffer = await storageService.getFileBuffer(upload.storageKey);

      // Reset status and start processing
      await prisma.upload.update({
        where: { id },
        data: {
          processingStatus: ProcessingStatus.PENDING,
          processingError: null,
        },
      });

      // Start async processing
      this.processFile(upload.id, buffer, upload.mimeType).catch((error) => {
        console.error(`Error processing file ${upload.id}:`, error);
      });

      res.json({ message: 'Processing retry started' });
    } catch (error) {
      next(error);
    }
  }
}

export const uploadController = new UploadController();
