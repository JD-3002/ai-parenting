import express from "express";
import { signup, login, logout } from "../controllers/auth.controller.js";
import { validateBody } from "../middleware/validate.js";
import { loginSchema, signupSchema } from "../validators/question.validators.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/signup", validateBody(signupSchema), signup);
router.post("/login", validateBody(loginSchema), login);
router.post("/logout", requireAuth, logout);

export default router;
