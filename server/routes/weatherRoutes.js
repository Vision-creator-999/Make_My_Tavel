const express = require('express');
const router = express.Router();
const https = require('https');

// Simple in-memory cache
const weatherCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes in milliseconds

// Helper function to make HTTPS requests safely in Node
function fetchWeather(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(rawData);
          resolve({ status: res.statusCode, data: parsedData });
        } catch (e) {
          reject(new Error('Invalid JSON response from OpenWeatherMap'));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

router.get('/', async (req, res) => {
  try {
    const { city, lat, lon } = req.query;

    if (!city && (!lat || !lon)) {
      return res.status(400).json({ error: 'Please provide either a city name or coordinate parameters (lat and lon).' });
    }

    const apiKey = process.env.WEATHER_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Weather API configuration error: API Key is missing on the server.' });
    }

    // Generate unique cache key
    let cacheKey = '';
    let apiUrl = '';

    if (city) {
      const sanitizedCity = city.trim().toLowerCase();
      cacheKey = `city:${sanitizedCity}`;
      apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(sanitizedCity)}&appid=${apiKey}&units=metric`;
    } else {
      // Round coordinates to 2 decimal places to cache nearby coordinates
      const latFixed = parseFloat(lat).toFixed(2);
      const lonFixed = parseFloat(lon).toFixed(2);
      cacheKey = `coords:${latFixed}_${lonFixed}`;
      apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latFixed}&lon=${lonFixed}&appid=${apiKey}&units=metric`;
    }

    // Check Cache
    if (weatherCache.has(cacheKey)) {
      const cached = weatherCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json(cached.data);
      }
    }

    // Call API
    const response = await fetchWeather(apiUrl);

    if (response.status === 404) {
      return res.status(404).json({ error: 'Location not found. Please verify the city name or coordinates.' });
    }

    if (response.status !== 200) {
      return res.status(response.status).json({ error: response.data.message || 'Failed to fetch weather data from source.' });
    }

    // Process and simplify response
    const wData = response.data;
    const result = {
      city: wData.name || (city ? city : 'Unknown Location'),
      temp: wData.main.temp,
      condition: wData.weather[0] ? wData.weather[0].main : 'Unknown',
      icon: wData.weather[0] ? wData.weather[0].icon : '',
      humidity: wData.main.humidity,
      windSpeed: wData.wind ? wData.wind.speed : 0
    };

    // Store in cache
    weatherCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    res.json(result);
  } catch (err) {
    console.error('Weather API Proxy Error:', err.message);
    res.status(500).json({ error: 'Internal server error while retrieving weather conditions.' });
  }
});

module.exports = router;
