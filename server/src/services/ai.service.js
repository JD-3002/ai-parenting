import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const MAX_OUTPUT_TOKENS = 600;

const ageBands = ["3-5", "6-8", "9-12"];

const systemPreamble =
  "You are AI Parenting Helper. You craft concise, kind, age-appropriate replies for children. Keep language simple, reassuring, bias-free, and avoid fear-inducing content. Never provide medical diagnoses or harmful instructions.";

const ageStyleGuidance = {
  "3-5": "Use very short, friendly sentences, with a touch of story tone.",
  "6-8": "Use simple examples and analogies; keep it concrete.",
  "9-12": "Give light reasoning and examples, but stay gentle and clear."
};

const getClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing");
  }
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      temperature: 0.7
    }
  });
};

const buildContentPrompt = ({ question, ageGroup, childEmotion }) => {
  const text = [
    systemPreamble,
    `Respect the requested age style: ${ageStyleGuidance[ageGroup]}`,
    "Generate structured help for a parent's answer to a child as JSON with keys: analysis (topic, intent, age_level, emotion), answer, parent_tips (list), story, activities (list).",
    "Constraints: keep answer <= 120 words; story <= 120 words; 3-4 activities.",
    "Keep tone gentle, positive, and non-frightening.",
    `Child question: ${question}`,
    `Child age group: ${ageGroup}`,
    childEmotion ? `Child emotion (optional): ${childEmotion}` : null
  ]
    .filter(Boolean)
    .join("\n");

  return [{ role: "user", parts: [{ text }] }];
};

const buildSafetyPrompt = ({ question, ageGroup, content }) => {
  const { analysis, answer, story, parentTips, activities } = content;
  const text = [
    "You are a strict child-safety reviewer.",
    "Check content for scientific correctness, emotional safety, non-violence, age appropriateness, neutrality, and absence of harmful instructions. If unsafe, rewrite the answer to be safe.",
    "Respond ONLY as JSON with keys: flag ('safe' or 'unsafe'), notes (list), safe_answer (present if rewritten).",
    `Child question: ${question}`,
    `Age group: ${ageGroup}`,
    `Analysis: ${JSON.stringify(analysis)}`,
    `Answer: ${answer}`,
    `Story: ${story}`,
    `Parent tips: ${JSON.stringify(parentTips)}`,
    `Activities: ${JSON.stringify(activities)}`
  ].join("\n");

  return [{ role: "user", parts: [{ text }] }];
};

const safeParseJSON = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("AI response was not valid JSON");
  }
};

const normalizeList = (val) => {
  if (Array.isArray(val)) return val;
  if (!val) return [];
  return [val].filter(Boolean).map(String);
};

export const generateContent = async ({ question, ageGroup, childEmotion }) => {
  if (!ageBands.includes(ageGroup)) {
    throw new Error("Invalid age group");
  }
  const model = getClient();

  const result = await model.generateContent({
    contents: buildContentPrompt({ question, ageGroup, childEmotion })
  });

  const raw = result.response?.text();
  if (!raw) throw new Error("No AI content returned");
  const parsed = safeParseJSON(raw);

  return {
    analysis: parsed.analysis,
    answer: parsed.answer,
    parentTips: normalizeList(parsed.parent_tips),
    story: parsed.story,
    activities: normalizeList(parsed.activities)
  };
};

export const safetyCheck = async ({ question, ageGroup, content }) => {
  const model = getClient();
  const result = await model.generateContent({
    contents: buildSafetyPrompt({ question, ageGroup, content }),
    generationConfig: { responseMimeType: "application/json", temperature: 0 }
  });

  const raw = result.response?.text();
  if (!raw) throw new Error("No safety response returned");
  const parsed = safeParseJSON(raw);

  return {
    flag: parsed.flag,
    notes: normalizeList(parsed.notes),
    safeAnswer: parsed.safe_answer
  };
};
