# Make My Travel — Development Phases Timeline

This document reconstructs the timeline of how the **Make My Travel** application was built, detailing the additions, problems encountered, and solutions applied during each phase.

---

## 1. Development Phases

### Phase 1: Core Booking Pages
*   **What was built**: The consumer-facing portals for hotels, cabs, and trip packages. This included search logic, filtering components (filtering by price, rating, car seating capacity, hotel category, or trip duration), dynamic detail modals, and online booking forms.
*   **Problems Encountered**: Cross-origin API base path definitions were hardcoded across multiple HTML and Javascript files, causing connection failures when testing locally versus in production.
*   **How Resolved**: Created a global `frontend/config.js` file defining `API_BASE_URL` dynamically based on the current window location (localhost/127.0.0.1 versus Render API hosts), referencing it in all fetch operations.

---

### Phase 2: Admin Panel & Admin Authentication
*   **What was built**: A secure admin console (`admin-dashboard.html`, `admin-hotels.html`, `admin-cabs.html`, `admin-packages.html`) to manage partners' listings, approve or reject pending submissions, and monitor bookings. Admin auth was guarded via JWT state checks on backend routes.
*   **Problems Encountered**: Admins were locked out of the dashboard on cross-origin setups. While the backend set authentication cookies correctly, modern browser configurations blocked SameSite cookies across Netlify (frontend) and Render (backend) host domains.
*   **How Resolved**: Added an `Authorization: Bearer <token>` fallback header client-side and adjusted `server/routes/adminAuth.js` to parse authorization headers when cookies are blocked.

---

### Phase 3: Offers & Promo Coupons System
*   **What was built**: The promotion system (`offers.html`) showing available deals and checking progress milestones. Enforced lock-unlock milestones based on user profiles, invites sent, and booking counts. Added a unique index block in Mongoose models to prevent users from reusing the same coupon.
*   **Problems Encountered**: Users who cancelled an active booking could not re-use the promo code on a new booking because the unique index matched user/coupon couples unconditionally.
*   **How Resolved**: Configured a `partialFilterExpression` on the unique compound indexes in `Booking.js` and `HotelBooking.js` to exclude cancelled bookings, letting users re-apply coupons on new bookings.

---

### Phase 4: Page Transition Loader & Shared Footer Standardization
*   **What was built**: Designed a wireframe globe and airplane loading overlay (`globe-loader.js`) that triggers automatically on page navigation and asynchronous API calls. Standardized headers, mobile drawers, and footers across all user pages.
*   **Problems Encountered**: The loader intercepted click events globally, preventing users from opening accordion dropdown items (like the "Partner with Us" list in the footer).
*   **How Resolved**: Added a guard check (`if (e.defaultPrevented) return;`) at the top of the global event listener in `globe-loader.js` to avoid intercepting elements that handle their own clicks.

---

### Phase 5: Geolocation Weather Integration
*   **What was built**: A weather proxy route (`weatherRoutes.js`) supporting city searches and lat/lon coordinate parameters. Built a client widget (`weather-widget.js`) that uses browser geolocation (navigator.geolocation) to render local temperature and condition info, falling back to New Delhi if blocked.
*   **Problems Encountered**: Geolocation weather lookups frequently hit the free tier rate limits of the OpenWeatherMap API during periods of high usage.
*   **How Resolved**: Designed an in-memory cache on the backend proxy storing locations (rounded to 2 decimal places to cache nearby coordinates) for 10 minutes.

---

### Phase 6: Responsive Mobile Styling & Overflows
*   **What was built**: Staggered column layouts, folding mobile drawers, and custom text inputs for nearby attractions.
*   **Problems Encountered**: The email signup form in the footer overflowed the right edge of mobile screens when columns collapsed.
*   **How Resolved**: Added a mobile media query forcing the email input and Subscribe button inside `.nl-form` to stack vertically under max-width: 640px.

---

## 2. Known Issues & Backlog

1.  **Partner Signup Interface**: The "Partner with Us" page (`partner-with-us.html`) serves primarily as a navigation hub with card links redirecting users to separate listing forms (`list-cab.html`, `list-hotel.html`, `list-package.html`). In the future, a dedicated multi-step registration flow should be built directly inside the partner portal.
2.  **Referral Link Dispatcher**: Invites are logged internally to progress user accounts, but do not trigger automated email dispatches via external mail services (e.g., SMTP or SendGrid).
3.  **Real-Time Payment Sandbox**: Booking payments are simulated on client forms; a sandbox payment gateway (e.g., Stripe) needs to be integrated for actual card transactions.
