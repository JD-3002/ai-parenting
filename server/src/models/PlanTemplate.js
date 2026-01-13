import mongoose from "mongoose";

const ScheduleItemSchema = new mongoose.Schema(
  {
    block: { type: String },
    items: [{ type: String }]
  },
  { _id: false }
);

const PlanSchema = new mongoose.Schema(
  {
    overview: String,
    schedule: [ScheduleItemSchema],
    script: String,
    tips: [String],
    boundaries: [String],
    activities: [String],
    reminders: [String]
  },
  { _id: false }
);

const PlanTemplateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ["daily_routine", "bedtime_script", "screen_time_plan", "tricky_moment_script"],
      required: true
    },
    ageGroup: { type: String, enum: ["3-5", "6-8", "9-12"], required: true },
    goal: { type: String },
    childEmotion: String,
    tone: { type: String, enum: ["supportive", "concise"], default: "supportive" },
    language: { type: String, default: "en" },
    plan: PlanSchema
  },
  { timestamps: true }
);

const PlanTemplate = mongoose.model("PlanTemplate", PlanTemplateSchema);
export default PlanTemplate;
