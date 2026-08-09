import { sendResponse } from '../utils/response.js';
import {
  loginAdmin,
  refreshAdminToken,
  logoutAdminByRefreshToken,
  changeAdminPassword,
} from '../services/admin-auth.service.js';

export const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await loginAdmin(email, password);

    return sendResponse(res, {
      statusCode: 200,
      message: 'Admin login successful',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const adminRefresh = async (req, res, next) => {
  try {
    const result = await refreshAdminToken(req.body.refreshToken);
    return sendResponse(res, {
      statusCode: 200,
      message: 'Admin token refreshed',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const adminLogout = async (req, res, next) => {
  try {
    await logoutAdminByRefreshToken(req.admin._id, req.body.refreshToken);
    return sendResponse(res, {
      statusCode: 200,
      message: 'Admin logout successful',
    });
  } catch (error) {
    next(error);
  }
};

export const adminChangePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const updatedAdmin = await changeAdminPassword({
      adminId: req.admin._id,
      currentPassword,
      newPassword,
    });

    return sendResponse(res, {
      statusCode: 200,
      message: 'Password changed successfully',
      data: updatedAdmin,
    });
  } catch (error) {
    next(error);
  }
};
