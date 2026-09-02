import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let firebaseApp = null;

/**
 * Initialize Firebase Admin SDK.
 * Expects FIREBASE_SERVICE_ACCOUNT env var containing the JSON service account
 * key (stringified), or a path to the service account file.
 *
 * To set the env var on Render:
 *   FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
 */
export const initFirebase = () => {
  if (firebaseApp) return firebaseApp;

  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('[Firebase] Admin SDK initialized successfully');
    return firebaseApp;
  } catch (error) {
    console.error('[Firebase] Failed to initialize Admin SDK:', error.message);
    return null;
  }
};

/**
 * Send a push notification to a list of FCM tokens.
 * Returns { successCount, failureCount, response }.
 */
export const sendPushNotification = async ({ tokens, title, body, data = {} }) => {
  if (!tokens || tokens.length === 0) {
    return { successCount: 0, failureCount: 0, responses: [] };
  }

  if (!firebaseApp) {
    initFirebase();
  }

  if (!firebaseApp) {
    console.warn('[Firebase] SDK not initialized, skipping push');
    return { successCount: 0, failureCount: 0, responses: [] };
  }

  const message = {
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    ),
    tokens: tokens.filter(Boolean),
  };

  if (message.tokens.length === 0) {
    return { successCount: 0, failureCount: 0, responses: [] };
  }

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(
      `[Firebase] Push sent: ${response.successCount} success, ${response.failureCount} failure`
    );
    return response;
  } catch (error) {
    console.error('[Firebase] Push send failed:', error.message);
    return { successCount: 0, failureCount: 0, responses: [] };
  }
};

export default { initFirebase, sendPushNotification };
