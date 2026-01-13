import { generatePlanContent } from "../services/ai.service.js";
import PlanTemplate from "../models/PlanTemplate.js";

const prettyTitle = (type, ageGroup) => {
  const label = {
    daily_routine: "Daily Routine",
    bedtime_script: "Bedtime Script",
    screen_time_plan: "Screen Time Plan",
    tricky_moment_script: "What to Say"
  }[type];
  return `${label || "Plan"} (${ageGroup})`;
};

export const generatePlan = async (req, res) => {
  const body = req.validated?.body || req.body;
  const tone = body.tone || "supportive";
  const language = body.language || "en";
  try {
    const plan = await generatePlanContent({
      type: body.type,
      ageGroup: body.ageGroup,
      goal: body.goal,
      childEmotion: body.childEmotion,
      tone,
      language
    });

    let template = null;
    if (body.saveTemplate) {
      template = await PlanTemplate.create({
        userId: req.user?.userId,
        title: body.title || prettyTitle(body.type, body.ageGroup),
        type: body.type,
        ageGroup: body.ageGroup,
        goal: body.goal,
        childEmotion: body.childEmotion,
        tone,
        language,
        plan
      });
    }

    return res.json({
      plan,
      saved: !!template,
      templateId: template?._id
    });
  } catch (err) {
    console.error(err);
    const status = err?.status || err?.statusCode || 500;
    const message = err?.message || "Failed to generate plan";
    return res.status(status).json({ error: message });
  }
};

export const listTemplates = async (req, res) => {
  try {
    const items = await PlanTemplate.find({ userId: req.user?.userId }).sort({ createdAt: -1 });
    return res.json(items);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch templates" });
  }
};

export const getTemplate = async (req, res) => {
  try {
    const item = await PlanTemplate.findOne({ _id: req.params.id, userId: req.user?.userId });
    if (!item) return res.status(404).json({ error: "Not found" });
    return res.json(item);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch template" });
  }
};

export const deleteTemplate = async (req, res) => {
  try {
    const item = await PlanTemplate.findOneAndDelete({ _id: req.params.id, userId: req.user?.userId });
    if (!item) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to delete template" });
  }
};
