import { initializeApp, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../../.env') });

let bucket = null;

try {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ?.replace(/\\n/g, '\n');

  if (process.env.FIREBASE_PROJECT_ID && privateKey) {
    const app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: privateKey,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });

    bucket = getStorage(app).bucket();
    console.log('✅ Firebase Storage connected');
  } else {
    console.error('❌ Firebase credentials missing in .env');
  }
} catch (error) {
  console.error('❌ Firebase error:', error.message);
}

export { bucket };
export default bucket;