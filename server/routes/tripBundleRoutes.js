const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { listingLimiter } = require('../middleware/rateLimiter');
const TripBundle = require('../models/TripBundle');

// GET /api/trip-bundles
router.get('/', async (req, res) => {
  try {
    const filter = {};
    let bundles = await TripBundle.find(filter);
    if (req.query.destination) {
      const destQuery = req.query.destination.toLowerCase().trim();
      bundles = bundles.filter(b => b.destination && b.destination.toLowerCase().includes(destQuery));
    }
    res.json(bundles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trip-bundles/search
router.get('/search', async (req, res) => {
  try {
    let bundles = await TripBundle.find({ status: 'Approved' });
    if (req.query.destination) {
      const destQuery = req.query.destination.toLowerCase().trim();
      bundles = bundles.filter(b => b.destination && b.destination.toLowerCase().includes(destQuery));
    }
    res.json(bundles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trip-bundles/:id
router.get('/:id', async (req, res) => {
  try {
    const bundle = await TripBundle.findById(req.params.id);
    if (!bundle) return res.status(404).json({ error: 'Bundle not found' });
    res.json(bundle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/trip-bundles (Public listing registration, defaults to Pending)
router.post('/', protect, listingLimiter, async (req, res) => {
  try {
    // 60 seconds deduplication check
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const duplicate = await TripBundle.findOne({
      partnerEmail: req.body.partnerEmail,
      name: req.body.name,
      createdAt: { $gte: oneMinuteAgo }
    });

    if (duplicate) {
      return res.status(429).json({
        error: 'A similar listing was already submitted moments ago. Please wait before submitting again.'
      });
    }

    req.body.status = 'Pending';
    req.body.user = req.user._id;
    const bundle = await TripBundle.create(req.body);
    res.status(201).json(bundle);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/trip-bundles/:id
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const bundle = await TripBundle.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!bundle) return res.status(404).json({ error: 'Bundle not found' });
    res.json(bundle);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/trip-bundles/:id
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const bundle = await TripBundle.findByIdAndDelete(req.params.id);
    if (!bundle) return res.status(404).json({ error: 'Bundle not found' });
    res.json({ message: 'Bundle deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
