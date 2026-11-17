const mongoose = require("mongoose");

//  new schema for notes and attachments
const AlternativeContactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    role: { type: String, trim: true },
    number: { type: String, trim: true },
    contactPersonNumber: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
  },
  { _id: true },
);

const NoteSchema = new mongoose.Schema(
  {
    type: { type: String, deafult: "note" },
    note: { type: String, trim: true },
    attachments: {
      type: Array,
      default: [],
    },
  },
  { _id: true, timestamps: true },
);

const EmailSchema = new mongoose.Schema(
  {
    type: { type: String, deafult: "email" },
    to: { type: [String], default: [] },
    subject: { type: String, trim: true },
    message: { type: String, trim: true },
    attachments: { type: [String], default: [] },
  },
  { _id: true, timestamps: true },
);

const MessageSchema = new mongoose.Schema(
  {
    type: { type: String, deafult: "message" },
    note: { type: String, trim: true },
    attachments: { type: [String], default: [] },
    Sdate: { type: String, default: "" },
    Edate: { type: String, default: "" },
    time: { type: String, deafult: "" },
  },
  { _id: true, timestamps: true },
);

const CallsSchema = new mongoose.Schema(
  {
    connected: { type: String, required: true },
    outcome: { type: String, required: true },
    fromDate: { type: String },
    toDate: { type: String },
    fromTime: { type: String },
    toTime: { type: String },
    note: { type: String }, // Maps to frontend "content"
    attachments: { type: Array, default: [] },
  },
  { _id: true, timestamps: true },
);

const PhysicalMeetingSchema = new mongoose.Schema(
  {
    meetingType: { type: String, trim: true, default: "physical" },
    title: { type: String, trim: true },
    location: { type: String, trim: true },
    attachments: { type: [String], default: [] },
    Sdate: { type: String, default: "" },
    Edate: { type: String, default: "" },
    fromTime: { type: String, default: "" },
    toTime: { type: String, default: "" },
    agenda: { type: String, trim: true },
    feedback: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Feedback cannot exceed 500 characters"],
    },
  },
  { _id: true, timestamps: true },
);

const VirtualMeetingSchema = new mongoose.Schema(
  {
    meetingType: { type: String, trim: true, default: "virtual" },
    title: { type: String, trim: true },
    link: { type: [String], trim: true },
    attachments: { type: Array, default: [] },
    Sdate: { type: String, default: "" },
    Edate: { type: String, default: "" },
    fromTime: { type: String },
    toTime: { type: String },
    agenda: { type: String, trim: true },
    feedback: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Feedback cannot exceed 500 characters"],
    },
  },
  { _id: true, timestamps: true },
);

const Stage1Schema = new mongoose.Schema(
  {
    leadId: { type: String },
    isFilled: { type: Boolean, default: false },
    currentStage: { type: Number, default: 1 },
    nextStage: { type: Number, default: 2 },
    active: { type: Boolean, default: true },

    noteSchema: {
      type: [NoteSchema],
      default: [],
    },

    emailSchema: {
      type: [EmailSchema],
      default: [],
    },

    callsSchema: {
      type: [CallsSchema],
      default: [],
    },
    message: {
      type: [MessageSchema],
      default: [],
    },

    physicalMeetingSchema: {
      type: [PhysicalMeetingSchema],
      default: [],
    },

    virtualMeetingSchema: {
      type: [VirtualMeetingSchema],
      default: [],
    },

    notification: {
      type: [String],
      default: [],
    },
  },
  { _id: true },
);

// For stage 3 only
const ContractPdfInfoSchema = new mongoose.Schema(
  {
    attachments: { type: Array, default: [] },
    uploadedAt: { type: Date, default: Date.now },
    to: { type: Array, default: [] },
    subject: { type: String, default: "" },
    message: { type: String, default: "" },
  },
  { _id: true },
);

const ProposalInfoSchema = new mongoose.Schema(
  {
    sendto: { type: [String], deafult: [] },
    termsAndConditions: { type: [String], default: [] },
    installments: { type: [mongoose.Schema.Types.Mixed], default: [] },
    proposalType: { type: String, default: "" },
    proposalSendVia: { type: String, default: "" },
    scopeOfServices: { type: String, default: "" },
    objectivesDeliverables: { type: String, default: "" },
    preparedBy: { type: String, default: "" },
    proposalDateFrom: { type: String, default: "" },
    proposalDateTo: { type: String, default: "" },
    duration: { type: String, default: "" },
    scheduleItems: { type: [mongoose.Schema.Types.Mixed], default: [] },
    attachments: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["ready", "processing", "sent"],
      default: "ready",
    },
  },
  { _id: true, timestamps: true },
);

const Stage2Schema = new mongoose.Schema({
  proposalInfo: { type: [ProposalInfoSchema], default: [] },
});

const OrganizationDetailsSchema = new mongoose.Schema(
  {
    organizationName: {
      type: String,
      trim: true,
    },

    organizationType: {
      type: String,
      trim: true,
    },

    industyType: {
      type: [String],
      default: [],
    },

    registrationNumber: {
      type: String,
      trim: true,
    },

    vatPan: {
      type: String,
      trim: true,
    },
    standard: {
      type: [String],
      default: [],
    },
    address: {
      type: String,
      trim: true,
    },

    orgTelephone: {
      type: String,
      trim: true,
    },

    orgEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },

    discounted: {
      type: Number,
      default: 0,
    },

    date: {
      type: String,
      default: "",
    },
    provinceNumber: {
      type: Number,
      enum: [1, 2, 3, 4, 5, 6, 7],
      default: 1,
    },
    province: {
      type: String,
      default: "",
    },

    district: {
      type: String,
      default: "",
    },

    localLevel: {
      type: String,
      default: "",
    },

    GradeFrom: {
      type: String,
      default: "1",
    },

    GradeTo: {
      type: String,
      default: "1",
    },
    totalEmp_learners: {
      type: String,
      default: "0",
    },

    employeeRange: {
      type: String,
      default: "",
    },

    totalEducator: {
      type: String,
      default: "0",
    },

    contactPersonName: {
      type: String,
      trim: true,
    },

    role: {
      type: String,
      trim: true,
    },

    contactPersonNumber: {
      type: String,
      trim: true,
    },

    contactPersonEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },

    alternativeContacts: {
      type: [AlternativeContactSchema],
      default: [],
    },
  },
  {
    _id: true,
    timestamps: true,
  },
);

const LeadDetailsSchema = new mongoose.Schema(
  {
    leadID: {
      type: String,
      trim: true,
      unique: true,
      required: true,
    },
    leadType: {
      type: String,
      trim: true,
    },

    leadSource: {
      type: String,
      trim: true,
    },

    leadChannel: {
      type: String,
      trim: true,
    },

    campaignName: {
      type: String,
      trim: true,
    },

    assignedSalesRep: {
      type: String,
      trim: true,
    },

    ProductInterested: {
      type: [String],
      default: [],
    },

    branch: {
      type: String,
      trim: true,
    },
    provinceNumber: {
      type: Number,
      enum: [1, 2, 3, 4, 5, 6, 7],
      default: 1,
    },
    province: {
      type: String,
      trim: true,
    },
    district: {
      type: String,
      trim: true,
    },
    localLevel: {
      type: String,
      trim: true,
    },
    wardNo: {
      type: String,
      trim: true,
    },

    toleName: {
      type: String,
      trim: true,
    },
    salesManager: {
      type: String,
      trim: true,
    },

    salesManagerId: {
      type: String,
      trim: true,
    },

    notes: {
      type: String,
      trim: true,
    },

    isConverted: {
      type: Boolean,
      default: false,
    },

    isContracted: {
      type: Boolean,
      default: false,
    },
    isTerminated: {
      type: Boolean,
      default: false,
    },
    isNew: {
      type: Boolean,
      default: true,
    },
    terminationReason: {
      type: String,
      trim: true,
    },
    terminationReason_contract: {
      type: String,
      trim: true,
    },
  },
  {
    _id: true,
    timestamps: true,
    suppressReservedKeysWarning: true,
  },
);

const OwnershipSchema = new mongoose.Schema(
  {
    assignedSalesRep: {
      type: String,
      trim: true,
    },
    salesManager: {
      type: String,
      trim: true,
    },
    LeadPickDate: {
      type: String,
      trim: true,
      default: "",
    },
    LeadPickTime: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: true,
    timestamps: true,
  },
);

// Holiday Item Schema (for staff holiday management)
const holidayItemSchema = new mongoose.Schema(
  {
    sn: {
      type: Number,
      required: true,
    },
    holidayTitle: {
      type: String,
      required: true,
      trim: true,
    },
    fromDateBs: {
      type: String,
      required: true,
    },
    toDateBs: {
      type: String,
      required: true,
    },
  },
  {
    _id: true,
    timestamps: true,
  },
);

const JobAssignSchema = new mongoose.Schema(
  {
    // ── Clause 1: Responsibility & Authority ──
    responsiblePerson: {
      type: String,
      required: true,
      trim: true,
    },

    clientOrganisation: {
      type: String,
      required: true,
      trim: true,
    },

    processOwner: {
      type: String,
      required: true,
      trim: true,
    },

    activityType: {
      type: String,
      required: true,
      trim: true,
    },

    activityScope: {
      type: String,
      default: "",
      maxlength: 1000,
    },

    executionMode: {
      type: String,
      enum: ["Onsite", "InOffice"],
      default: "Onsite",
    },

    // ── Clause 2: Service Provision & Logistics ──
    serviceActivity: {
      type: String,
      required: true,
      trim: true,
    },

    transportRequired: {
      type: Boolean,
      default: true,
    },

    propellantType: {
      type: String,
      enum: ["Petrol", "Diesel", "EV", "Hybrid"],
      default: "Petrol",
    },

    conveyanceClass: {
      type: String,
      enum: ["Car", "Bike", "Van", "Public"],
      default: "Car",
    },

    vehicleRegNo: {
      type: String,
      trim: true,
      default: "",
    },

    selectedPersonnel: [
      {
        type: [],
        default: [],
      },
    ],

    // ── Clause 3: Planning Dates ──
    plannedStartDate: {
      type: Date,
      required: true,
    },

    plannedEndDate: {
      type: Date,
      required: true,
    },

    // ── Clause 4: Notes / Instructions ──
    Notes: {
      type: String,
      maxlength: 500,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
);

const Stage7Schema = new mongoose.Schema(
  {
    holidayItems: {
      type: [holidayItemSchema],
      default: [],
    },

    jobAssignItems: {
      type: [JobAssignSchema],
      default: [],
    },

    currentStage: {
      type: Number,
      default: 7,
    },

    nextStage: {
      type: Number,
      default: 8,
    },

    active: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: true,
    timestamps: true,
  },
);

const PipelineInfoSchema = new mongoose.Schema(
  {
    pipelineName: { type: String },
    stages: {
      Stage1: {
        type: [Stage1Schema],
        default: [],
        currentStage: 1,
        nextStage: 2,
        active: true,
      },

      Stage2: {
        type: [Stage2Schema],
        default: [],
        currentStage: 2,
        nextStage: 3,
        active: false,
      },

      Stage3: {
        type: [ContractPdfInfoSchema],
        default: [],
        currentStage: 3,
        nextStage: 4,
        active: false,
      },

      Stage4: {
        type: [Stage7Schema],
        default: () => ({}),
        currentStage: 4,
        nextStage: 5,
        active: false,
      },
    },
  },
  { _id: true, timestamps: true },
);

// -----------------------------
// Main Sale Schema
// -----------------------------
const SaleSchema = new mongoose.Schema(
  {
    organizationDetails: [OrganizationDetailsSchema],
    leadDetails: [LeadDetailsSchema],
    ownershipDetails: [OwnershipSchema],
    details: [PipelineInfoSchema],

    handleBranch: { type: Number },
  },
  { timestamps: true },
);

module.exports = mongoose.model("organizations", SaleSchema);
