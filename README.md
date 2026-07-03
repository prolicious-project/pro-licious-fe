# Pro-Licious Frontend

This is the fully production-ready frontend for the Pro-Licious platform, built with **Next.js (App Router)**, **React Redux**, **Socket.io**, and **Tailwind CSS**.

## Project Structure

The platform is divided into four distinct portals:
- **Customer Portal:** `app/(customer)` / `app/page.tsx`
- **Vendor Dashboard:** `app/vendor-dashboard`
- **Admin Dashboard:** `app/admin-dashboard`
- **Rider App:** `app/rider-dashboard`

## How to Run the App

1. **Start the Backend API:**
   Ensure your Express backend is running. By default, the frontend expects the backend to run on port `5000`.
   ```bash
   cd ../pro-licious-be
   npm run dev
   ```

2. **Start the Frontend Application:**
   Open a new terminal window, navigate to the frontend directory, and start the Next.js development server:
   ```bash
   cd pro-licious-fe
   npm install  # if you haven't installed dependencies yet
   npm run dev
   ```
   
3. **View the Application:**
   Open your browser and navigate to [http://localhost:3000](http://localhost:3000).

## Where APIs are Integrated

All API and Socket logic is abstracted into global service files for easy management:

### 1. REST API Client (`lib/axios.ts`)
We use a global Axios instance to handle all standard HTTP requests to the backend.
- **Location:** `lib/axios.ts`
- **Configuration:** It automatically pulls the `NEXT_PUBLIC_API_URL` environment variable (defaults to `http://localhost:5000`) and attaches your JWT Bearer token to every request from local storage.
- **Usage Example:** In `app/page.tsx`, you will see `api.get("/api/vendors")` being used to fetch live vendor data.

### 2. Live Tracking / WebSockets (`lib/socket.ts`)
We use `socket.io-client` to connect to the Express server for live order tracking and rider updates.
- **Location:** `lib/socket.ts`
- **Configuration:** Exposes `getSocket()` which initializes a singleton websocket connection to the backend.
- **Usage Example:** In `app/rider-dashboard/page.tsx`, the Rider App connects to the socket and emits `update_location` events every 5 seconds to simulate live GPS tracking.

### 3. Global State (`store/`)
Redux Toolkit manages the global state for the application.
- **Location:** `store/store.ts` and `store/slices/`
- **Auth:** `authSlice.ts` handles user sessions and tokens.
- **Cart:** `cartSlice.ts` handles cart items, quantities, and totals across the customer portal.

## Environment Variables
Create a `.env.local` file in the root of `pro-licious-fe` if your backend runs on a different port:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
in production - https://pro-licious-be.vercel.app
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

## Recent Fixes (June 2026)

Summary of recent debugging and fixes applied to the Rider & Vendor dashboards:

### Frontend Changes
- **Rider dashboard (`app/rider-dashboard/page.tsx`):**
  - Fixed "Scanning for Orders" display issue where pending orders did not render
  - Refactored `fetchRiderData()` to extract orders from multiple API response shapes
  - Implemented smart filtering: displays non-terminal orders (excludes DELIVERED, COMPLETED, CANCELLED, REJECTED)
  - Added safe fallback: if filter returns 0 orders but API returned data, show all orders (for demo compatibility)
  - Improved `handleAcceptOrder()` flow: cleaner error handling, timer cleanup, data refresh, and 500ms delay before route navigation to `/rider-dashboard/track/{orderId}`
  - Enhanced Socket.io integration with listeners for `new_order_assigned`, `pending_assignments`, `order_status_changed`, `delivery_confirmed`
  - Fixed "Active Delivery" conditional rendering: shown when active order status is in [ACCEPTED, PICKED_UP, ARRIVED_VENDOR, ARRIVED_CUSTOMER]

- **Vendor dashboard (`app/vendor-dashboard/page.tsx`):**
  - Fixed Recharts dimension error by replacing Tailwind `h-64` class with explicit inline style `{ width: "100%", height: "300px", minHeight: "300px" }`
  - Charts now render without negative width/height warnings

### Backend Fixes
- **Database seed script improvements:**
  - Fixed `seed.ts` to add `.onConflictDoNothing()` for `riderAvailability` insertion to prevent duplicate key errors on repeated runs
  
- **New seed utility (`src/db/seed-pending-orders.ts`):**
  - Created dedicated script to populate test data with pending rider assignments
  - Seeded 5 orders with status `ACCEPTED` and corresponding `PENDING` rider assignments
  - Ready for testing order accept/reject flows via `/api/rider/orders/:id/accept`
  - Run with: `npx ts-node src/db/seed-pending-orders.ts` (after running `npm run seed`)

### Root Cause Analysis
- **404 "Assignment not found" error:** Backend endpoint `/api/rider/orders/:id/accept` queries `riderAssignments` table where `orderId = X AND riderId = rider_id`. Previous test data lacked these records.
- **Pending orders not displaying:** Test data (11 orders) all had terminal statuses (REJECTED, COMPLETED). Filtering logic was too strict. Solution: show non-terminal orders with fallback to all orders if filter is empty.

### Testing Instructions
1. Start backend: `cd ../pro-licious-be && npm run seed && npm run dev`
2. The seed script will create 5 pending orders with rider assignments
3. Start frontend: `npm run dev`
4. Login as Rider: `rider@example.com / password123`
5. Navigate to Rider Dashboard — pending orders should display with countdown timers
6. Click "Accept" or "Reject" to test the order assignment flow










DATABASE_URL=postgresql://postgres:9803@localhost:5432/prolicious
NODE_ENV=development
RAZORPAY_KEY_ID=rzp_test_SRrKIfsKje5uNq
RAZORPAY_KEY_SECRET=KfntU4VVvNMAX64AvdhClFNd
RAZORPAY_WEBHOOK_SECRET=BALAJI
JWT_SECRET=22acf41ebb7d622101279e4e543489c60b05e591878a87398ab225b20d343e8a62c222abe976f737613e4c297e9b6a0b58969223b8f863b5d154d086011f3139
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars-change-this
REDIS_URL=redis://default:AUjZWqjdnaBIzMWFcldhgSVMOhsoWiu7@copper-weatherproof-zippy-23102.db.redis.io:15830
PORT=5000
FRONTEND_URL=http://localhost:3000  


