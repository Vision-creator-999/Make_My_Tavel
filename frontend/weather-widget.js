(function () {
  // Simple mapping of weather conditions to emojis
  const weatherEmojiMap = {
    'Clear': '☀️',
    'Clouds': '☁️',
    'Rain': '🌧️',
    'Drizzle': '🌦️',
    'Thunderstorm': '⛈️',
    'Snow': '❄️',
    'Mist': '🌫️',
    'Smoke': '🌫️',
    'Haze': '🌫️',
    'Dust': '🌫️',
    'Fog': '🌫️',
    'Sand': '🌫️',
    'Ash': '🌫️',
    'Squall': '💨',
    'Tornado': '🌪️'
  };

  // Safe wrapper for loading indicator
  function toggleLoader(show) {
    if (show) {
      if (typeof showLoader === 'function') showLoader();
    } else {
      if (typeof hideLoader === 'function') hideLoader();
    }
  }

  // Inject CSS styles dynamically for the widget
  function injectStyles() {
    const styleId = 'weather-widget-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .weather-widget-inner {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: #ffffff;
        font-size: 12px;
        font-weight: 600;
        cursor: default;
        position: relative;
        padding: 2px 6px;
        border-radius: 6px;
        transition: background-color 0.2s;
      }
      .weather-widget-inner:hover {
        background-color: rgba(255, 255, 255, 0.1);
      }
      .weather-search-toggle {
        background: none;
        border: none;
        padding: 2px;
        color: #ffffff;
        cursor: pointer;
        display: flex;
        align-items: center;
        opacity: 0.8;
        transition: opacity 0.2s, transform 0.2s;
      }
      .weather-search-toggle:hover {
        opacity: 1;
        transform: scale(1.05);
      }
      .weather-search-box {
        position: absolute;
        top: 100%;
        right: 0;
        background-color: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 6px;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
        z-index: 1000;
        margin-top: 8px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .weather-search-box input {
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 11.5px;
        outline: none;
        width: 110px;
        color: #0f172a;
        background-color: #ffffff;
      }
      .weather-search-box input:focus {
        border-color: #0F8B8D;
      }
      .weather-error {
        color: #ef4444;
        font-size: 10px;
        position: absolute;
        bottom: -16px;
        right: 8px;
        white-space: nowrap;
        font-weight: 600;
      }
    `;
    document.head.appendChild(style);
  }

  // Load weather details from API
  async function loadWeather(queryParam) {
    toggleLoader(true);
    const baseUrl = window.API_BASE_URL || 'http://localhost:5500';
    try {
      const response = await fetch(`${baseUrl}/api/weather?${queryParam}`);
      if (!response.ok) {
        throw new Error('Location not found');
      }
      const data = await response.json();
      return data;
    } catch (err) {
      console.warn('Weather load error:', err.message);
      return null;
    } finally {
      toggleLoader(false);
    }
  }

  // Render widget content
  function renderWidget(container, weather) {
    if (!weather) return;

    const emoji = weatherEmojiMap[weather.condition] || '🌡️';
    container.innerHTML = `
      <div class="weather-widget-inner">
        <span class="weather-emoji" title="${weather.condition}">${emoji}</span>
        <span class="weather-temp">${Math.round(weather.temp)}°C</span>
        <span class="weather-city" title="${weather.city}">${weather.city}</span>
        
        <button class="weather-search-toggle" id="weatherSearchToggle" title="Search weather in another city">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width: 12px; height: 12px;">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </button>

        <div class="weather-search-box" id="weatherSearchBox" style="display: none;">
          <input type="text" id="weatherSearchInput" placeholder="Enter city name..." />
          <span class="weather-error" id="weatherSearchError" style="display: none;">City not found</span>
        </div>
      </div>
    `;

    const toggleBtn = container.querySelector('#weatherSearchToggle');
    const searchBox = container.querySelector('#weatherSearchBox');
    const searchInput = container.querySelector('#weatherSearchInput');
    const searchError = container.querySelector('#weatherSearchError');

    // Toggle search display
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = searchBox.style.display === 'none';
      searchBox.style.display = isHidden ? 'flex' : 'none';
      if (isHidden) {
        searchInput.focus();
        searchError.style.display = 'none';
      }
    });

    // Close search box on clicking outside
    document.addEventListener('click', (e) => {
      if (!searchBox.contains(e.target) && e.target !== toggleBtn) {
        searchBox.style.display = 'none';
      }
    });

    // Search input enter event
    searchInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const cityVal = searchInput.value.trim();
        if (!cityVal) return;

        searchError.style.display = 'none';
        const data = await loadWeather(`city=${encodeURIComponent(cityVal)}`);
        if (data) {
          renderWidget(container, data);
        } else {
          searchError.style.display = 'block';
          // Auto hide error after 3 seconds
          setTimeout(() => {
            if (searchError) searchError.style.display = 'none';
          }, 3000);
        }
      }
    });
  }

  // Initialize weather fetching
  async function initWeather() {
    const container = document.getElementById('weather-widget-container');
    if (!container) return;

    injectStyles();

    // Default fallback New Delhi
    const defaultQuery = 'city=New Delhi';

    // Request browser geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const data = await loadWeather(`lat=${lat}&lon=${lon}`);
          if (data) {
            renderWidget(container, data);
          } else {
            // Fallback to default on fetch failure
            const fallbackData = await loadWeather(defaultQuery);
            renderWidget(container, fallbackData);
          }
        },
        async () => {
          // Geolocation denied or unavailable
          const fallbackData = await loadWeather(defaultQuery);
          renderWidget(container, fallbackData);
        },
        { timeout: 5000 }
      );
    } else {
      // Geolocation not supported
      const fallbackData = await loadWeather(defaultQuery);
      renderWidget(container, fallbackData);
    }
  }

  // Run on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWeather);
  } else {
    initWeather();
  }
})();
