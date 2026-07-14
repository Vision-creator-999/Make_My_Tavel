# Make My Travel — Core Business & Security Rules

---

## 1. Coupon Codes & Redemption Rules

### A. Uniqueness & DB Indexing Constraints
Promo codes are tracked per authenticated user account. To prevent reuse of the same promo code on multiple bookings, the system enforces a database-level unique index on both `Booking` and `HotelBooking` schemas:

*   **Index on `Booking`**:
    ```javascript
    bookingSchema.index(
      { user: 1, promoCode: 1 },
      { 
        unique: true, 
        partialFilterExpression: { 
          promoCode: { $gt: "" }, 
          status: { $ne: "cancelled" } 
        } 
      }
    );
    ```
*   **Index on `HotelBooking`**:
    ```javascript
    hotelBookingSchema.index(
      { user: 1, promoCode: 1 },
      { 
        unique: true, 
        partialFilterExpression: { 
          promoCode: { $gt: "" }, 
          bookingStatus: { $ne: "cancelled" } 
        } 
      }
    );
    ```

### B. Cancelled Bookings Exclusion
By using a `partialFilterExpression` in the unique index, **cancelled bookings are excluded** from the uniqueness check. This means that if a user cancels a booking that used a promo code, they are allowed to use that same promo code again on a future booking.

---

## 2. Offer Unlock Conditions
The system defines dynamic unlock rules mapped to user milestones:

| Promo Code | Category | Discount | Unlock Condition |
| :--- | :--- | :--- | :--- |
| **`HOTEL20`** | Hotel | 20% off subtotal | **Profile Completion**: The user must update their details (`profileCompleted: true`) in the My Profile portal. |
| **`FIRSTSTAY20`**| Hotel | 20% off (up to ₹2000) | **First Stay only**: Valid only if the user has no prior active hotel bookings. |
| **`MEMBER25`** | Hotel | 25% off subtotal | **Loyalty Booking Threshold**: The user must have completed at least 3 bookings in total. |
| **`LUXE5000`** | Hotel | Flat ₹5,000 off | **Luxury Tier check**: Valid only on 5-Star hotels and booking subtotals above ₹25,000. |
| **`WEEKEND1500`**| Hotel | Flat ₹1,500 off | **Check-in Timing check**: Valid only if the check-in day is Friday, Saturday, or Sunday. |
| **`LONGSTAY15`** | Hotel | 15% off subtotal | **Duration check**: Stay duration must be 5 nights or more. |
| **`CAR15`** | Cab | 15% off subtotal | **Referral check**: The user must invite at least 1 friend (`invitesSent >= 1`). |
| **`PASS20`** | Cab | 20% off subtotal | **Cab Ride Threshold**: The user must book at least 3 cab rides (`cabsBookedCount >= 3`). |
| **`TRAVEL30`** | Package | 30% off subtotal | **Cross-service check**: The user must book at least 1 cab ride (`cabsBookedCount >= 1`). |

---

## 3. Admin Authentication Rules

### A. Stateless Token Approach
The admin portal uses JSON Web Tokens (JWT) for authentication. When an admin logs in, a JWT is signed with the user ID and role (`'admin'`), expiring in 7 days.

### B. Why Cookie-only Validation Failed
Initially, the backend issued this JWT solely as an HttpOnly, Secure cookie (`admin_token`). However, because the client-side files are hosted on Netlify and the backend on Render, cross-site cookie restrictions (SameSite cookies blocked on separate domains) prevented browser cookie transfers on some client environments.

### C. The Bearer Token Fallback
To resolve this, the backend route accepts an **Authorization: Bearer <token>** header fallback. The frontend stores the token in `localStorage` upon login and attaches it in the request headers. The backend `GET /api/admin/check` handler checks the cookies first, and if not present, extracts the token from the `Authorization` header fallback, resolving the cross-origin authentication issues:
```javascript
let token = cookies.admin_token;
if (!token && req.headers.authorization) {
  const parts = req.headers.authorization.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    token = parts[1];
  }
}
```

---

## 4. Input & Form Validation Rules

### A. Hotel Registrations (`list-hotel.html`)
*   **Images Limit**: A minimum of 1 and maximum of 4 files can be uploaded. Files must be under 5MB and in PNG, JPG, or WebP formats.
*   **Mandatory Info**: Owner Name, Email, Mobile, Aadhaar Number, Hotel Category, Operating City, Location, Full Address, and Description must be provided.
*   **Grid Builders**:
    *   **Room Tiers**: At least 1 room tier must be created. Requires Name, Price, Capacity, Bed Type, Size (Sq. Ft.), and Total Rooms.
    *   **Nearby Attractions**: Attraction Name and Distance/Time must be specified for each entry.

### B. Cab Registrations (`list-cab.html`)
*   **Mandatory Info**: Driver Name, Phone (10 digits), Experience (years), License Number, Vehicle Model, Cab Class (Sedan, SUV, Hatchback), Plate Number, and City must be provided.
*   **File Uploads**: Driver's License, Aadhaar, Registration Certificate (RC), and Insurance documents must be uploaded.

### C. Tour Package Registrations (`list-package.html`)
*   **Mandatory Info**: Package Title, Destination City, Days, Nights, Price (Number), and Highlighted Inclusions must be provided.
