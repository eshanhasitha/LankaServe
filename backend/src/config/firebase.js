import admin from 'firebase-admin';
import { env } from './env.js';
import { logger } from './logger.js';

if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: env.FIREBASE_PROJECT_ID,
                clientEmail: env.FIREBASE_CLIENT_EMAIL,
                privateKey: env.FIREBASE_PRIVATE_KEY,
            }),
        });
        logger.info('Firebase Admin initialized');
    } catch (error) {
        logger.warn(`Firebase init failed: ${error.message}`);
    }
} else {
    logger.warn('Firebase env not complete. Firebase verification and FCM disabled.');
}

export const firebaseAuth = admin.apps.length ? admin.auth() : null;
export const firebaseMessaging = admin.apps.length ? admin.messaging() : null;
