const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const Cab = require('../models/Cab');

// GET /api/cabs
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const cabs = await Cab.find(filter);
    res.json(cabs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cabs/search
router.get('/search', async (req, res) => {
  try {
    let cabs = await Cab.find({ status: 'Approved' });
    if (req.query.pickup) {
      const pickupQuery = req.query.pickup.toLowerCase().trim();
      cabs = cabs.filter(c => c.city && c.city.toLowerCase().includes(pickupQuery));
    }
    res.json(cabs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cabs/:id
router.get('/:id', async (req, res) => {
  try {
    const cab = await Cab.findById(req.params.id);
    if (!cab) return res.status(404).json({ error: 'Cab not found' });
    res.json(cab);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cabs
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const cab = await Cab.create(req.body);
    res.status(201).json(cab);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/cabs/:id
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const cab = await Cab.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!cab) return res.status(404).json({ error: 'Cab not found' });
    res.json(cab);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/cabs/:id
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const cab = await Cab.findByIdAndDelete(req.params.id);
    if (!cab) return res.status(404).json({ error: 'Cab not found' });
    res.json({ message: 'Cab deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
