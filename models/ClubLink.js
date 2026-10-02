import mongoose from 'mongoose';

const clubLinkSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
      index: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    type: {
      type: String,
      enum: ['SHEET', 'DRIVE'],
      required: true,
      index: true,
    },
    category: {
      type: String,
      trim: true,
      maxlength: 80,
      default: 'General',
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    addedBy: {
      type: String,
      trim: true,
      maxlength: 100,
      default: 'Core Team',
    },
  },
  { timestamps: true }
);

const ClubLink =
  mongoose.models.ClubLink ||
  mongoose.model('ClubLink', clubLinkSchema, 'qbit_club_links');

export default ClubLink;
