export const sendResponse = (res, {
    statusCode = 200,
    success = true,
    message = 'OK',
    data = null,
    pagination = null,
    errorCode = null,
}) => {
    return res.status(statusCode).json({
        success,
        message,
        data,
        pagination,
        errorCode,
    });
};
