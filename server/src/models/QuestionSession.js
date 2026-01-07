import mongoose from "mongoose";

const AnalysisSchema = new mongoose.Schema(
  {
    topic: String,
    intent: String,
    age_level: String,
    emotion: String
  },
  { _id: false }
);

const QuestionSessionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    ageGroup: { type: String, enum: ["3-5", "6-8", "9-12"], required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    childId: { type: mongoose.Schema.Types.ObjectId, ref: "Child" },
    childEmotion: String,
    analysis: AnalysisSchema,
    answer: String,
    finalAnswer: String,
    parentTips: [String],
    story: String,
    activities: [String],
    safetyFlag: { type: String, enum: ["safe", "unsafe"], default: "safe" },
    safetyNotes: [String],
    safeAnswer: String,
    feedback: [
      new mongoose.Schema(
        {
          helpful: Boolean,
          rating: { type: Number, min: 1, max: 5 },
          comment: String
        },
        { _id: false, timestamps: { createdAt: true, updatedAt: false } }
      )
    ]
  },
  { timestamps: true }
);

const QuestionSession = mongoose.model("QuestionSession", QuestionSessionSchema);
export default QuestionSession;
