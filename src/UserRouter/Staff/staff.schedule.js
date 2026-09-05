import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema({
  org_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true
  },

  teams_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    required: true
  },

  standard: {
    type: String,
    required: true
  },
  timeframe: [{
    login_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Login"
    },
    Sdate: String,
    Edate: String,
    Stime: String,
    Etime: String
  }]
});

export default mongoose.model("Schedule", scheduleSchema);