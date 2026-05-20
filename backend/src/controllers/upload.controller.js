import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';
import { sendResponse } from '../utils/response.js';

async function uploadImage(req, res, next, { folder, label }) {
    try {
        if (!isCloudinaryConfigured) {
            const error = new Error('Cloudinary is not configured');
            error.statusCode = 500;
            throw error;
        }

        if (!req.file) {
            const error = new Error('No image file uploaded');
            error.statusCode = 400;
            throw error;
        }

        const supportedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/jpg']);
        if (!supportedTypes.has(req.file.mimetype)) {
            const error = new Error('Only JPG, PNG, and WEBP images are allowed');
            error.statusCode = 400;
            throw error;
        }

        const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        const upload = await cloudinary.uploader.upload(dataUri, {
            folder,
            public_id: `${req.user._id}-${Date.now()}`,
            resource_type: 'image',
            overwrite: false,
        });

        return sendResponse(res, {
            statusCode: 201,
            message: `${label} uploaded`,
            data: {
                url: upload.secure_url,
                publicId: upload.public_id,
            },
        });
    } catch (error) {
        next(error);
    }
}

export const uploadProfileImage = async (req, res, next) => {
    return uploadImage(req, res, next, {
        folder: 'lankaserve/profile-images',
        label: 'Profile image',
    });
};

export const uploadSupportAttachment = async (req, res, next) => {
    return uploadImage(req, res, next, {
        folder: 'lankaserve/support-attachments',
        label: 'Support attachment',
    });
};

export const uploadProviderVerificationDocument = async (req, res, next) => {
    return uploadImage(req, res, next, {
        folder: 'lankaserve/provider-verification',
        label: 'Verification document',
    });
};
