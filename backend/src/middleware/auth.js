const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "fremio_dev_secret_key";

/**
 * Middleware: Verify JWT Token
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Token akses diperlukan" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Token sudah expired" });
      }
      return res.status(403).json({ error: "Token tidak valid" });
    }
    req.user = decoded;
    next();
  });
};

/**
 * Middleware: Optional Auth (doesn't fail if no token)
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (!err) {
        req.user = decoded;
      }
    });
  }
  next();
};

/**
 * Middleware: Require Admin Role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Autentikasi diperlukan" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Akses admin diperlukan" });
  }

  next();
};

/**
 * Generate JWT Token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

module.exports = {
  authenticateToken,
  verifyToken: authenticateToken, // Alias untuk authenticateToken
  optionalAuth,
  requireAdmin,
  verifyAdmin: requireAdmin, // Alias untuk requireAdmin
  generateToken,
  JWT_SECRET,
};
