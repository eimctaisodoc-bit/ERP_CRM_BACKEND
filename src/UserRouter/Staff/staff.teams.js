import mongoose from "mongoose";

const teamSchema = new mongoose.Schema({
  org_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true
  },

  teamName: {
    type: String,
    required: true
  },

  teamLeader_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Login",
    required: true
  },

  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Login"
  }],

 
});

export default mongoose.model("Teams", teamSchema);