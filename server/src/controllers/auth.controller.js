import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { signToken } from "../utils/jwt.js";
import { clearAuthCookie, setAuthCookie } from "../middleware/auth.js";

const userPayload = (user) => ({ id: user._id, email: user.email, name: user.name });

export const signup = async (req, res) => {
  const { email, password, name } = req.validated?.body || req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: "Email already in use" });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, name });
    const token = signToken({ userId: user._id, email: user.email });
    setAuthCookie(res, token);
    return res.json({ user: userPayload(user) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to signup" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.validated?.body || req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const match = await user.comparePassword(password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });
    const token = signToken({ userId: user._id, email: user.email });
    setAuthCookie(res, token);
    return res.json({ user: userPayload(user) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to login" });
  }
};

export const logout = (_req, res) => {
  clearAuthCookie(res);
  return res.json({ ok: true });
};
