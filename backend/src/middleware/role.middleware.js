export const onlyAdmin = (req, res, next) => {
  const role = req.user?.role; // from Firebase custom claim
  if (role !== "admin") return res.status(403).json({ message: "Forbidden" });
  next();
};
