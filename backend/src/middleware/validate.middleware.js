export const validate = (schema, source = 'body') => (req, res, next) => {
    const { error, value } = schema.validate(req[source], { abortEarly: false, stripUnknown: true });
    if (error) {
        return res.status(400).json({
            success: false,
            message: error.details.map((d) => d.message).join(', '),
            data: null,
            pagination: null,
            errorCode: 'VALIDATION_ERROR',
        });
    }
    req[source] = value;
    next();
};
