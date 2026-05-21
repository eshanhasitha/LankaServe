import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary.js';
import { sendResponse } from '../utils/response.js';

function detectImageTypeFromBuffer(buffer) {
    if (!buffer || buffer.length < 12) {
        return null;
    }

    // JPEG
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return 'image/jpeg';
    }

    // PNG
    if (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
    ) {
        return 'image/png';
    }

    // WEBP (RIFF....WEBP)
    if (
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
    ) {
        return 'image/webp';
    }

    // HEIC / HEIF (ISO BMFF with ftyp brand)
    const boxType = buffer.subarray(4, 8).toString('ascii');
    if (boxType === 'ftyp') {
        const brand = buffer.subarray(8, 12).toString('ascii').toLowerCase();
        if (brand.startsWith('hei') || brand.startsWith('hev') || brand === 'mif1' || brand === 'msf1') {
            return 'image/heic';
        }
    }

    return null;
}

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

        const supportedMimeTypes = new Set([
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
            'image/heic',
            'image/heif',
            'image/pjpeg',
            'image/x-png',
        ]);
        const supportedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif']);

        const mimeType = String(req.file.mimetype || '').toLowerCase();
        const originalName = String(req.file.originalname || '').toLowerCase();
        const hasSupportedExtension = [...supportedExtensions].some((ext) => originalName.endsWith(ext));
        const detectedType = detectImageTypeFromBuffer(req.file.buffer);
        const isGenericBinaryWithSupportedExt =
            mimeType === 'application/octet-stream' && hasSupportedExtension;
        const isSupported =
            supportedMimeTypes.has(mimeType) ||
            isGenericBinaryWithSupportedExt ||
            (mimeType === 'application/octet-stream' && supportedMimeTypes.has(detectedType));

        if (!isSupported) {
            const error = new Error('Only JPG, JPEG, PNG, WEBP, HEIC, and HEIF images are allowed');
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
