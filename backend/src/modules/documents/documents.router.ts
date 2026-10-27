import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import prisma from '../../config/db';
import { requireAuth } from '../../middleware/auth';
import { preventAuditorMutation } from '../../middleware/rbac';
import { storageService } from '../../services/storage.service';
import { ocrService } from '../../services/ocr.service';
import { logAuditEvent } from '../../middleware/audit';
import { AppError } from '../../middleware/errorHandler';
import { UserRole, DocumentType } from '../../config/constants';
import { env } from '../../config/env';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_FILE_SIZE_BYTES },
});

// Upload document (Protected)
router.post(
  '/upload',
  requireAuth,
  preventAuditorMutation,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError('No file uploaded', 400, 'NO_FILE');

      const { institutionId, fdrId, documentType } = req.body;
      if (!institutionId) throw new AppError('institutionId is required', 400, 'MISSING_PARAM');

      // Authorization check: Institution users can only upload for their own institution
      if ([UserRole.INSTITUTION_ADMIN, UserRole.INSTITUTION_STAFF].includes(req.user!.role)) {
        if (!req.user!.institutionIds.includes(institutionId)) {
          throw new AppError('Access denied: Unauthorized institution', 403, 'FORBIDDEN');
        }
      }

      // Save file securely to private storage with checksum & validation
      const fileMeta = await storageService.saveFile(req.file);

      // Create document record
      const document = await prisma.document.create({
        data: {
          institutionId,
          fdrId: fdrId || null,
          documentType: documentType || DocumentType.FDR_RECEIPT,
          originalFilename: fileMeta.originalFilename,
          storagePath: fileMeta.storagePath,
          mimeType: fileMeta.mimeType,
          fileSize: fileMeta.size,
          checksumSha256: fileMeta.checksum,
          uploadedById: req.user!.id,
        },
      });

      await logAuditEvent({
        actorId: req.user!.id,
        actorEmail: req.user!.email,
        actorRole: req.user!.role,
        action: 'DOCUMENT_UPLOAD',
        resourceType: 'DOCUMENT',
        resourceId: document.id,
        details: {
          filename: document.originalFilename,
          fdrId: document.fdrId,
          checksum: document.checksumSha256,
        },
        ipAddress: req.ip,
        correlationId: req.correlationId,
      });

      // Trigger OCR processing asynchronously if associated with an FDR
      if (fdrId) {
        ocrService.processDocument(document.id, fdrId).catch((err) => {
          console.error(`OCR processing failed for document ${document.id}:`, err);
        });
      }

      return res.status(201).json({
        success: true,
        data: document,
        message: 'Document uploaded securely and queued for extraction.',
      });
    } catch (err) {
      next(err);
    }
  }
);

// Generate short-lived download token (5 minutes)
router.get('/:id/token', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) throw new AppError('Document not found', 404, 'NOT_FOUND');

    // Access control: verify user has permission to read this document
    if ([UserRole.INSTITUTION_ADMIN, UserRole.INSTITUTION_STAFF].includes(req.user!.role)) {
      if (!req.user!.institutionIds.includes(document.institutionId)) {
        throw new AppError('Access denied', 403, 'FORBIDDEN');
      }
    }

    const token = storageService.generateDownloadToken(id, req.user!.id);

    return res.json({
      success: true,
      data: {
        token,
        downloadUrl: `${env.API_PREFIX}/documents/${id}/download?token=${token}`,
        expiresInSeconds: 300,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Download private document
router.get('/:id/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { token } = req.query;

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) throw new AppError('Document not found', 404, 'NOT_FOUND');

    // Validate short-lived token or active session
    let authorized = false;
    if (token && typeof token === 'string') {
      authorized = storageService.validateDownloadToken(token, id);
    }

    if (!authorized) {
      throw new AppError('Unauthorized or expired document access token', 401, 'INVALID_TOKEN');
    }

    const filePath = storageService.getFilePath(document.storagePath);

    // Audit log document access
    await logAuditEvent({
      action: 'DOCUMENT_DOWNLOAD',
      resourceType: 'DOCUMENT',
      resourceId: id,
      details: { filename: document.originalFilename },
      ipAddress: req.ip,
    });

    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${document.originalFilename}"`);
    res.sendFile(filePath);
  } catch (err) {
    next(err);
  }
});

// Get OCR comparison details
router.get('/:id/ocr', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const ocr = await prisma.oCRResult.findUnique({
      where: { documentId: id },
      include: {
        fdr: true,
        document: true,
      },
    });

    if (!ocr) {
      return res.json({
        success: true,
        data: null,
        message: 'No OCR processing recorded for this document.',
      });
    }

    // Access control
    if ([UserRole.INSTITUTION_ADMIN, UserRole.INSTITUTION_STAFF].includes(req.user!.role)) {
      if (!req.user!.institutionIds.includes(ocr.fdr.institutionId)) {
        throw new AppError('Access denied', 403, 'FORBIDDEN');
      }
    }

    return res.json({ success: true, data: ocr });
  } catch (err) {
    next(err);
  }
});

// Confirm OCR Review by Reviewer / Officer
router.post('/:id/ocr/confirm', requireAuth, preventAuditorMutation, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const ocr = await prisma.oCRResult.findUnique({ where: { documentId: id } });
    if (!ocr) throw new AppError('OCR record not found', 404, 'NOT_FOUND');

    const updated = await prisma.oCRResult.update({
      where: { id: ocr.id },
      data: {
        reviewerConfirmed: true,
        status: 'COMPLETED',
      },
    });

    await logAuditEvent({
      actorId: req.user!.id,
      actorEmail: req.user!.email,
      actorRole: req.user!.role,
      action: 'OCR_REVIEW_CONFIRMED',
      resourceType: 'DOCUMENT',
      resourceId: id,
      ipAddress: req.ip,
      correlationId: req.correlationId,
    });

    return res.json({ success: true, data: updated, message: 'OCR extraction values confirmed by reviewer.' });
  } catch (err) {
    next(err);
  }
});

export default router;
