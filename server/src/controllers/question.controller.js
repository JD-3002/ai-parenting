import { generateContent, safetyCheck } from "../services/ai.service.js";
import QuestionSession from "../models/QuestionSession.js";
import Child from "../models/Child.js";

export const askQuestion = async (req, res) => {
  const body = req.validated?.body || req.body;
  const { question, ageGroup, childEmotion, childId } = body;

  let resolvedAgeGroup = ageGroup;
  let resolvedChildId = null;

  if (childId) {
    const child = await Child.findOne({ _id: childId, userId: req.user?.userId });
    if (!child) return res.status(404).json({ error: "Child not found" });
    resolvedAgeGroup = child.ageGroup;
    resolvedChildId = child._id;
  }

  if (!resolvedAgeGroup) {
    return res.status(400).json({ error: "ageGroup is required when no childId is provided" });
  }

  try {
    const content = await generateContent({ question, ageGroup: resolvedAgeGroup, childEmotion });
    const safety = await safetyCheck({ question, ageGroup: resolvedAgeGroup, content });
    const finalAnswer = safety.flag === "unsafe" && safety.safeAnswer ? safety.safeAnswer : content.answer;

    const session = await QuestionSession.create({
      question,
      ageGroup: resolvedAgeGroup,
      userId: req.user?.userId,
      childId: resolvedChildId,
      childEmotion,
      analysis: content.analysis,
      answer: content.answer,
      finalAnswer,
      parentTips: content.parentTips,
      story: content.story,
      activities: content.activities,
      safetyFlag: safety.flag,
      safetyNotes: safety.notes,
      safeAnswer: safety.safeAnswer
    });

    return res.json({
      analysis: content.analysis,
      answer: finalAnswer,
      parentTips: content.parentTips,
      story: content.story,
      activities: content.activities,
      safety,
      id: session._id
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to process question" });
  }
};

export const getHistory = async (req, res) => {
  const query = req.validated?.query || {};
  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  try {
    const [items, total] = await Promise.all([
      QuestionSession.find({ userId: req.user?.userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      QuestionSession.countDocuments({ userId: req.user?.userId })
    ]);
    return res.json({ items, page, limit, total });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch history" });
  }
};

export const getQuestionById = async (req, res) => {
  try {
    const item = await QuestionSession.findOne({ _id: req.params.id, userId: req.user?.userId });
    if (!item) return res.status(404).json({ error: "Not found" });
    return res.json(item);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch entry" });
  }
};

export const giveFeedback = async (req, res) => {
  const body = req.validated?.body || req.body;
  const { helpful, rating, comment } = body;
  try {
    const session = await QuestionSession.findOne({ _id: req.params.id, userId: req.user?.userId });
    if (!session) return res.status(404).json({ error: "Not found" });

    session.feedback = session.feedback || [];
    session.feedback.push({ helpful, rating, comment });
    await session.save();

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to save feedback" });
  }
};
