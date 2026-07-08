const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const hotelController = require('../controllers/hotelController');

// Public routes
router.get('/', hotelController.getAllHotels);
router.get('/stats', protect, adminOnly, hotelController.getHotelStats);
router.get('/:id', hotelController.getHotelById);

// Admin-only routes
router.post('/', protect, adminOnly, hotelController.createHotel);
router.put('/:id', protect, adminOnly, hotelController.updateHotel);
router.delete('/:id', protect, adminOnly, hotelController.deleteHotel);

module.exports = router;
