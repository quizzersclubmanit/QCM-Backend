import mongoose from 'mongoose';

const promoDriveSchema = new mongoose.Schema(
  {
    college: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
      index: true,
    },
    campusLocation: {
      type: String,
      trim: true,
      maxlength: 150,
      default: 'Bhopal',
    },
    driveDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'PLANNED',
      index: true,
    },
    leadMember: {
      type: String,
      trim: true,
      maxlength: 100,
      default: 'QCM Core',
    },
    volunteers: {
      type: [String],
      default: [],
    },
    contactPerson: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    contactPhone: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    contactEmail: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    expectedFootfall: {
      type: Number,
      min: 0,
      default: 0,
    },
    classroomPitches: {
      type: Number,
      min: 0,
      default: 0,
    },
    postersDistributed: {
      type: Number,
      min: 0,
      default: 0,
    },
    teamsRegisteredEstimate: {
      type: Number,
      min: 0,
      default: 0,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

const PromoDrive =
  mongoose.models.PromoDrive ||
  mongoose.model('PromoDrive', promoDriveSchema, 'qbit_promodrives');

export default PromoDrive;
