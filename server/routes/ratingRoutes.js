const express = require('express');
const router = express.Router();
const Rating = require('../models/Rating');
const Hotel = require('../models/Hotel');
const { protect } = require('../middleware/auth');

/**
 * POST /api/ratings — Submit a rating (logged-in users only)
 * Body: { hotelId (string _id), rating (1-5), comment }
 */
router.post('/', protect, async (req, res) => {
  try {
    const { hotelId, rating, comment } = req.body;

    if (!hotelId || !rating) {
      return res.status(400).json({ error: 'hotelId and rating are required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Check if user already reviewed this hotel
    const existing = await Rating.findOne({ hotelId, user: req.user._id || req.user.id });
    if (existing) {
      return res.status(400).json({ error: 'You have already reviewed this hotel' });
    }

    // Create the review
    const review = await Rating.create({
      hotel: hotelId,
      hotelId: hotelId,
      user: req.user._id || req.user.id,
      userName: req.user.name || 'Anonymous',
      userPicture: req.user.picture || '',
      rating: Number(rating),
      comment: comment || ''
    });

    // Recalculate hotel average rating
    const allRatings = await Rating.find({ hotelId });
    const avgRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
    const totalReviews = allRatings.length;

    await Hotel.findByIdAndUpdate(hotelId, {
      rating: Math.round(avgRating * 10) / 10,
      totalReviews
    });

    res.status(201).json({
      message: 'Review submitted successfully',
      review,
      updatedRating: Math.round(avgRating * 10) / 10,
      totalReviews
    });
  } catch (err) {
    console.error('Error submitting rating:', err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'You have already reviewed this hotel' });
    }
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

/**
 * GET /api/ratings/:hotelId — Get all reviews for a hotel (public)
 */
router.get('/:hotelId', async (req, res) => {
  try {
    const reviews = await Rating.find({ hotelId: req.params.hotelId })
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    console.error('Error fetching ratings:', err);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

module.exports = router;
