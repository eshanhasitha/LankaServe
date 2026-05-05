export const notFoundMiddleware = (req, res) => {
    return res.status(404).json({
        success: false,
        message: `Route not found: ${req.originalUrl}`,
        data: null,
        pagination: null,
        errorCode: 'NOT_FOUND',
    });
};
