import express from "express";
import { generatePlan, getTemplate, listTemplates, deleteTemplate } from "../controllers/plan.controller.js";
import { validateBody } from "../middleware/validate.js";
import { generatePlanSchema } from "../validators/plan.validators.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);
router.post("/generate", validateBody(generatePlanSchema), generatePlan);
router.get("/templates", listTemplates);
router.get("/templates/:id", getTemplate);
router.delete("/templates/:id", deleteTemplate);

export default router;
