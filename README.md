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
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```
