const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "secret123";

module.exports = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer "))
    return res.status(401).json({ message: "Unauthorized" });

  try {
    req.user = jwt.verify(header.split(" ")[1], SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};
