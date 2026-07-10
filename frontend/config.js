const API_BASE_URL = "https://make-my-tavel.onrender.com";

// Intercept global fetch to automatically prepend API_BASE_URL to relative /api/ requests
if (window.fetch) {
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      input = API_BASE_URL + input;
    }
    return originalFetch(input, init);
  };
}
