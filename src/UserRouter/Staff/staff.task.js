import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  timeFrame_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teams",
    required: true
  },

  title: {
    type: String,
    required: true
  },

  description: {
    type: String
  },

});

export default mongoose.model("Task", taskSchema);