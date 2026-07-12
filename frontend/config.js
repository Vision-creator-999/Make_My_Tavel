const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5500'
  : 'https://make-my-tavel.onrender.com';

// Intercept global fetch to automatically prepend API_BASE_URL to relative /api/ requests
if (window.fetch) {
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      if (API_BASE_URL) {
        input = API_BASE_URL + input;
      }
    }
    return originalFetch(input, init);
  };
}

// Global Newsletter Subscribe Handler
function initNewsletter() {
  const nlForm = document.querySelector('.nl-form');
  if (nlForm) {
    const input = nlForm.querySelector('input');
    const button = nlForm.querySelector('button');
    if (input && button) {
      button.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = input.value.trim();
        if (!email) {
          alert('Please enter a valid email address.');
          return;
        }
        button.disabled = true;
        const originalText = button.textContent;
        button.textContent = 'Subscribing…';
        try {
          const res = await fetch('/api/newsletter/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          const data = await res.json();
          if (res.ok) {
            alert('Thanks for your insights!');
            input.value = '';
          } else {
            alert(data.error || 'Failed to subscribe. Please try again.');
          }
        } catch (err) {
          console.error('Subscription error:', err);
          alert('Failed to connect to the server. Please try again.');
        } finally {
          button.disabled = false;
          button.textContent = originalText;
        }
      });
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNewsletter);
} else {
  initNewsletter();
}


