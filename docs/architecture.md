# Make My Travel — System Architecture

This document serves as the high-level technical reference and source of truth for the system architecture of the **Make My Travel** application.

---

## 1. High-Level System Overview

Make My Travel is built as a modular full-stack web application designed for travel search, hotel bookings, cab listings, holiday packages, and partner integrations.

*   **Frontend**: Client-side single-page behaviors built on static **HTML5**, vanilla **CSS3** (utilizing variables, grid/flex, custom scroll snappers, transitions), and custom **JavaScript** logic.
*   **Backend**: A RESTful API built on **Node.js** and the **Express** framework.
*   **Database**: **MongoDB Atlas** (cloud-hosted database) accessed via Mongoose ODM. It implements a file-based fallback system (`utils/dbFallback.js` with `users.json` / `data/`) for resilient operations if database connections are throttled or disconnected.
*   **Third-Party Services**:
    *   **Google Identity Services (OAuth 2.0)**: Used for secure user signup and login.
    *   **OpenWeatherMap**: Current Weather API used to proxy weather checks to localized views.
    *   **Cloudinary**: Image upload host integrated through `multer-storage-cloudinary` for hotel, cab, and trip package photos.

---

## 2. Deployment & Communication Architecture

*   **Frontend Hosting**: Deployed on **Netlify** as static files.
*   **Backend Hosting**: Deployed on **Render** (Node.js web service).
*   **Cross-Origin Communication (CORS)**:
    *   Whitelisted origins are dynamically configured in `server.js` allowing connections from `localhost`, `127.0.0.1`, and any Netlify subdomains ending in `.netlify.app`.
    *   `credentials: true` is enabled to allow sending authorization headers and HTTPOnly cookies.
*   **Admin Authentication Pattern & SameSite Cookie Issue**:
    *   *The Issue*: The admin panel was originally designed to verify authentication statelessly using an HTTPOnly cookie (`admin_token`). However, because the frontend is hosted on Netlify and the backend on Render, cross-site cookie restrictions (SameSite cookies blocked on separate domains) prevented browser cookie transfers on some client environments.
    *   *The Fix*: An **Authorization: Bearer <token>** header fallback was implemented. The frontend stores the token in `localStorage` upon login and attaches it in the request headers. The backend `GET /api/admin/check` handler checks the cookies first, and if not present, extracts the token from the `Authorization` header fallback, resolving the cross-origin authentication issues seamlessly.

---

## 3. Directory Structure

```text
├── .env                              # Environment variable configurations (local only, git-ignored)
├── .gitignore                        # Git exclusion rules
├── README.md                         # Project setup instructions
├── users.json                        # Local mock database for user state fallback
├── data/                             # Mock fallback database records (hotels, cabs, packages, bookings)
├── uploads/                          # Temporary local storage folder for image uploads
├── frontend/                         # Client-side static website assets
│   ├── config.js                     # Global API configuration bindings (API_BASE_URL resolution)
│   ├── globe-loader.js               # Global transition loader component & click handler
│   ├── weather-widget.js             # Self-contained topbar weather widget and search script
│   ├── style.css                     # Primary stylesheet containing layout rules
│   ├── landing.html                  # Main home search page
│   ├── hotel-booking.html            # Hotel browse, filter, detail, and booking form page
│   ├── cab-booking.html              # Cab listing browse, search, and booking page
│   ├── package-booking.html          # Package bookings and itineraries display page
│   ├── list-hotel.html               # Partner portal: List a Hotel with room builder and attractions
│   ├── list-cab.html                 # Partner portal: Register Cab details and documents upload
│   ├── list-package.html             # Partner portal: Design and submit Tour Packages
│   ├── partner-with-us.html          # Portal home explaining partner registration models
│   ├── admin-dashboard.html          # Core admin panel dashboard for approvals & stats
│   ├── admin-hotels.html             # Admin portal to manage listed hotels
│   ├── admin-cabs.html               # Admin portal to review partner cabs
│   ├── admin-packages.html           # Admin portal to approve holiday tours
│   └── offers.html                   # Discount offers page
└── server/                           # Backend Express source files
    ├── server.js                     # Main application entry point mounting middlewares and core auth
    ├── createAdmin.js                # One-time script to register/promote seed administrators
    ├── promote-admin.js              # Atlas promoter script for developer testing
    ├── config/                       # Configuration bindings (Cloudinary storage integration)
    ├── middleware/                   # Express authorization and rate limiters
    ├── models/                       # Mongoose data schemas (User, Booking, Cab, Hotel, Rating, etc.)
    └── routes/                       # Modular sub-routers handling specific resources
```

---

## 4. Backend Routes Table

| Group | Method | Path | Purpose | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/register` | Register a new user account | Public |
| | `POST` | `/api/auth/login` | Login via email and password | Public |
| | `POST` | `/api/auth/google` | Google OAuth token signup/signin check | Public |
| **Admin Auth** | `POST` | `/api/admin/login` | Administrator authentication & cookie distribution | Public |
| | `GET` | `/api/admin/check` | Validate admin authentication (Cookie / Bearer) | Admin |
| | `POST` | `/api/admin/logout` | Clear the admin token cookie | Admin |
| **Bookings** | `POST` | `/api/bookings` | Create a new Cab or Package booking (applies lock rules) | User |
| | `GET` | `/api/bookings/my-bookings` | Retrieve logged-in user's bookings | User |
| | `PUT` | `/api/bookings/:id` | Cancel or update user booking status | User |
| | `GET` | `/api/bookings/admin/all` | Retrieve all database bookings | Admin |
| | `GET` | `/api/bookings/admin/stats` | Fetch booking aggregates for dashboard chart | Admin |
| | `DELETE` | `/api/bookings/:id` | Delete booking record from DB | Admin |
| **Hotel Bookings** | `POST` | `/api/hotel-bookings/` | Verify availability and create a Hotel booking | User |
| | `GET` | `/api/hotel-bookings/my-bookings` | Fetch logged-in user's hotel bookings | User |
| | `GET` | `/api/hotel-bookings/admin/all` | List all hotel bookings in the database | Admin |
| | `GET` | `/api/hotel-bookings/:id` | Fetch specific hotel booking details | User |
| | `PUT` | `/api/hotel-bookings/:id/cancel` | Cancel an active hotel booking | User |
| | `PUT` | `/api/hotel-bookings/:id/status` | Update booking status manually | Admin |
| **Hotels** | `GET` | `/api/hotels` | Search and filter listed hotels | Public |
| | `GET` | `/api/hotels/stats` | Get quick stats on listed hotels | Admin |
| | `GET` | `/api/hotels/status/:hotelId` | Get approval status by ID | Public |
| | `GET` | `/api/hotels/:id` | Fetch detailed info of a single hotel | Public |
| | `POST` | `/api/hotels` | Add a new hotel (submitted as Pending status) | User |
| | `PUT` | `/api/hotels/:id` | Modify hotel details / update status | Admin |
| | `DELETE` | `/api/hotels/:id` | Remove a hotel listing from DB | Admin |
| **Cabs** | `GET` | `/api/cabs` | List all approved cabs | Public |
| | `GET` | `/api/cabs/my-listings` | Get cabs listed by current partner | User |
| | `POST` | `/api/cabs` | Register a new cab / driver listing | User |
| | `PUT` | `/api/cabs/:id` | Update cab approval status | Admin |
| | `DELETE` | `/api/cabs/:id` | Delete cab listing | Admin |
| **Trip Packages** | `GET` | `/api/trip-bundles` | List all approved tour packages | Public |
| | `GET` | `/api/trip-bundles/my-listings` | Get packages created by current partner | User |
| | `POST` | `/api/trip-bundles` | Register a new tour package package | User |
| | `PUT` | `/api/trip-bundles/:id` | Approve/Reject tour package listings | Admin |
| | `DELETE` | `/api/trip-bundles/:id` | Delete tour package listing | Admin |
| **Profile** | `GET` | `/api/profile/me` | Fetch logged-in user's profile details | User |
| | `PUT` | `/api/profile/me` | Update profile information | User |
| | `PUT` | `/api/profile/me/password` | Reset/update password | User |
| | `GET` | `/api/profile/me/bookings` | Fetch all combined bookings for the user | User |
| | `POST` | `/api/profile/invite` | Send a referral link and increment invites | User |
| | `GET` | `/api/profile/stats` | Fetch aggregate stats of active user bookings | User |
| **Ratings** | `GET` | `/api/ratings/hotel/:hotelId` | Fetch all reviews and ratings for a hotel | Public |
| | `POST` | `/api/ratings` | Submit a new hotel review (limit: 1 per hotel/user) | User |
| | `DELETE` | `/api/ratings/:id` | Remove a rating record from database | Admin |
| **Uploads** | `POST` | `/api/upload/hotel` | Upload images for hotel creation to Cloudinary | User |
| | `POST` | `/api/upload/cab` | Upload driver documents to Cloudinary | User |
| | `POST` | `/api/upload/package` | Upload images for trip package to Cloudinary | User |
| **Weather** | `GET` | `/api/weather/` | Proxy OpenWeatherMap API details with caching | Public |
| **Newsletter** | `POST` | `/api/newsletter/subscribe`| Register a new subscriber email | Public |
| | `GET` | `/api/newsletter/subscribers`| List subscriber records | Admin |
| | `DELETE` | `/api/newsletter/subscribers/:id`| Remove subscriber record | Admin |
| **Contact** | `POST` | `/api/contact` | Submit message from help center form | Public |

---

## 5. Database Schemas

### 1. `User` Schema
Tracks user identities, profiles, Google OAuth associations, and lock progression states (referrals and cab bookings).

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | String | Yes | User name |
| `email` | String | Yes (Unique) | Contact/Auth Email |
| `password` | String | No | Hashed credentials password |
| `authProvider` | String | Default: `'credentials'` | `'credentials'` or `'google'` |
| `verified` | Boolean | Default: `false` | Email verification state |
| `picture` | String | Default: `''` | Profile picture URL |
| `role` | String | Default: `'user'` | User level (`'user'` or `'admin'`) |
| `googleId` | String | No | Unique Google Profile Identifier |
| `phone` | String | Default: `''` | User phone number |
| `dateOfBirth` | Date | No | DOB |
| `gender` | String | Default: `'prefer_not_to_say'`| `'male'`, `'female'`, `'other'`, or `'prefer_not_to_say'` |
| `address` | Object | (Sub-fields) | Street, City, State, Country, Pincode |
| `preferences`| Object | (Sub-fields) | Currency, Language, notifications configuration |
| `loyaltyPoints`| Number | Default: `0` | Points accrued |
| `membershipTier`| String | Default: `'Bronze'` | Bronze, Silver, Gold, Platinum |
| `lastLoginAt` | Date | No | Last authenticated timestamp |
| `bio` | String | Max: 300 | Mini biography text |
| `profileCompleted`| Boolean | Default: `false` | Set to true when user profile is updated |
| `cabsBookedCount`| Number | Default: `0` | Progression tracker for PASS20 and TRAVEL30 |
| `invitesSent` | Number | Default: `0` | Progression tracker for CAR15 |

---

### 2. `Booking` Schema
Tracks bookings made for Cabs and Packages, containing validation constraints. Implements a unique partial filter index checking `{ user: 1, promoCode: 1 }` (active when code is present and status is not cancelled) to prevent duplicate redemptions.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `bookingId` | String | No | Human-readable Reference ID |
| `customerName` | String | Yes | Booker's name |
| `customerPhone`| String | Yes | Booker's phone number |
| `bookingDate` | String | No | Scheduled date |
| `amount` | Number | Yes | Final paid amount |
| `status` | String | Default: `'pending'` | `'pending'`, `'confirmed'`, `'completed'`, `'cancelled'` |
| `user` | ObjectId | Yes (Ref: `User`)| Booking owner |
| `bookingType` | String | Yes | `'cab'` or `'package'` |
| `itemName` | String | No | Name of Cab or Package |
| `itemCity` | String | No | Operations target location |
| `promoCode` | String | No | Applied promo identifier |
| `discount` | Number | Default: `0` | Deducted amount value |
| `subtotal` | Number | No | Booking base total before tax/discounts |

---

### 3. `HotelBooking` Schema
Manages hotel check-ins, guest details, check-out intervals, room details, and redemption constraints. Implements similar index constraints to enforce single promo code redemptions per user.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `bookingId` | String | Yes (Unique) | Unique confirmation ID |
| `user` | ObjectId | Yes (Ref: `User`)| Booking owner |
| `hotel` | ObjectId | Yes (Ref: `Hotel`)| Target hotel |
| `hotelName` | String | No | Copied name of hotel |
| `hotelCity` | String | No | Location city |
| `roomType` | String | No | Room category name |
| `roomName` | String | No | Specific room details |
| `pricePerNight`| Number | No | Nightly rate |
| `checkIn` | Date | Yes | Check-in timestamp |
| `checkOut` | Date | Yes | Check-out timestamp |
| `nights` | Number | No | Duration of stay |
| `guests` | Number | No | Capacity count |
| `rooms` | Number | Default: `1` | Count of rooms requested |
| `subtotal` | Number | No | Base total amount |
| `taxes` | Number | No | Tax surcharge amount |
| `discount` | Number | No | Applied deduction |
| `totalAmount` | Number | No | Final amount charged |
| `promoCode` | String | No | Used code |
| `paymentMethod`| String | Default: `'online'` | `'online'` or `'pay_at_hotel'` |
| `paymentStatus`| String | Default: `'pending'` | `'pending'`, `'paid'`, `'failed'`, `'refunded'` |
| `bookingStatus`| String | Default: `'confirmed'`| `'confirmed'`, `'checked_in'`, `'checked_out'`, `'cancelled'`, `'no_show'` |
| `guestName` | String | No | Guest fullname |
| `guestEmail` | String | No | Guest contact email |
| `guestPhone` | String | No | Guest contact number |
| `specialRequests`| String | No | Extra instructions |
| `cancelledAt` | Date | No | Timestamp of cancellation |
| `cancellationReason`| String | No | Explanation |

---

### 4. `Hotel` Schema
Stores hotel listings, ratings, structural configurations, amenities, policies, and nearby tourist sites.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | String | Yes | Hotel name |
| `hotelId` | String | Yes (Unique) | Registration ID |
| `city` | String | Yes | Location city |
| `rating` | Number | Default: `4.0` | Review aggregate value |
| `pricePerNight`| Number | Yes | Starting room price |
| `location` | String | Yes | Local locality |
| `address` | String | Yes | Full physical address |
| `description` | String | Yes | Detail description |
| `ownerName` | String | Yes | Owner name |
| `email` | String | Yes | Owner email |
| `mobile` | String | Yes | Owner contact phone |
| `aadhaar` | String | Yes | Owner ID verification |
| `gst` | String | Default: `'N/A'` | Tax Registration GSTIN |
| `status` | String | Default: `'Pending'` | `'Approved'`, `'Pending'`, `'Rejected'` |
| `user` | ObjectId | Yes (Ref: `User`)| Listing registrar |
| `totalReviews` | Number | Default: `0` | Count of hotel ratings |
| `images` | [String] | No | Array of picture URLs |
| `badge` | String | No | `Popular Choice`, `Best Value`, `Luxury Pick`, `Trending`, etc. |
| `amenities` | [String] | No | Supported features list |
| `rooms` | [RoomSchema]| No | Room subdocuments |
| `nearbyAttractions` | [Object] | No | Array of `{ name: String, distance: String }` |
| `policies` | Object | No | CheckIn, checkOut, cancellation, children, pets, payment |
| `policy` | String | No | Long-form guidelines text block |
| `isActive` | Boolean | Default: `true` | Active display state |

---

### 5. `Cab` Schema
Stores cab listings, categories, driver details, rates, and approval documents.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `cabId` | String | No | Reference ID |
| `driver` | String | Yes | Driver's name |
| `mobile` | String | Yes | Driver's phone |
| `driverEmail` | String | No | Driver's email |
| `driverExp` | Number | No | Years of experience |
| `licenseNum` | String | No | Driver's License number |
| `vehicle` | String | Yes | Cab model |
| `category` | String | No | Cab class (e.g. Sedan, SUV) |
| `plate` | String | Yes | Plate number |
| `seats` | String | No | Capacity (e.g. '4 Seater') |
| `city` | String | No | Service region city |
| `ratePerKm` | Number | No | Distance charge rate |
| `aadhaar` | String | No | Aadhaar card document URL |
| `dl` | String | No | Driving license document URL |
| `rc` | String | No | Registration card document URL |
| `insurance` | String | No | Insurance document URL |
| `images` | [String] | No | Cab display image URLs |
| `status` | String | Default: `'Pending'` | `'Approved'`, `'Pending'`, `'Rejected'` |
| `user` | ObjectId | Yes (Ref: `User`)| Listing registrar |

---

### 6. `TripBundle` Schema
Stores package itineraries, days/nights, inclusions, and partner emails.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `packageId` | String | No | Reference ID |
| `name` | String | Yes | Package title |
| `destination` | String | Yes | Target city / region |
| `days` | Number | Default: `3` | Total tour days |
| `nights` | Number | Default: `2` | Total tour nights |
| `price` | Number | Yes | Total package price |
| `inclusions` | String | No | Comma-separated or long-form highlights |
| `images` | [String] | No | Package image URLs |
| `status` | String | Default: `'Pending'` | `'Approved'`, `'Pending'`, `'Rejected'` |
| `partnerEmail` | String | No | Partner contact |
| `user` | ObjectId | Yes (Ref: `User`)| Package registrar |

---

### 7. `Rating` Schema
Maintains single user-to-hotel ratings.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `hotel` | ObjectId | Yes (Ref: `Hotel`)| Target hotel |
| `hotelId` | String | Yes | Target registration ID |
| `user` | ObjectId | Yes (Ref: `User`)| Reviewer |
| `userName` | String | Yes | Reviewer name |
| `userPicture` | String | Default: `''` | Reviewer picture |
| `rating` | Number | Yes | Rating score (1-5) |
| `comment` | String | Max: 500 | Feedback text |

---

### 8. `Subscriber` Schema
Saves subscriber emails.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `email` | String | Yes (Unique) | Contact email |

---

## 6. Third-Party Integrations & Env Variables

All third-party integrations authenticate using environment variables configured on the server side:

*   **Google OAuth 2.0 Client**:
    *   Env Var: `GOOGLE_CLIENT_ID`
    *   Purpose: Verifies the Google Identity Token sent from the frontend client to confirm user profile integrity without passing passwords.
*   **OpenWeatherMap API**:
    *   Env Var: `WEATHER_API_KEY`
    *   Purpose: Passes security authorization query variables to proxy weather lookups safely from `weatherRoutes.js`.
*   **Cloudinary Integration**:
    *   Env Vars: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
    *   Purpose: Signs dynamic upload requests from the server to host photos securely.
*   **MongoDB Atlas Database**:
    *   Env Var: `MONGODB_URI`
    *   Purpose: Secret connection string mapping client requests to database collections.
