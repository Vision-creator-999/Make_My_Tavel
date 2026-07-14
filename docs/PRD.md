# Make My Travel — Product Requirements Document (PRD)

---

## 1. Product Summary
**Make My Travel** is a full-stack web application designed for comprehensive travel bookings, including hotels, cabs, and holiday packages. It provides a split portal experience: a consumer-facing booking site for browsing, filtering, and booking travel services, and a partner-facing onboarding portal where service providers can register and list hotels, cabs, and package tours. Administrators use a specialized Admin Dashboard to review and approve listings, monitor reservations, manage newsletter subscribers, and view business analytics.

---

## 2. Core User Roles

### A. Regular User / Partner
*   **Search & Browse**: Browse and search hotels, cabs, and holiday packages with specific filters (pricing, ratings, category types).
*   **Bookings**: Make reservations using promo coupons (verifies coupon locks based on user progression).
*   **User Profile**: View and edit personal profiles, change passwords, and monitor combined trip histories.
*   **Referrals**: Invite friends by email to earn loyalty points and unlock exclusive locked cab promo codes.
*   **Partner Listing Builders**: List travel services (hotels with custom room tiers/attractions, cabs with document uploads, and packages with customized day-by-day itineraries).

### B. Administrator
*   **Listing Reviews**: Review newly submitted hotel, cab, and package listings. Approve or Reject submissions to toggle their visibility on the public site.
*   **Booking Records**: View, search, and delete reservations across all service types.
*   **Business Metrics**: Monitor metrics, including total registrations, check-ins, check-outs, earnings, and dynamic monthly stats.
*   **Subscribers List**: Manage newsletter subscriber records, including email removal.

---

## 3. Product Features & Status Catalog

### A. Hotel Bookings
*   **Description**: Browse hotels, select specific room categories, review nearby tourist attractions, read check-in policies, view visual galleries, and complete online reservations.
*   **Entry Pages**: `hotel-booking.html`
*   **Status**: **Complete**

### B. Cab Services
*   **Description**: Find commercial cars based on city, category type (Sedan, SUV, Hatchback), seating capacity, and per-kilometer rates.
*   **Entry Pages**: `cab-booking.html`, `cabs-search.html`
*   **Status**: **Complete**

### C. Holiday Packages
*   **Description**: Browse tour packages, inspect day-by-day itineraries, check tour inclusions, and reserve bundles.
*   **Entry Pages**: `package-booking.html`, `packages-search.html`
*   **Status**: **Complete**

### D. Offers & Coupon Codes
*   **Description**: Displays available promo codes. Validates lock conditions (e.g., profiles, cab booking thresholds, or referral invites).
*   **Entry Pages**: `offers.html`
*   **Status**: **Complete** (enforced on both client UI and server booking routes).

### E. Referrals & Invites
*   **Description**: Allows logged-in users to enter a friend's email to send a referral invite, incrementing `invitesSent` to unlock promo coupons (e.g., `CAR15`).
*   **Entry Pages**: `offers.html`, `profile.html`
*   **Status**: **Complete**

### F. Partner Onboarding Builders
*   **Description**: Step-by-step registration forms for owners to list hotels (with room types builder and nearby attractions builder), cabs (with driver details and document uploads), and packages (with inclusion lists).
*   **Entry Pages**: `partner-with-us.html`, `list-hotel.html`, `list-cab.html`, `list-package.html`
*   **Status**: **Complete**

### G. Admin Dashboard
*   **Description**: Manage listing states, inspect booking records, view earnings charts, and check newsletter subscriptions.
*   **Entry Pages**: `admin-dashboard.html`, `admin-hotels.html`, `admin-cabs.html`, `admin-packages.html`
*   **Status**: **Complete**

### H. Topbar Weather Widget
*   **Description**: Small widget located in the top bar of the main page that asks for location access to display city weather. Includes a search icon to look up weather in other cities.
*   **Entry Pages**: `landing.html`
*   **Status**: **Complete**

### I. Newsletter Subscription
*   **Description**: Footer email input field that registers subscribers to the database. Resolves responsive viewport issues on mobile by stacking fields vertically.
*   **Entry Pages**: `landing.html`, `offers.html` (and all other static pages)
*   **Status**: **Complete**

---

## 4. Deferred / Out-of-Scope Features
*   **Real-time Payment Gateway**: Real payment gateway integrations (such as Stripe or Razorpay) were deferred. Payment processing status is simulated programmatically.
*   **Automatic Email Dispatcher**: The referral invite system is local; actually sending email invitations via SMTP (e.g., Nodemailer/SendGrid) is simulated.
*   **Interactive Maps Integration**: Map components showing nearby attractions were deferred; attractions are managed via coordinate distances and text inputs.
