import { verifyToken } from "../utils/jwt.js";

const COOKIE_NAME = "auth_token";

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const cookieToken = req.cookies?.[COOKIE_NAME];
  const token = cookieToken || bearer;

  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    return next();
  } catch (err) {
    console.error("Auth error", err.message);
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const setAuthCookie = (res, token) => {
  const secure = process.env.NODE_ENV === "production";
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

export const clearAuthCookie = (res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
};
