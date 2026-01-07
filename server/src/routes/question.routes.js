import express from "express";
import { askQuestion, getHistory, getQuestionById, giveFeedback } from "../controllers/question.controller.js";
import { validateBody, validateQuery } from "../middleware/validate.js";
import { askSchema, feedbackSchema, historyQuerySchema } from "../validators/question.validators.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);
router.post("/ask", validateBody(askSchema), askQuestion);
router.get("/history", validateQuery(historyQuerySchema), getHistory);
router.get("/:id", getQuestionById);
router.post("/:id/feedback", validateBody(feedbackSchema), giveFeedback);
export default router;
