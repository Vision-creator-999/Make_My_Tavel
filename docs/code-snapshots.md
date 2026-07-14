# Make My Travel — Code Snapshots & Reference

This document catalogs code implementations for core modules, algorithms, and system functions in the **Make My Travel** codebase.

---

## 1. Authentication & Security

### Admin Login Route Handler
*   **File**: `server/routes/adminAuth.js` (Lines 20–60)
*   **Description**: Validates admin credentials against database users, signs a secure JWT, and distributes it via both an HttpOnly cookie (`admin_token`) and the response body.

```javascript
// POST /api/admin/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid email or password format.' });
    }

    // Search database for admin user
    const user = await User.findOne({ email: email.toLowerCase(), role: 'admin' });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Generate a single JWT — used for both the cookie and the response body
    const token = jwt.sign(
      { id: user._id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set the JWT as the admin_token cookie (HttpOnly, 7-day Max-Age, SameSite=None, Secure for cross-origin Netlify access)
    res.setHeader(
      'Set-Cookie',
      `admin_token=${token}; Path=/; HttpOnly; Max-Age=${SEVEN_DAYS_SEC}; SameSite=None; Secure`
    );

    return res.json({ success: true, message: 'Login successful.', token });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});
```

---

### checkAuth() Dashboard Guard
*   **File**: `frontend/admin-dashboard.html` (Lines 591–609)
*   **Description**: Checks if a local token is stored and requests verification from `/api/admin/check` with authorization headers, redirecting unauthorized traffic to the login portal.

```javascript
async function checkAuth(){
  try{
    const token = localStorage.getItem('token');
    const r=await fetch('/api/admin/check',{
      headers: { 'Authorization': `Bearer ${token}` },
      credentials:'include'
    });
    if(!r.ok) throw new Error();
    const data = await r.json();
    if(data.admin && data.admin.name) {
      document.getElementById('admin-name-sub').textContent = data.admin.name;
    }
    // Load database values
    await loadData();
  }catch(err){
    console.error('Auth verification failed, redirecting:', err);
    window.location.href='/admin-login.html';
  }
}
```

---

### Google OAuth Callback & Verification
*   **File**: `server/server.js` (Lines 135–187)
*   **Description**: Resolves token tokens issued by Google client logins, validates signatures on Google OAuth servers, and registers or logs in verified accounts.

```javascript
// 3. Google Sign-Up/Sign-In verification
app.post('/api/auth/google', registerLimiter, async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    // Verify token against Google's OAuth2 servers
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Invalid Google token payload' });
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || payload.email.split('@')[0];
    const googleId = payload.sub;
    const picture = payload.picture || '';

    let user = await User.findOne({ email });

    if (user) {
      user.lastLoginAt = new Date();
      user.googleId = googleId;
      user.authProvider = 'google';
      user.verified = true;
      if (picture && !user.picture) user.picture = picture;
      await user.save();
    } else {
      user = await User.create({
        name,
        email,
        authProvider: 'google',
        verified: true,
        picture: picture || `https://i.pravatar.cc/80?u=${email}`,
        googleId,
        lastLoginAt: new Date()
      });
    }

    const token = generateToken(user._id);
    const userObj = user.toSafeJSON();

    res.json({ message: 'Google authentication successful', user: userObj, token });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});
```

---

### SameSite Cookie Check Fallback
*   **File**: `server/routes/adminAuth.js` (Lines 63–96)
*   **Description**: Verification route checking the `admin_token` cookie, falling back to parsed Bearer tokens within authorization headers if cross-site credentials transport is blocked.

```javascript
// GET /api/admin/check  — verify if admin is logged in (stateless JWT check)
router.get('/check', async (req, res) => {
  try {
    const cookies = parseCookies(req);
    let token = cookies.admin_token;

    // Fallback to Bearer token inside Authorization header if cookie is blocked (e.g. cross-origin localhost)
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Confirm the user still exists and is still an admin
    const user = await User.findById(decoded.id).select('-password');
    if (!user || user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }

    return res.json({
      success: true,
      admin: { email: user.email, name: user.name, loginAt: null }
    });
  } catch (err) {
    // jwt.verify throws on expired / invalid / tampered tokens
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }
});
```

---

## 2. Validation & Progression Verification

### Booking Route Promo Code Validation
*   **File**: `server/routes/bookingRoutes.js` (Lines 52–112)
*   **Description**: Validates discount application, check-in intervals, booking eligibility, and increments user stats upon successful redemptions.

```javascript
    if (promoCode) {
      const code = promoCode.toUpperCase().trim();
      const verifiedSubtotal = subtotal || Math.round(amount / 1.18);
      
      // 1. Validate promo code matches booking type
      if (bookingType === 'cab') {
        if (code !== 'CAR15' && code !== 'PASS20') {
          return res.status(400).json({ error: 'Invalid promo code for cab bookings.' });
        }
        if (code === 'CAR15') {
          // Verify lock requirement: invitesSent >= 1
          if (req.user.invitesSent < 1) {
            return res.status(400).json({ error: 'Promo code CAR15 is locked! You must invite at least 1 friend to unlock this offer.' });
          }
          discount = Math.round(verifiedSubtotal * 0.15);
        } else if (code === 'PASS20') {
          // Verify lock requirement: cabsBookedCount >= 3
          if (req.user.cabsBookedCount < 3) {
            return res.status(400).json({ error: 'Promo code PASS20 is locked! Book at least 3 cab rides to unlock this offer.' });
          }
          discount = Math.round(verifiedSubtotal * 0.20);
        }
      } else if (bookingType === 'package') {
        if (code !== 'TRAVEL30') {
          return res.status(400).json({ error: 'Invalid promo code for holiday packages.' });
        }
        // Verify lock requirement: cabsBookedCount >= 1
        if (req.user.cabsBookedCount < 1) {
          return res.status(400).json({ error: 'Promo code TRAVEL30 is locked! You must book at least 1 cab ride to unlock this offer.' });
        }
        discount = Math.round(verifiedSubtotal * 0.30);
      } else {
        return res.status(400).json({ error: 'Invalid booking type for promo codes.' });
      }

      // 2. Check if user already used this promo code on a non-cancelled booking
      const alreadyUsedOthers = await Booking.findOne({
        user: req.user._id,
        promoCode: code,
        status: { $ne: 'cancelled' }
      });
      const alreadyUsedHotels = await HotelBooking.findOne({
        user: req.user._id,
        promoCode: code,
        bookingStatus: { $ne: 'cancelled' }
      });

      if (alreadyUsedOthers || alreadyUsedHotels) {
        return res.status(400).json({ error: 'You have already used this promo code.' });
      }

      req.body.promoCode = code;
      req.body.discount = discount;
      req.body.subtotal = verifiedSubtotal;
      const taxes = Math.round(verifiedSubtotal * 0.18);
      req.body.amount = verifiedSubtotal + taxes - discount;
    } else {
      req.body.promoCode = '';
      req.body.discount = 0;
      req.body.subtotal = subtotal || Math.round(amount / 1.18);
    }
```

---

### Client-side Offer Unlock-Condition Evaluation
*   **File**: `frontend/offers.html` (Lines 595–635)
*   **Description**: Evaluates if the current user profile meets required milestones to unlock promo coupon copies on the client interface.

```javascript
        lockReason = 'Log in to unlock';
        actionHtml = `<a href="login.html" style="background:var(--secondary);color:#fff;font-size:12px;font-weight:700;padding:9px 16px;border-radius:20px;text-align:center;display:block;">Log In</a>`;
      } else if (!userProfile.profileCompleted) {
        isLocked = true;
        lockReason = 'Complete profile to unlock';
        actionHtml = `<a href="profile.html" style="background:var(--primary);color:#fff;font-size:12px;font-weight:700;padding:9px 16px;border-radius:20px;text-align:center;display:block;">Complete Profile</a>`;
      }
    } else if (o.code === 'CAR15') {
      if (!userProfile) {
        isLocked = true;
        lockReason = 'Log in to unlock';
        actionHtml = `<a href="login.html" style="background:var(--secondary);color:#fff;font-size:12px;font-weight:700;padding:9px 16px;border-radius:20px;text-align:center;display:block;">Log In</a>`;
      } else if (!userProfile.invitesSent || userProfile.invitesSent < 1) {
        isLocked = true;
        lockReason = 'Invite 1 friend to unlock';
        actionHtml = `
          <div style="display:flex;gap:8px;margin-top:4px;">
            <input type="email" id="invite-email-input" placeholder="friend@email.com" style="flex:1;padding:8px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;" onclick="event.stopPropagation()"/>
            <button onclick="sendInvitation(event)" style="background:var(--accent);color:#fff;border:none;font-size:12px;font-weight:700;padding:8px 14px;border-radius:20px;cursor:pointer;white-space:nowrap;">Invite</button>
          </div>
        `;
      }
    } else if (o.code === 'TRAVEL30') {
      if (!userProfile) {
        isLocked = true;
        lockReason = 'Log in to unlock';
        actionHtml = `<a href="login.html" style="background:var(--secondary);color:#fff;font-size:12px;font-weight:700;padding:9px 16px;border-radius:20px;text-align:center;display:block;">Log In</a>`;
      } else if (!userProfile.cabsBookedCount || userProfile.cabsBookedCount < 1) {
        isLocked = true;
        lockReason = 'Book 1 cab to unlock';
        actionHtml = `<a href="cab-booking.html" style="background:var(--primary);color:#fff;font-size:12px;font-weight:700;padding:9px 16px;border-radius:20px;text-align:center;display:block;">Book a Cab</a>`;
      }
    } else if (o.code === 'FIRSTSTAY20') {
      if (!userProfile) {
        isLocked = true;
        lockReason = 'Log in to unlock';
        actionHtml = `<a href="login.html" style="background:var(--secondary);color:#fff;font-size:12px;font-weight:700;padding:9px 16px;border-radius:20px;text-align:center;display:block;">Log In</a>`;
      } else if (hasPriorHotelBooking) {
        isLocked = true;
        lockReason = 'Valid on first hotel booking only';
        actionHtml = ``;
```

---

## 3. UI, Loading, and Global Interceptions

### Dynamic Page Loader Controls
*   **File**: `frontend/globe-loader.js` (Lines 284–317)
*   **Description**: Exposes `showLoader()` and `hideLoader()` controls to globally toggle wireframe flight loaders, preventing visual flickers using a minimum delay duration constraint.

```javascript
  window.showLoader = function () {
    if (loaderTimeout) clearTimeout(loaderTimeout);

    // Schedule loader overlay fade-in
    loaderTimeout = setTimeout(() => {
      overlay.classList.add('active');
      overlay.setAttribute('aria-hidden', 'false');
      showTime = Date.now();
    }, showDelay);
  };

  window.hideLoader = function () {
    // Cancel pending show if hide is called early
    if (loaderTimeout) {
      clearTimeout(loaderTimeout);
      loaderTimeout = null;
    }

    if (showTime > 0) {
      const elapsed = Date.now() - showTime;
      if (elapsed < minDuration) {
        // Postpone hide until min duration is reached to avoid flicker
        setTimeout(() => {
          overlay.classList.remove('active');
          overlay.setAttribute('aria-hidden', 'true');
          showTime = 0;
        }, minDuration - elapsed);
      } else {
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
        showTime = 0;
      }
    }
  };
```

---

### Global Transition Click Interception
*   **File**: `frontend/globe-loader.js` (Lines 257–273)
*   **Description**: Intercepts DOM link clicks to render loading transitions before pageloads, ignoring downloads, hash anchors, external sites, and clicks where navigation is prevented (`e.defaultPrevented`).

```javascript
  // Dynamic transition animation when leaving the page (clicking internal links)
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented) return;
    const link = e.target.closest('a');
    if (link && link.href && !link.target && !link.hasAttribute('download')) {
      if (link.href.startsWith('http') || link.href.startsWith('/') || link.href.startsWith('.')) {
        try {
          const url = new URL(link.href, window.location.href);
          if (url.origin === window.location.origin && !url.hash && url.pathname !== window.location.pathname) {
            overlay.classList.add('active');
            overlay.setAttribute('aria-hidden', 'false');
          }
        } catch (err) {
          // Ignore invalid URL parsing
        }
      }
    }
  });
```

---

## 4. Location and Weather Services

### Backend Weather API Proxy
*   **File**: `server/routes/weatherRoutes.js` (Lines 28–98)
*   **Description**: Implements a proxy endpoint that forwards query parameters to OpenWeatherMap using coordinates or city strings, caching the parsed payload for 10 minutes.

```javascript
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
```

---

## 5. Additional Interactions

### Footer Accordion Options Toggle
*   **File**: `frontend/landing.html` (Lines 1812–1824)
*   **Description**: Exposes accordion drawers in the site footer on click by evaluating and transitioning height limits dynamically.

```javascript
    if (partnerTrigger && partnerOptions) {
      partnerTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        const isOpen = partnerOptions.style.maxHeight !== '0px' && partnerOptions.style.maxHeight !== '';
        if (isOpen) {
          partnerOptions.style.maxHeight = '0px';
          partnerArrow.style.transform = 'rotate(0deg)';
        } else {
          partnerOptions.style.maxHeight = '140px';
          partnerArrow.style.transform = 'rotate(180deg)';
        }
      });
    }
```

---

### Newsletter Subscription Submit Handler
*   **File**: `frontend/landing.html` (Lines 1826–1858)
*   **Description**: Intercepts newsletter subscription clicks, validates email patterns, triggers dynamic loader transitions, and reports successful registration alerts.

```javascript
    // Immediate popup on newsletter subscribe button click
    const subscribeBtn = document.querySelector('.nl-form button');
    if (subscribeBtn) {
      subscribeBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const emailInput = subscribeBtn.parentNode.querySelector('input');
        const email = emailInput ? emailInput.value.trim() : '';
        if (!email) {
          alert('Please enter a valid email address.');
          return;
        }

        showLoader();
        try {
          const res = await fetch(`${API_BASE_URL}/api/newsletter/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });
          if (res.ok) {
            alert('Thanks for subscribing us!');
            if (emailInput) emailInput.value = '';
          } else {
            alert('Something went wrong, please try again.');
          }
        } catch (err) {
          console.error('Subscription error:', err);
          alert('Something went wrong, please try again.');
        } finally {
          hideLoader();
        }
      });
    }
```
