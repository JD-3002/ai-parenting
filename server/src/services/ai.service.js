import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const MAX_OUTPUT_TOKENS = 600;

const ageBands = ["3-5", "6-8", "9-12"];
const tones = ["supportive", "concise"];

const systemPreamble =
  "You are AI Parenting Helper. You craft concise, kind, age-appropriate replies for children. Keep language simple, reassuring, bias-free, and avoid fear-inducing content. Never provide medical diagnoses or harmful instructions.";

const ageStyleGuidance = {
  "3-5": "Use very short, friendly sentences, with a touch of story tone.",
  "6-8": "Use simple examples and analogies; keep it concrete.",
  "9-12": "Give light reasoning and examples, but stay gentle and clear."
};

const toneGuidance = {
  supportive: "Warm, encouraging, gentle, a bit more detailed.",
  concise: "Tight, actionable, short sentences while staying kind."
};

const getResponseText = (resp) => {
  if (!resp) return null;
  try {
    const direct = resp.text?.();
    if (direct) return direct;
  } catch {
    /* fallback */
  }
  try {
    const parts = resp.candidates?.[0]?.content?.parts || [];
    const joined = parts.map((p) => p.text).filter(Boolean).join("\n");
    if (joined?.trim()) return joined;
  } catch {
    /* ignore */
  }
  return null;
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

const formatContextTurns = (turns = []) =>
  turns
    .map(
      (turn, idx) =>
        `Turn ${idx + 1} - Question: ${turn.question} | Answer: ${turn.answer || turn.finalAnswer || ""}`.trim()
    )
    .join("\n");

const buildContentPrompt = ({ question, ageGroup, childEmotion, tone, language, contextTurns = [] }) => {
  const toneText = toneGuidance[tone] || toneGuidance.supportive;
  const languageText =
    language && language.toLowerCase() !== "en"
      ? `Respond in ${language}.`
      : "Respond in English.";

  const text = [
    systemPreamble,
    `Respect the requested age style: ${ageStyleGuidance[ageGroup]}`,
    `Tone guidance: ${toneText}`,
    languageText,
    "Generate structured help for a parent's answer to a child as JSON with keys: analysis (topic, intent, age_level, emotion), answer, parent_tips (list), story, activities (list).",
    "Constraints: keep answer <= 120 words; story <= 120 words; 3-4 activities.",
    "Keep tone gentle, positive, and non-frightening.",
    contextTurns.length ? `Conversation so far:\n${formatContextTurns(contextTurns)}` : null,
    `Child question: ${question}`,
    `Child age group: ${ageGroup}`,
    childEmotion ? `Child emotion (optional): ${childEmotion}` : null
  ]
    .filter(Boolean)
    .join("\n");

  return [{ role: "user", parts: [{ text }] }];
};

const buildSafetyPrompt = ({ question, ageGroup, content, language, tone }) => {
  const { analysis, answer, story, parentTips, activities } = content;
  const languageText =
    language && language.toLowerCase() !== "en"
      ? `Rewrite unsafe content in ${language} if needed.`
      : "Rewrite unsafe content in English if needed.";
  const toneText = toneGuidance[tone] || toneGuidance.supportive;
  const text = [
    "You are a strict child-safety reviewer.",
    "Check content for scientific correctness, emotional safety, non-violence, age appropriateness, neutrality, and absence of harmful instructions. If unsafe, rewrite the answer to be safe.",
    `Tone target: ${toneText}`,
    languageText,
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

const unwrapCodeFence = (text) => {
  const fenced = text.trim();
  if (fenced.startsWith("```")) {
    return fenced.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  return fenced;
};

const extractJSONLike = (text) => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }
  return text;
};

const safeParseJSON = (text) => {
  const attempts = [text, unwrapCodeFence(text), extractJSONLike(text)];
  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch {
      /* try next */
    }
  }
  const snippet = String(text || "").slice(0, 180);
  throw new Error(`AI response was not valid JSON${snippet ? `: ${snippet}` : ""}`);
};

const normalizeList = (val) => {
  if (Array.isArray(val)) return val;
  if (!val) return [];
  return [val].filter(Boolean).map(String);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const callWithRetry = async (fn, { retries = 1, delayMs = 400 } = {}) => {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = err?.status || err?.statusCode;
      if (status === 503 && attempt < retries) {
        await sleep(delayMs * (attempt + 1));
        continue;
      }
      break;
    }
  }
  throw lastErr;
};

const normalizeTone = (tone) => (tones.includes(tone) ? tone : "supportive");

const normalizeLanguage = (language) => (language ? language : "en");

export const generateContent = async ({ question, ageGroup, childEmotion, tone, language, contextTurns }) => {
  if (!ageBands.includes(ageGroup)) {
    throw new Error("Invalid age group");
  }
  const resolvedTone = normalizeTone(tone);
  const resolvedLanguage = normalizeLanguage(language);
  const model = getClient();

  const result = await model.generateContent({
    contents: buildContentPrompt({
      question,
      ageGroup,
      childEmotion,
      tone: resolvedTone,
      language: resolvedLanguage,
      contextTurns
    })
  });

  const raw = getResponseText(result.response);
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

export const safetyCheck = async ({ question, ageGroup, content, language, tone }) => {
  const resolvedTone = normalizeTone(tone);
  const resolvedLanguage = normalizeLanguage(language);
  const model = getClient();
  const result = await model.generateContent({
    contents: buildSafetyPrompt({
      question,
      ageGroup,
      content,
      language: resolvedLanguage,
      tone: resolvedTone
    }),
    generationConfig: { responseMimeType: "application/json", temperature: 0 }
  });

  const raw = getResponseText(result.response);
  if (!raw) throw new Error("No safety response returned");
  const parsed = safeParseJSON(raw);

  return {
    flag: parsed.flag,
    notes: normalizeList(parsed.notes),
    safeAnswer: parsed.safe_answer
  };
};

export const generateFollowUpContent = async ({
  question,
  ageGroup,
  childEmotion,
  tone,
  language,
  priorTurns
}) => {
  return generateContent({
    question,
    ageGroup,
    childEmotion,
    tone,
    language,
    contextTurns: priorTurns
  });
};

const planTypeGuidance = {
  daily_routine: "Design a clear daily routine with morning, afternoon, and evening blocks. Keep transitions gentle.",
  bedtime_script: "Create a calming bedtime flow with a short caregiver script and wind-down steps.",
  screen_time_plan: "Offer balanced screen-time schedule, rules, positive alternatives, and a talk track.",
  tricky_moment_script:
    "Provide short 'what to say' scripts and simple steps to handle the tricky moment described in the goal."
};

const buildPlanPrompt = ({ type, ageGroup, goal, childEmotion, tone, language, strict }) => {
  const toneText = toneGuidance[tone] || toneGuidance.supportive;
  const languageText =
    language && language.toLowerCase() !== "en"
      ? `Respond in ${language}.`
      : "Respond in English.";
  const typeGuidance = planTypeGuidance[type] || "Offer a clear, kind plan.";
  const schemaLine =
    'Format EXACTLY as JSON: {"overview":"string","schedule":[{"block":"string","items":["string"]}],"script":"string","tips":["string"],"boundaries":["string"],"activities":["string"],"reminders":["string"]}. No extra fields.';

  const text = [
    systemPreamble,
    `Respect the requested age style: ${ageStyleGuidance[ageGroup]}`,
    `Tone guidance: ${toneText}`,
    languageText,
    typeGuidance,
    "Return JSON with keys: overview, schedule (list of {block, items}), script, tips (list), boundaries (list), activities (list), reminders (list).",
    "Keep each item concrete and actionable. Avoid medical advice.",
    strict ? schemaLine : "Respond only as JSON.",
    strict ? "Do NOT wrap in code fences. If unsure, set empty string or empty array. Keep values under 50 words." : null,
    `Plan type: ${type}`,
    `Goal/focus: ${goal}`,
    childEmotion ? `Child emotion: ${childEmotion}` : null,
    `Age group: ${ageGroup}`
  ]
    .filter(Boolean)
    .join("\n");

  return [{ role: "user", parts: [{ text }] }];
};

const normalizeSchedule = (schedule) => {
  if (!Array.isArray(schedule)) return [];
  return schedule
    .map((s) => ({
      block: s.block || s.time_of_day || s.title || "",
      items: normalizeList(s.items || s.steps || s.activities)
    }))
    .filter((s) => s.block || s.items.length);
};

const normalizePlanResponse = (parsed) => ({
  overview: parsed.overview,
  schedule: normalizeSchedule(parsed.schedule || parsed.routine),
  script: parsed.script || parsed.talk_track,
  tips: normalizeList(parsed.tips),
  boundaries: normalizeList(parsed.boundaries || parsed.rules),
  activities: normalizeList(parsed.activities || parsed.alternatives),
  reminders: normalizeList(parsed.reminders || parsed.nudges)
});

export const generatePlanContent = async ({ type, ageGroup, goal, childEmotion, tone, language }) => {
  if (!ageBands.includes(ageGroup)) {
    throw new Error("Invalid age group");
  }
  const resolvedTone = normalizeTone(tone);
  const resolvedLanguage = normalizeLanguage(language);
  const model = getClient();

  const callPlan = (strict) =>
    callWithRetry(
      () =>
        model.generateContent({
          contents: buildPlanPrompt({
            type,
            ageGroup,
            goal,
            childEmotion,
            tone: resolvedTone,
            language: resolvedLanguage,
            strict
          }),
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: strict ? Math.max(MAX_OUTPUT_TOKENS, 550) : Math.max(MAX_OUTPUT_TOKENS, 750),
            temperature: strict ? 0.35 : 0.55
          }
        }),
      { retries: 2, delayMs: 600 }
    );

  // Try strict first to maximize well-formed JSON; fall back to a slightly looser attempt if needed.
  try {
    const result = await callPlan(true);
    const raw = getResponseText(result.response);
    if (!raw) throw new Error("No plan content returned (strict)");
    const parsed = safeParseJSON(raw);
    return normalizePlanResponse(parsed);
  } catch (err) {
    const result = await callPlan(false);
    const raw = getResponseText(result.response);
    if (!raw) throw new Error("No plan content returned");
    const parsed = safeParseJSON(raw);
    return normalizePlanResponse(parsed);
  }
};
