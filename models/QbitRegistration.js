import mongoose from 'mongoose';
import { MAX_MEMBERS } from '../utils/validateTeam.js';

const memberSchema = new mongoose.Schema(
  {
    name:   { type: String, required: true, maxlength: 80 },
    phone:  { type: String, required: true, match: /^[6-9]\d{9}$/ },
    course: { type: String, required: true, maxlength: 100 },
  },
  { _id: false }
);

const registrationSchema = new mongoose.Schema(
  {
    teamName:         { type: String, required: true, maxlength: 80 },
    teamKey:          { type: String, required: true, unique: true },
    college:          { type: String, required: true, maxlength: 150 },
    email:            { type: String, required: true, lowercase: true, trim: true, maxlength: 120, unique: true },
    registrationCode: { type: String, required: true, unique: true },
    status:           { type: String, enum: ['CONFIRMED', 'CHECKED_IN', 'DISQUALIFIED'], default: 'CONFIRMED' },
    checkedIn:        { type: Boolean, default: false },
    checkedInAt:      { type: Date },
    checkedInBy:      { type: String },
    notes:            { type: String, maxlength: 500 },
    source:           { type: String, default: 'website' },
    members:          { type: [memberSchema], validate: (m) => m && m.length === MAX_MEMBERS },
  },
  { timestamps: true }
);


registrationSchema.index({ 'members.phone': 1 }, { unique: true });

const QbitRegistration =
  mongoose.models.QbitRegistration ||
  mongoose.model('QbitRegistration', registrationSchema, 'qbit_registrations');

export default QbitRegistration;