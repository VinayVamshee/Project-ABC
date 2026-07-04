import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 }, // must be 'seq'
});

export default mongoose.model("Counter", counterSchema);