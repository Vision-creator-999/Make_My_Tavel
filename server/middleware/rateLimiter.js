const rateLimit = require('express-rate-limit');

/**
 * Helper to generate rate limiters with JSON response handlers
 */
const createLimiter = (windowMs, max, errorMessage) => {
  return rateLimit({
    windowMs,
    max,
    handler: (req, res) => {
      res.status(429).json({ error: errorMessage });
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

const authLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  5,
  "Too many login attempts. Please try again in 15 minutes."
);

const registerLimiter = createLimiter(
  60 * 60 * 1000, // 1 hour
  10,
  "Too many registration attempts. Please try again later."
);

const formLimiter = createLimiter(
  60 * 60 * 1000, // 1 hour
  5,
  "Too many submissions. Please try again later."
);

const listingLimiter = createLimiter(
  60 * 60 * 1000, // 1 hour
  10,
  "Too many listing submissions. Please try again later."
);

const generalLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  200,
  "Too many requests. Please try again later."
);

module.exports = {
  authLimiter,
  registerLimiter,
  formLimiter,
  listingLimiter,
  generalLimiter
};
