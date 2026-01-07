import { z } from "zod";

export const askSchema = z.object({
  question: z.string().trim().min(5, "question is too short").max(500, "question too long"),
  ageGroup: z.enum(["3-5", "6-8", "9-12"]).optional(),
  childEmotion: z.string().trim().max(50, "emotion too long").optional(),
  childId: z.string().trim().optional()
}).refine((data) => data.ageGroup || data.childId, {
  message: "Provide ageGroup or childId",
  path: ["ageGroup"]
});

export const feedbackSchema = z
  .object({
    helpful: z.boolean().optional(),
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().trim().max(500, "comment too long").optional()
  })
  .refine((data) => data.helpful !== undefined || data.rating !== undefined || data.comment, {
    message: "Provide helpful, rating, or comment",
    path: ["feedback"]
  });

export const historyQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().min(1).default(1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .pipe(z.number().int().min(1).max(100).default(20))
});

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100),
  name: z.string().trim().max(100).optional()
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export const childCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  ageGroup: z.enum(["3-5", "6-8", "9-12"]),
  notes: z.string().trim().max(300).optional()
});

export const childUpdateSchema = childCreateSchema.partial();
