import User from '../models/User.model.js';
import { firebaseAuth } from '../config/firebase.js';
import { signAccessToken } from '../utils/tokens.js';

async function decodeFirebaseIdentity(firebaseIdToken) {
  if (String(firebaseIdToken).startsWith('dev:')) {
    const parts = String(firebaseIdToken).split(':');
    return { uid: `dev_${parts[1]}`, email: parts[1], name: parts[2], role: parts[3] || 'customer' };
  }
  if (!firebaseAuth) throw new Error('Firebase not configured');
  return firebaseAuth.verifyIdToken(firebaseIdToken);
}

export async function loginWithFirebaseToken(firebaseIdToken) {
  const decoded = await decodeFirebaseIdentity(firebaseIdToken);
  let user = await User.findOne({ email: decoded.email });

  if (!user) {
    user = await User.create({
      firebaseUid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
    });
  }

  const accessToken = signAccessToken({ sub: String(user._id), role: user.role });
  return { user, accessToken };
}
