import express from 'express';
import PromoDrive from '../models/PromoDrive.js';
import SponsorLead from '../models/SponsorLead.js';
import { requireStaff, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/* ==========================================================================
   PROMOTIONAL DRIVES
   ========================================================================== */

// GET /api/drives/promo - List promotional drives with search & stats
router.get('/promo', requireStaff, async (req, res) => {
  try {
    const { status, search, sortBy = 'driveDate', sortOrder = 'desc' } = req.query;

    const query = {};
    if (status) query.status = status;
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { college: regex },
        { campusLocation: regex },
        { leadMember: regex },
        { contactPerson: regex },
      ];
    }

    const sortObj = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [drives, statsAgg] = await Promise.all([
      PromoDrive.find(query).sort(sortObj).lean(),
      PromoDrive.aggregate([
        {
          $group: {
            _id: null,
            totalDrives: { $sum: 1 },
            completedDrives: {
              $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] },
            },
            plannedDrives: {
              $sum: { $cond: [{ $eq: ['$status', 'PLANNED'] }, 1, 0] },
            },
            totalFootfall: { $sum: '$expectedFootfall' },
            totalClassroomPitches: { $sum: '$classroomPitches' },
            totalPosters: { $sum: '$postersDistributed' },
            totalEstimatedTeams: { $sum: '$teamsRegisteredEstimate' },
          },
        },
      ]),
    ]);

    const stats = statsAgg[0] || {
      totalDrives: 0,
      completedDrives: 0,
      plannedDrives: 0,
      totalFootfall: 0,
      totalClassroomPitches: 0,
      totalPosters: 0,
      totalEstimatedTeams: 0,
    };

    res.json({ success: true, drives, stats });
  } catch (error) {
    console.error('Error fetching promo drives:', error);
    res.status(500).json({ error: 'Failed to fetch promotional drives' });
  }
});

// POST /api/drives/promo - Create new promo drive
router.post('/promo', requireStaff, async (req, res) => {
  try {
    const {
      college,
      campusLocation,
      driveDate,
      status,
      leadMember,
      volunteers,
      contactPerson,
      contactPhone,
      contactEmail,
      expectedFootfall,
      classroomPitches,
      postersDistributed,
      teamsRegisteredEstimate,
      notes,
    } = req.body;

    if (!college || !college.trim()) {
      return res.status(400).json({ error: 'College name is required' });
    }

    const drive = new PromoDrive({
      college: college.trim(),
      campusLocation: campusLocation ? campusLocation.trim() : 'Bhopal',
      driveDate: driveDate ? new Date(driveDate) : new Date(),
      status: status || 'PLANNED',
      leadMember: leadMember ? leadMember.trim() : 'QCM Core',
      volunteers: Array.isArray(volunteers) ? volunteers : [],
      contactPerson: contactPerson ? contactPerson.trim() : '',
      contactPhone: contactPhone ? contactPhone.trim() : '',
      contactEmail: contactEmail ? contactEmail.trim() : '',
      expectedFootfall: Number(expectedFootfall) || 0,
      classroomPitches: Number(classroomPitches) || 0,
      postersDistributed: Number(postersDistributed) || 0,
      teamsRegisteredEstimate: Number(teamsRegisteredEstimate) || 0,
      notes: notes ? notes.trim() : '',
    });

    const saved = await drive.save();
    res.status(201).json({ success: true, drive: saved });
  } catch (error) {
    console.error('Error creating promo drive:', error);
    res.status(500).json({ error: 'Failed to create promotional drive' });
  }
});

// PATCH /api/drives/promo/:id - Update promo drive
router.patch('/promo/:id', requireStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    delete updates._id;

    if (updates.driveDate) {
      updates.driveDate = new Date(updates.driveDate);
    }

    const drive = await PromoDrive.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!drive) {
      return res.status(404).json({ error: 'Promo drive not found' });
    }

    res.json({ success: true, drive });
  } catch (error) {
    console.error('Error updating promo drive:', error);
    res.status(500).json({ error: 'Failed to update promotional drive' });
  }
});

// DELETE /api/drives/promo/:id - Delete promo drive (Admin only)
router.delete('/promo/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await PromoDrive.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Promo drive not found' });
    }
    res.json({ success: true, message: 'Promotional drive deleted successfully' });
  } catch (error) {
    console.error('Error deleting promo drive:', error);
    res.status(500).json({ error: 'Failed to delete promotional drive' });
  }
});

// GET /api/drives/promo/export - CSV export for promo drives
router.get('/promo/export', requireStaff, async (req, res) => {
  try {
    const drives = await PromoDrive.find({}).sort({ driveDate: 1 }).lean();

    const headers = [
      'College',
      'Campus Location',
      'Drive Date',
      'Status',
      'Lead Member',
      'POC Name',
      'POC Phone',
      'Footfall',
      'Classroom Pitches',
      'Posters',
      'Est. Teams',
      'Notes',
    ];

    const escapeCsv = (val) => {
      const s = String(val == null ? '' : val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = drives.map((d) => [
      escapeCsv(d.college),
      escapeCsv(d.campusLocation),
      escapeCsv(d.driveDate ? new Date(d.driveDate).toLocaleDateString('en-IN') : ''),
      escapeCsv(d.status),
      escapeCsv(d.leadMember),
      escapeCsv(d.contactPerson),
      escapeCsv(d.contactPhone),
      d.expectedFootfall || 0,
      d.classroomPitches || 0,
      d.postersDistributed || 0,
      d.teamsRegisteredEstimate || 0,
      escapeCsv(d.notes),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="qbit26_promotional_drives_${new Date().toISOString().slice(0, 10)}.csv"`
    );
    return res.send(csvContent);
  } catch (error) {
    console.error('Error exporting promo drives:', error);
    res.status(500).json({ error: 'Failed to export promotional drives' });
  }
});

/* ==========================================================================
   SPONSORSHIP PIPELINE
   ========================================================================== */

// GET /api/drives/sponsors - List sponsor leads with stats
router.get('/sponsors', requireStaff, async (req, res) => {
  try {
    const { status, category, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { companyName: regex },
        { contactPerson: regex },
        { designation: regex },
        { leadMember: regex },
        { phone: regex },
      ];
    }

    const sortObj = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [sponsors, statsAgg] = await Promise.all([
      SponsorLead.find(query).sort(sortObj).lean(),
      SponsorLead.aggregate([
        {
          $group: {
            _id: null,
            totalLeads: { $sum: 1 },
            confirmedLeads: {
              $sum: { $cond: [{ $in: ['$status', ['CONFIRMED', 'PAYMENT_RECEIVED']] }, 1, 0] },
            },
            totalExpectedINR: { $sum: '$expectedAmount' },
            totalConfirmedINR: { $sum: '$confirmedAmount' },
            totalReceivedINR: {
              $sum: { $cond: [{ $eq: ['$paymentStatus', 'COMPLETED'] }, '$confirmedAmount', 0] },
            },
          },
        },
      ]),
    ]);

    const stats = statsAgg[0] || {
      totalLeads: 0,
      confirmedLeads: 0,
      totalExpectedINR: 0,
      totalConfirmedINR: 0,
      totalReceivedINR: 0,
    };

    res.json({ success: true, sponsors, stats });
  } catch (error) {
    console.error('Error fetching sponsors:', error);
    res.status(500).json({ error: 'Failed to fetch sponsorship leads' });
  }
});

// POST /api/drives/sponsors - Add sponsor lead
router.post('/sponsors', requireStaff, async (req, res) => {
  try {
    const {
      companyName,
      category,
      contactPerson,
      designation,
      phone,
      email,
      status,
      leadMember,
      expectedAmount,
      confirmedAmount,
      paymentStatus,
      deliverables,
      nextFollowUp,
      notes,
    } = req.body;

    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ error: 'Company/Brand name is required' });
    }
    if (!contactPerson || !contactPerson.trim()) {
      return res.status(400).json({ error: 'Contact person is required' });
    }

    const lead = new SponsorLead({
      companyName: companyName.trim(),
      category: category || 'ASSOCIATE',
      contactPerson: contactPerson.trim(),
      designation: designation ? designation.trim() : '',
      phone: phone ? phone.trim() : '',
      email: email ? email.trim() : '',
      status: status || 'LEAD',
      leadMember: leadMember ? leadMember.trim() : 'Sponsorship Team',
      expectedAmount: Number(expectedAmount) || 0,
      confirmedAmount: Number(confirmedAmount) || 0,
      paymentStatus: paymentStatus || 'UNPAID',
      deliverables: deliverables ? deliverables.trim() : '',
      nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : undefined,
      notes: notes ? notes.trim() : '',
    });

    const saved = await lead.save();
    res.status(201).json({ success: true, sponsor: saved });
  } catch (error) {
    console.error('Error creating sponsor lead:', error);
    res.status(500).json({ error: 'Failed to add sponsor lead' });
  }
});

// PATCH /api/drives/sponsors/:id - Update sponsor lead
router.patch('/sponsors/:id', requireStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    delete updates._id;

    if (updates.nextFollowUp) {
      updates.nextFollowUp = new Date(updates.nextFollowUp);
    }
    if (updates.expectedAmount !== undefined) {
      updates.expectedAmount = Number(updates.expectedAmount) || 0;
    }
    if (updates.confirmedAmount !== undefined) {
      updates.confirmedAmount = Number(updates.confirmedAmount) || 0;
    }

    const sponsor = await SponsorLead.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!sponsor) {
      return res.status(404).json({ error: 'Sponsor lead not found' });
    }

    res.json({ success: true, sponsor });
  } catch (error) {
    console.error('Error updating sponsor lead:', error);
    res.status(500).json({ error: 'Failed to update sponsor lead' });
  }
});

// DELETE /api/drives/sponsors/:id - Delete sponsor lead (Admin only)
router.delete('/sponsors/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await SponsorLead.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Sponsor lead not found' });
    }
    res.json({ success: true, message: 'Sponsor lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting sponsor lead:', error);
    res.status(500).json({ error: 'Failed to delete sponsor lead' });
  }
});

// GET /api/drives/sponsors/export - CSV export for sponsors
router.get('/sponsors/export', requireStaff, async (req, res) => {
  try {
    const sponsors = await SponsorLead.find({}).sort({ createdAt: -1 }).lean();

    const headers = [
      'Company Name',
      'Category / Tier',
      'Contact Person',
      'Designation',
      'Phone',
      'Email',
      'Status',
      'Account Lead',
      'Expected Amount (INR)',
      'Confirmed Amount (INR)',
      'Payment Status',
      'Next Follow-Up',
      'Deliverables',
      'Notes',
    ];

    const escapeCsv = (val) => {
      const s = String(val == null ? '' : val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = sponsors.map((s) => [
      escapeCsv(s.companyName),
      escapeCsv(s.category),
      escapeCsv(s.contactPerson),
      escapeCsv(s.designation),
      escapeCsv(s.phone),
      escapeCsv(s.email),
      escapeCsv(s.status),
      escapeCsv(s.leadMember),
      s.expectedAmount || 0,
      s.confirmedAmount || 0,
      escapeCsv(s.paymentStatus),
      escapeCsv(s.nextFollowUp ? new Date(s.nextFollowUp).toLocaleDateString('en-IN') : ''),
      escapeCsv(s.deliverables),
      escapeCsv(s.notes),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="qbit26_sponsorship_pipeline_${new Date().toISOString().slice(0, 10)}.csv"`
    );
    return res.send(csvContent);
  } catch (error) {
    console.error('Error exporting sponsor leads:', error);
    res.status(500).json({ error: 'Failed to export sponsorship leads' });
  }
});

export default router;
