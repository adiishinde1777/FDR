import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../config/env';
import { calculateSha256 } from '../utils/crypto';
import { AppError } from '../middleware/errorHandler';

// In-memory registry for short-lived authorized download tokens
interface DownloadTokenEntry {
  documentId: string;
  userId: string;
  expiresAt: number;
}

const downloadTokens = new Map<string, DownloadTokenEntry>();

export class StorageService {
  private storageDir: string;

  constructor() {
    this.storageDir = path.resolve(process.cwd(), env.UPLOAD_STORAGE_DIR);
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  async saveFile(file: Express.Multer.File): Promise<{
    storagePath: string;
    checksum: string;
    size: number;
    mimeType: string;
    originalFilename: string;
  }> {
    const allowedMimes = env.ALLOWED_MIME_TYPES.split(',');
    if (!allowedMimes.includes(file.mimetype)) {
      throw new AppError(`Unsupported file format '${file.mimetype}'. Allowed: PDF, JPEG, PNG`, 400, 'UNSUPPORTED_MEDIA_TYPE');
    }

    if (file.size > env.MAX_FILE_SIZE_BYTES) {
      throw new AppError(`File exceeds maximum size limit of ${env.MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`, 400, 'FILE_TOO_LARGE');
    }

    const checksum = calculateSha256(file.buffer);
    const ext = path.extname(file.originalname).toLowerCase();
    const safeFilename = `${crypto.randomUUID()}${ext}`;
    const destination = path.join(this.storageDir, safeFilename);

    // Prevent path traversal
    if (!destination.startsWith(this.storageDir)) {
      throw new AppError('Invalid file storage path', 400, 'SECURITY_VIOLATION');
    }

    await fs.promises.writeFile(destination, file.buffer);

    return {
      storagePath: safeFilename,
      checksum,
      size: file.size,
      mimeType: file.mimetype,
      originalFilename: file.originalname,
    };
  }

  getFilePath(storageFilename: string): string {
    const filePath = path.join(this.storageDir, path.basename(storageFilename));
    if (!fs.existsSync(filePath)) {
      throw new AppError('File not found on storage server', 404, 'FILE_NOT_FOUND');
    }
    return filePath;
  }

  generateDownloadToken(documentId: string, userId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes valid
    downloadTokens.set(token, { documentId, userId, expiresAt });
    return token;
  }

  validateDownloadToken(token: string, documentId: string): boolean {
    const entry = downloadTokens.get(token);
    if (!entry) return false;
    if (entry.expiresAt < Date.now()) {
      downloadTokens.delete(token);
      return false;
    }
    return entry.documentId === documentId;
  }
}

export const storageService = new StorageService();
