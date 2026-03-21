import { loginWithFirebaseToken } from '../services/auth.service.js';

export async function login(req, res, next) {
  try {
    const result = await loginWithFirebaseToken(req.body.firebaseIdToken);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
