import mongoose from 'mongoose';

const sponsorLeadSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    category: {
      type: String,
      enum: [
        'TITLE_SPONSOR',
        'POWERED_BY',
        'ASSOCIATE',
        'BEVERAGE_FOOD',
        'PRINTING_MERCH',
        'EDTECH',
        'MEDIA_PARTNER',
        'OTHER',
      ],
      default: 'ASSOCIATE',
      index: true,
    },
    contactPerson: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    designation: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 25,
    },
    email: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    status: {
      type: String,
      enum: [
        'LEAD',
        'CONTACTED',
        'PITCH_MEETING',
        'PROPOSAL_SENT',
        'NEGOTIATION',
        'CONFIRMED',
        'PAYMENT_RECEIVED',
        'DECLINED',
      ],
      default: 'LEAD',
      index: true,
    },
    leadMember: {
      type: String,
      trim: true,
      maxlength: 100,
      default: 'Sponsorship Team',
    },
    expectedAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    confirmedAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PARTIALLY_PAID', 'COMPLETED'],
      default: 'UNPAID',
    },
    deliverables: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    nextFollowUp: {
      type: Date,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

const SponsorLead =
  mongoose.models.SponsorLead ||
  mongoose.model('SponsorLead', sponsorLeadSchema, 'qbit_sponsors');

export default SponsorLead;
