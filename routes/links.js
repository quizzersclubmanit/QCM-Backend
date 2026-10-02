import express from 'express';
import ClubLink from '../models/ClubLink.js';
import { requireStaff } from '../middleware/auth.js';

const router = express.Router();

// GET /api/links - List sheets or drive links
router.get('/', requireStaff, async (req, res) => {
  try {
    const { type, search, category } = req.query;

    const query = {};
    if (type) query.type = type.toUpperCase();
    if (category && category !== 'ALL') query.category = category;
    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: regex },
        { description: regex },
        { category: regex },
      ];
    }

    const links = await ClubLink.find(query).sort({ createdAt: -1 }).lean();

    // Distinct categories for quick filtering
    const categoryQuery = type ? { type: type.toUpperCase() } : {};
    const categories = await ClubLink.distinct('category', categoryQuery);

    res.json({ success: true, links, categories });
  } catch (error) {
    console.error('Error fetching links:', error);
    res.status(500).json({ error: 'Failed to fetch links' });
  }
});

// POST /api/links - Add new sheet or drive link
router.post('/', requireStaff, async (req, res) => {
  try {
    const { title, url, type, category, description } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!url || !url.trim()) {
      return res.status(400).json({ error: 'URL link is required' });
    }
    if (!type || !['SHEET', 'DRIVE'].includes(type.toUpperCase())) {
      return res.status(400).json({ error: 'Type must be SHEET or DRIVE' });
    }

    // Auto-normalize URL if missing protocol
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    const link = new ClubLink({
      title: title.trim(),
      url: cleanUrl,
      type: type.toUpperCase(),
      category: category && category.trim() ? category.trim() : 'General',
      description: description ? description.trim() : '',
      addedBy: req.user?.name || req.user?.email || 'Core Team',
    });

    const saved = await link.save();
    res.status(201).json({ success: true, link: saved });
  } catch (error) {
    console.error('Error creating link:', error);
    res.status(500).json({ error: 'Failed to save link' });
  }
});

// PATCH /api/links/:id - Update link
router.patch('/:id', requireStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    delete updates._id;

    if (updates.url && !updates.url.startsWith('http://') && !updates.url.startsWith('https://')) {
      updates.url = `https://${updates.url.trim()}`;
    }

    const updated = await ClubLink.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Link not found' });
    }

    res.json({ success: true, link: updated });
  } catch (error) {
    console.error('Error updating link:', error);
    res.status(500).json({ error: 'Failed to update link' });
  }
});

// DELETE /api/links/:id - Delete link
router.delete('/:id', requireStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ClubLink.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Link not found' });
    }
    res.json({ success: true, message: 'Link deleted successfully' });
  } catch (error) {
    console.error('Error deleting link:', error);
    res.status(500).json({ error: 'Failed to delete link' });
  }
});

export default router;
