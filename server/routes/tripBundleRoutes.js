const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
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

// POST /api/trip-bundles
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    req.body.status = 'Pending';
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
