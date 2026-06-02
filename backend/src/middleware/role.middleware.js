const allowRoles = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Forbidden', data: null, pagination: null, errorCode: 'FORBIDDEN' });
    }
    next();
};

export const onlyCustomer = allowRoles('customer');
export const onlyProvider = allowRoles('provider');
export const onlyAdmin = allowRoles('admin');
