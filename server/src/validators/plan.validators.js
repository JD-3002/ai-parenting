import { z } from "zod";

const toneEnum = z.enum(["supportive", "concise"]);
const ageEnum = z.enum(["3-5", "6-8", "9-12"]);
const planTypeEnum = z.enum(["daily_routine", "bedtime_script", "screen_time_plan", "tricky_moment_script"]);

export const generatePlanSchema = z.object({
  type: planTypeEnum,
  ageGroup: ageEnum,
  goal: z.string().trim().min(5, "goal is too short").max(300, "goal is too long"),
  childEmotion: z.string().trim().max(50, "emotion too long").optional(),
  tone: toneEnum.optional(),
  language: z.string().trim().max(20).optional(),
  title: z.string().trim().min(3, "title too short").max(120, "title too long").optional(),
  saveTemplate: z.boolean().optional()
});

export const templateIdSchema = z.object({
  id: z.string().trim().min(1)
});
