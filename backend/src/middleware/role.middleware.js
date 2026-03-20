export const onlyCustomer = (req, res, next) =>
  req.user.role === 'customer' ? next() : res.status(403).json({ message: 'Customer only' });

export const onlyProvider = (req, res, next) =>
  req.user.role === 'provider' ? next() : res.status(403).json({ message: 'Provider only' });

export const onlyAdmin = (req, res, next) =>
  req.user.role === 'admin' ? next() : res.status(403).json({ message: 'Admin only' });
