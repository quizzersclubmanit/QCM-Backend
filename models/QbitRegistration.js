
import mongoose from 'mongoose';
import { MIN_MEMBERS, MAX_MEMBERS } from '../utils/validateTeam.js';

const memberSchema = new mongoose.Schema(
  {
    name:   { type: String, required: true, maxlength: 80 },
    phone:  { type: String, required: true },
    email:  { type: String, required: true, lowercase: true, maxlength: 120 },
    course: { type: String, required: true, maxlength: 100 },
  },
  { _id: false }
);

const registrationSchema = new mongoose.Schema(
  {
    teamName:         { type: String, required: true, maxlength: 80 },
    teamKey:          { type: String, required: true, unique: true }, // lowercase team name, blocks duplicate teams
    college:          { type: String, required: true, maxlength: 150 },
    registrationCode: { type: String, unique: true, sparse: true, index: true }, // e.g. QBIT-26-0001
    status:           { type: String, enum: ['CONFIRMED', 'CHECKED_IN', 'DISQUALIFIED'], default: 'CONFIRMED' },
    checkedIn:        { type: Boolean, default: false },
    checkedInAt:      { type: Date },
    checkedInBy:      { type: String },
    notes:            { type: String, maxlength: 500 },
    source:           { type: String, default: 'website' },
    members:          { type: [memberSchema], validate: (m) => m && m.length === 4 },
  },
  { timestamps: true }
);


const QbitRegistration =
  mongoose.models.QbitRegistration ||
  mongoose.model('QbitRegistration', registrationSchema, 'qbit_registrations');

export default QbitRegistration;