import express from "express";
import { createChild, deleteChild, listChildren, updateChild } from "../controllers/child.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { childCreateSchema, childUpdateSchema } from "../validators/question.validators.js";

const router = express.Router();

router.use(requireAuth);
router.get("/", listChildren);
router.post("/", validateBody(childCreateSchema), createChild);
router.put("/:id", validateBody(childUpdateSchema), updateChild);
router.delete("/:id", deleteChild);

export default router;
