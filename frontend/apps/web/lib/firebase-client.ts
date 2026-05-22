import { initializeApp, getApp, getApps } from 'firebase/app';
import {
  browserLocalPersistence,
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  linkWithCredential,
  reauthenticateWithCredential,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  updatePassword,
  updateProfile,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

function getFirebaseApp() {
  const missingKey = Object.entries(firebaseConfig).find(([, value]) => !value);
  if (missingKey) {
    throw new Error(`Missing Firebase config: ${missingKey[0]}`);
  }

  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

function getFirebaseAuth() {
  const app = getFirebaseApp();
  const auth = getAuth(app);
  void setPersistence(auth, browserLocalPersistence).catch(() => {});
  return auth;
}

export async function loginWithEmailPassword(email, password) {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user.getIdToken(true);
}

export async function registerWithEmailPassword(email, password, fullName) {
  const auth = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (fullName?.trim()) {
    await updateProfile(credential.user, { displayName: fullName.trim() });
  }
  return credential.user.getIdToken(true);
}

export async function loginWithGooglePopup() {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  return credential.user.getIdToken(true);
}

export async function getCurrentFirebaseAuthProvider() {
  const auth = getFirebaseAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  const providerIds = currentUser.providerData.map((provider) => provider?.providerId).filter(Boolean);
  if (providerIds.includes('google.com')) return 'google';
  if (providerIds.includes('password')) return 'password';

  const tokenResult = await currentUser.getIdTokenResult();
  const signInProvider = tokenResult?.signInProvider || tokenResult?.claims?.firebase?.sign_in_provider;
  if (signInProvider === 'google.com') return 'google';
  if (signInProvider === 'password') return 'password';

  return null;
}

export async function changeCurrentUserPassword({ currentPassword = '', newPassword, requiresCurrentPassword = true }) {
  const auth = getFirebaseAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('No authenticated user');
  if (!newPassword || String(newPassword).length < 6) {
    throw new Error('New password must be at least 6 characters long');
  }
  if (!currentUser.email) {
    throw new Error('Account email is missing. Please re-login and try again.');
  }

  if (requiresCurrentPassword) {
    if (!currentPassword) throw new Error('Current password is required');
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPassword);
    return;
  }

  const emailCredential = EmailAuthProvider.credential(currentUser.email, newPassword);
  try {
    await linkWithCredential(currentUser, emailCredential);
  } catch (error) {
    if (error?.code === 'auth/provider-already-linked') {
      await updatePassword(currentUser, newPassword);
      return;
    }
    throw error;
  }
}
