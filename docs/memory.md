# Make My Travel — Architectural Decision Log (Memory)

This document records the key architectural decisions made during the design and development of the **Make My Travel** application.

---

## 1. Promo Code Model: Option A vs. Option B
*   **The Decision**: Chosen **Option A** (shared campaign codes like `CAR15` and `HOTEL20` with user-redemption limits tracked server-side) over **Option B** (generating unique codes for each user).
*   **Why**: Option A aligns with standard consumer travel campaigns. It allows clean, memorable promo codes to be advertised directly on the site, while preventing abuse via a database-level unique constraint on the `{ user, promoCode }` compound index. Generating unique coupon codes would require creating and storing thousands of random strings, which would complicate database management.

---

## 2. Bearer Token Auth Fallback
*   **The Decision**: Configured a JWT fallback validation mechanism parsing the `Authorization: Bearer <token>` header when HttpOnly cookies are missing.
*   **Why**: The admin portal was originally designed to verify authentication statelessly using an HttpOnly cookie (`admin_token`). However, because the frontend is hosted on Netlify and the backend on Render, cross-site cookie restrictions (SameSite cookies blocked on separate domains) prevented browser cookie transfers on some client environments. Using a client-sent Bearer header fallback ensures consistent access across different deployment setups.

---

## 3. Netlify Account Pivot
*   **The Decision**: Deployed the frontend production build using a new Netlify account instead of the original project account.
*   **Why**: The original Netlify account exceeded its free-tier bandwidth credits, disabling all production deploys. Setting up a new account was the fastest way to resume production deploys and cross-origin testing without service interruptions.

---

## 4. Click Interception Conflict Resolver
*   **The Decision**: Added a `if (e.defaultPrevented) return;` check at the beginning of the global click listener in `globe-loader.js`.
*   **Why**: The page loader script globally intercepts click events on all local `<a>` links to display the wireframe flight transition overlay. However, this intercepted click handlers on page components, such as the footer accordion dropdown button (`#partner-trigger`). The accordion handler calls `e.preventDefault()`, so checking `e.defaultPrevented` ensures that the loader ignores these clicks.

---

## 5. In-Memory Weather API Caching
*   **The Decision**: Added a server-side cache in `weatherRoutes.js` storing OpenWeatherMap responses for 10 minutes.
*   **Why**: OpenWeatherMap's free tier has strict rate limits. Since the topbar widget requests weather conditions on page loads, repeated user requests would quickly exceed the limits. Caching responses by location (rounding coordinates to two decimal places) protects the API keys from being rate-limited.
