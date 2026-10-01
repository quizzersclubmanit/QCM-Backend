
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
    teamName: { type: String, required: true, maxlength: 80 },
    teamKey:  { type: String, required: true, unique: true }, // lowercase team name, blocks duplicate teams
    college:  { type: String, required: true, maxlength: 150 },
    members:  { type: [memberSchema], validate: (m) => m.length >= MIN_MEMBERS && m.length <= MAX_MEMBERS },
  },
  { timestamps: true }
);


const QbitRegistration =
  mongoose.models.QbitRegistration ||
  mongoose.model('QbitRegistration', registrationSchema, 'qbit_registrations');

export default QbitRegistration;