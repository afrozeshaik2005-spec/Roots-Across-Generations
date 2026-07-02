import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { bucket } from '../config/firebase.js';

const __dirname = path.resolve();

export const uploadFile = async (file, folder = 'proofs') => {
  if (!file) return null;

  const ext = path.extname(file.originalname);
  const uniqueName = `${folder}/${crypto.randomUUID()}${ext}`;

  // 1. Firebase Storage Upload
  if (bucket) {
    try {
      const publicUrl = await new Promise((resolve, reject) => {
        const blob = bucket.file(uniqueName);
        const blobStream = blob.createWriteStream({
          metadata: {
            contentType: file.mimetype,
          },
          resumable: false,
        });

        blobStream.on('error', (err) => {
          console.error('Firebase upload error:', err);
          reject(err);
        });

        blobStream.on('finish', async () => {
          try {
            await blob.makePublic().catch(() => {});
            const url = `https://storage.googleapis.com/${bucket.name}/${uniqueName}`;
            resolve(url);
          } catch (makePublicErr) {
            reject(makePublicErr);
          }
        });

        blobStream.end(file.buffer);
      });
      return publicUrl;
    } catch (err) {
      console.error('Firebase upload failed, falling back to local storage:', err);
    }
  }

  // 2. Local Storage Fallback
  try {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const localFileName = `${crypto.randomUUID()}${ext}`;
    const localFilePath = path.join(uploadDir, localFileName);

    await fs.promises.writeFile(localFilePath, file.buffer);

    const port = process.env.PORT || 5000;
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${port}`;
    return `${backendUrl}/uploads/${localFileName}`;
  } catch (err) {
    console.error('Local fallback write failed:', err);
    throw new Error('Failed to save uploaded file');
  }
};
