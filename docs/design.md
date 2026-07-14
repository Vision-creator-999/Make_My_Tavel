# Make My Travel — Design System & UI Specifications

---

## 1. Design System Tokens

### A. Color Palette
The primary site styling is governed by variables declared in the `:root` pseudo-class (in `style.css` and local sheets):
*   **Primary Teal**: `#0F8B8D` (`--color-primary` / `--primary`) — represents the main brand tone, CTA buttons, active states, and links.
*   **Navy Blue**: `#17375E` (`--color-secondary` / `--secondary`) — used for headers, topbars, cards, titles, and text emphasis.
*   **Orange Accent**: `#F97316` (`--color-accent` / `--accent`) — highlights discounts, loyalty metrics, and specialized visual components.
*   **Background White/Slate**: `#F8FAFC` (`--color-bg` / `--bg`) — base layout background color.
*   **Borders**: `#E2E8F0` (`--color-border` / `--border`) — subtle dividers, input boxes, and grids.

### B. Typography
The website uses clean, modern sans-serif typography loaded from Google Fonts:
*   **Primary Font**: `'Outfit', sans-serif` — brings a premium, friendly feel to headings, titles, and stats.
*   **Fallback Font**: `'Inter', 'Roboto', sans-serif` — fallback sans-serif fonts for body copy and general layout items.

### C. Button Styles
All interactive buttons follow standard classes for consistency:
*   **Primary Action Button** (`.btn-primary` / `.login-btn`): Uses the Primary Teal background, white text, smooth transitions, and hover state transforms (such as `transform: translateY(-2px);` with a slight shadow lift).
*   **Secondary Action Button** (`.btn-secondary`): Uses a clean white background, border outlines, and subtle hover background tints (`rgba(15, 139, 141, 0.05)`).

---

## 2. Shared Layout Structures

### A. Navigation Headers
All consumer-facing pages (`landing.html`, `hotel-booking.html`, `cab-booking.html`, `package-booking.html`, `offers.html`, `profile.html`, `travel-guide.html`, and `partner-with-us.html`) share the same header structure:
*   **Top Promo Bar** (`.topbar`): A thin bar holding code highlights, help triggers, currency selectors, and the topbar weather widget. (Hidden on screens <= 640px).
*   **Navbar** (`<nav>`): Holds the logo (`MakemyTravel`), desktop navigation links (Hotels, Cars, Holiday Packages, Offers, Travel Guide), and user authentication states.
*   **Mobile Navigation Drawer** (`.mobile-drawer`): A slide-out panel that contains a rich profile card at the top, navigation links, and logout controls.

### B. Footers
Standardized footer modules contain links, contact details, social hooks, and the newsletter subscription box. On viewport collapse, the elements wrap vertically, and the newsletter subscription box stacks its input and button to prevent horizontal overflows.

---

## 3. Page Screenshot Placeholders

The following placeholders mark where screenshots of the main application views should be placed:

### Landing Page Search Portal
![Landing Page](../screenshots/landing.png)
*Figure 1: Main landing page showing the hero search forms, categories selector, and retina destinations.*

### Hotel Booking Browse View
![Hotel Booking Page](../screenshots/hotel_booking.png)
*Figure 2: Hotel catalog browse view displaying search filters and the details modal.*

### Cab Booking Search View
![Cab Booking Page](../screenshots/cab_booking.png)
*Figure 3: Cab registration results list displaying capacity filters and booking forms.*

### Holiday Package Booking View
![Package Booking Page](../screenshots/package_booking.png)
*Figure 4: Holiday Package itineraries list and inclusions display view.*

### Offers & Promo Codes Page
![Offers Page](../screenshots/offers.png)
*Figure 5: Coupon validation list showing locked and unlocked coupons.*

### User Profile Details View
![User Profile Page](../screenshots/profile.png)
*Figure 6: Personal profile editor displaying user milestones.*

### Admin Login Screen
![Admin Login Screen](../screenshots/admin_login.png)
*Figure 7: Secure admin credentials authorization login panel.*

### Admin Dashboard Control Panel
![Admin Dashboard Page](../screenshots/admin_dashboard.png)
*Figure 8: Administrative portal statistics displaying listing approvals.*

---

## 4. Globe Loader Animation Spec
The page loading transition runs automatically on navigation events and asynchronous API requests:
*   **Visual Elements**: A Wireframe outline globe (`url(#globe-depth-grad)`) with three sweeping longitudinal meridians. An airplane icon orbits on an elliptical path (`#globe-orbit`), using scale scaling to simulate depth as it passes behind the globe.
*   **Timing Checks**: To prevent visual flickers, the loader introduces a 250ms delay before showing. If displayed, it stays visible for at least 300ms.
*   **Interceptions**: Listens to page link clicks to trigger loading transitions before pageloads, ignoring downloads, hash links, external domains, and clicks where navigation is prevented (`e.defaultPrevented` check).

---

## 5. Mobile Responsiveness & Layout Overrides

### The Newsletter Box Overflow Fix
*   **The Issue**: On screens narrower than 640px, the newsletter subscription container `.newsletter` stacked to a single column, but the input and button inside `.nl-form` stayed on a single row, causing the input box to overflow the right edge of the screen.
*   **The Root Cause**: `.nl-form` lacked mobile layout override properties to stack the elements vertically when space was tight.
*   **The Fix**: A mobile-specific media query was added to both `style.css` and the inline styles of `offers.html`:
    ```css
    @media (max-width: 640px) {
      .nl-form {
        flex-direction: column;
        gap: 8px;
        padding: 10px;
      }
      .nl-form input {
        width: 100%;
        text-align: center;
        padding: 12px 16px;
      }
      .nl-form button {
        width: 100%;
        justify-content: center;
      }
    }
    ```
    This forces the email input and Subscribe button to stack vertically on mobile screens.
