import mongoose from "mongoose";

const ChildSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    ageGroup: { type: String, enum: ["3-5", "6-8", "9-12"], required: true },
    notes: String
  },
  { timestamps: true }
);

const Child = mongoose.model("Child", ChildSchema);
export default Child;
