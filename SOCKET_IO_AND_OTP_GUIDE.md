# Socket.io & OTP Workflow Implementation Guide

## 🔄 Complete OTP & Delivery Confirmation Flow

### **How OTP Works**

1. **Customer receives order** → Backend generates 4-digit OTP and sends to customer (SMS/Email/App)
2. **Rider arrives at customer** → Order status changes to `ARRIVED_CUSTOMER`
3. **OTP input shown** → Rider sees OTP input field on tracking page
4. **Rider enters OTP** → Input accepts exactly 4 digits
5. **Backend validates OTP** → Check if rider's input matches customer's OTP
6. **Delivery confirmed** → Order marked as DELIVERED, status updated across all platforms

---

## 📊 OTP Input & Delivery Confirmation UI (FRONTEND)

### Current Implementation (Already in Tracking Page)

```typescript
{order?.status === "ARRIVED_CUSTOMER" && (
  <div className="space-y-3">
    <div className="relative">
      <input
        type="text"
        placeholder="Enter 4-digit OTP"
        value={otpInput}
        onChange={(e) => setOtpInput(e.target.value.slice(0, 4))}
        maxLength={4}
        className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 
                   text-gray-900 dark:text-white font-bold text-center py-3 rounded-lg 
                   placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none 
                   focus:ring-2 focus:ring-emerald-500 text-lg tracking-widest"
      />
      <ShieldCheck className="w-5 h-5 text-emerald-600 absolute right-3 top-1/2 -translate-y-1/2" />
    </div>
    <button
      onClick={() => handleUpdateStatus("DELIVERED")}
      disabled={otpInput.length < 4}
      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 
                 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white 
                 disabled:text-gray-600 dark:disabled:text-gray-400 font-bold text-sm 
                 rounded-lg transition shadow-lg"
    >
      ✓ Confirm Delivery
    </button>
  </div>
)}
```

---

## 🔌 Socket.io Implementation

### **Frontend Socket.io Code** (`lib/socket.ts`)

```typescript
// lib/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (token: string): Socket => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL || "https://pro-licious-be.vercel.app", {
      auth: {   
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      extraHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Global connection events
    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket?.id);
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected");
    });

    socket.on("connect_error", (error) => {
      console.error("🔴 Socket connection error:", error);
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
```

### **Socket Events - Frontend Tracking Page** (`app/rider-dashboard/track/[orderId]/page.tsx`)

```typescript
// In useEffect hook
useEffect(() => {
  if (!isAuthenticated || !token || !orderId) return;
  
  const socket = getSocket(token);
  socket.connect();

  // Join the order room
  socket.emit("join_order_room", { 
    orderId: Number(orderId),
    role: "rider"
  });

  // Listen for status changes
  socket.on("order_status_changed", (payload) => {
    console.log("📦 Order status changed:", payload);
    if (payload.orderId === Number(orderId)) {
      setOrder((prev) => 
        prev ? { ...prev, status: payload.status } : null
      );
    }
  });

  // Listen for OTP sent event
  socket.on("otp_sent_to_customer", (payload) => {
    if (payload.orderId === Number(orderId)) {
      console.log("📱 OTP sent to customer");
      alert("OTP has been sent to customer. Please wait for them to share it.");
    }
  });

  // Listen for delivery confirmation
  socket.on("delivery_confirmed", (payload) => {
    if (payload.orderId === Number(orderId)) {
      console.log("✅ Delivery confirmed");
      setOrder((prev) => 
        prev ? { ...prev, status: "DELIVERED" } : null
      );
    }
  });

  // Listen for OTP verification failure
  socket.on("otp_verification_failed", (payload) => {
    if (payload.orderId === Number(orderId)) {
      console.log("❌ OTP verification failed");
      setOtpInput(""); // Clear input
      alert("OTP is incorrect. Please ask customer for the correct OTP.");
    }
  });

  return () => {
    socket.off("order_status_changed");
    socket.off("otp_sent_to_customer");
    socket.off("delivery_confirmed");
    socket.off("otp_verification_failed");
    socket.disconnect();
  };
}, [isAuthenticated, token, orderId]);
```

---

## 🔧 Backend Node.js/Express Socket.io Implementation

### **Backend Socket.io Server Setup** (`server/socket.js` or `server/socket.ts`)

```typescript
// server/socket.ts (or socket.io setup in your main server file)
import { Server } from "socket.io";
import { verifyToken } from "./middleware/auth"; // Your auth middleware

export const setupSocket = (httpServer: any) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Middleware: Verify token before connection
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error"));
    }
    try {
      const decoded = verifyToken(token); // Decode JWT
      socket.userId = decoded.id;
      socket.role = decoded.role; // 'rider', 'customer', 'vendor', 'admin'
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  // Connection event
  io.on("connection", (socket) => {
    console.log(`✅ User ${socket.userId} connected (${socket.role})`);

    // Join order room
    socket.on("join_order_room", (data) => {
      const { orderId, role } = data;
      const roomName = `order_${orderId}`;
      socket.join(roomName);
      console.log(`👤 ${role} joined room ${roomName}`);
    });

    // Listen for rider location updates
    socket.on("rider_location_update", (data) => {
      const { orderId, latitude, longitude } = data;
      const roomName = `order_${orderId}`;
      // Broadcast to all in room (customer, vendor, admin, etc.)
      io.to(roomName).emit("rider_location_updated", {
        orderId,
        latitude,
        longitude,
        timestamp: new Date(),
      });
    });

    socket.on("disconnect", () => {
      console.log(`❌ User ${socket.userId} disconnected`);
    });
  });

  return io;
};
```

### **Backend API Routes - OTP & Status Updates** (`routes/rider.ts`)

```typescript
// routes/rider.ts - Delivery confirmation with OTP
import { Router } from "express";
import { db } from "../db";
import { authMiddleware } from "../middleware/auth";
import { getIO } from "../socket"; // Get io instance

const router = Router();

// Accept order
router.patch("/:orderId/accept", authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const riderId = req.user.id;

    const order = await db.query(
      "UPDATE orders SET status = ?, riderAssignedAt = NOW() WHERE id = ?",
      ["ACCEPTED", orderId]
    );

    const io = getIO();
    io.to(`order_${orderId}`).emit("order_status_changed", {
      orderId,
      status: "ACCEPTED",
      riderAcceptedAt: new Date(),
    });

    res.json({ success: true, message: "Order accepted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Arrived at vendor
router.patch("/:orderId/arrived-vendor", authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;

    await db.query(
      "UPDATE orders SET status = ?, arrivedVendorAt = NOW() WHERE id = ?",
      ["ARRIVED_VENDOR", orderId]
    );

    const io = getIO();
    io.to(`order_${orderId}`).emit("order_status_changed", {
      orderId,
      status: "ARRIVED_VENDOR",
      arrivedVendorAt: new Date(),
    });

    res.json({ success: true, message: "Arrived at vendor" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Picked up order
router.patch("/:orderId/picked-up", authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;

    await db.query(
      "UPDATE orders SET status = ?, pickedUpAt = NOW() WHERE id = ?",
      ["PICKED_UP", orderId]
    );

    const io = getIO();
    io.to(`order_${orderId}`).emit("order_status_changed", {
      orderId,
      status: "PICKED_UP",
      pickedUpAt: new Date(),
    });

    res.json({ success: true, message: "Order picked up" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Arrived at customer
router.patch("/:orderId/arrived-customer", authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;

    await db.query(
      "UPDATE orders SET status = ?, arrivedCustomerAt = NOW() WHERE id = ?",
      ["ARRIVED_CUSTOMER", orderId]
    );

    // Generate 4-digit OTP and send to customer
    const otp = Math.floor(Math.random() * 9000) + 1000;
    
    // Store OTP in database (expires in 10 minutes)
    await db.query(
      "INSERT INTO order_otps (orderId, otp, expiresAt) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))",
      [orderId, otp]
    );

    // Get customer phone/email and send OTP (SMS or Email)
    const order = await db.query(
      "SELECT o.id, c.phone, c.email FROM orders o JOIN customers c ON o.customerId = c.id WHERE o.id = ?",
      [orderId]
    );

    // Send SMS/Email with OTP
    await sendOTP(order[0].phone, order[0].email, otp);

    const io = getIO();
    io.to(`order_${orderId}`).emit("order_status_changed", {
      orderId,
      status: "ARRIVED_CUSTOMER",
      arrivedCustomerAt: new Date(),
    });

    // Notify rider that OTP has been sent
    io.to(`order_${orderId}`).emit("otp_sent_to_customer", {
      orderId,
      message: "OTP has been sent to customer",
    });

    res.json({ success: true, message: "Arrived at customer, OTP sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Confirm delivery with OTP ✅ MOST IMPORTANT
router.post("/:orderId/deliver", authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { otp } = req.body; // OTP entered by rider

    if (!otp || otp.length !== 4) {
      return res.status(400).json({ error: "Invalid OTP format" });
    }

    // Get correct OTP from database
    const otpRecord = await db.query(
      "SELECT otp FROM order_otps WHERE orderId = ? AND expiresAt > NOW() ORDER BY createdAt DESC LIMIT 1",
      [orderId]
    );

    if (!otpRecord.length) {
      return res.status(400).json({ error: "OTP expired or not found" });
    }

    // Verify OTP
    if (otpRecord[0].otp !== parseInt(otp)) {
      const io = getIO();
      io.to(`order_${orderId}`).emit("otp_verification_failed", {
        orderId,
        message: "OTP is incorrect",
      });
      return res.status(400).json({ error: "Incorrect OTP" });
    }

    // OTP verified! Mark order as DELIVERED
    await db.query(
      "UPDATE orders SET status = ?, deliveredAt = NOW() WHERE id = ?",
      ["DELIVERED", orderId]
    );

    // Update rider earnings
    const order = await db.query(
      "SELECT deliveryFee FROM orders WHERE id = ?",
      [orderId]
    );
    await db.query(
      "UPDATE riders SET totalEarnings = totalEarnings + ? WHERE id = ?",
      [order[0].deliveryFee, req.user.id]
    );

    const io = getIO();
    
    // Notify all parties
    io.to(`order_${orderId}`).emit("order_status_changed", {
      orderId,
      status: "DELIVERED",
      deliveredAt: new Date(),
    });

    io.to(`order_${orderId}`).emit("delivery_confirmed", {
      orderId,
      message: "Delivery completed successfully",
      deliveryFee: order[0].deliveryFee,
    });

    res.json({ 
      success: true, 
      message: "Delivery confirmed",
      earnings: order[0].deliveryFee 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

---

## 📱 Customer-Facing OTP Delivery

### **How Customer Receives OTP**

**Option 1: SMS (Recommended)**
```typescript
// Use a service like Twilio, AWS SNS, or local SMS gateway
await sendSMS(customerPhone, `Your delivery OTP is: ${otp}`);
```

**Option 2: Email**
```typescript
await sendEmail(customerEmail, {
  subject: "Your Delivery OTP",
  body: `Please provide this OTP to the rider: ${otp}`
});
```

**Option 3: App Notification**
```typescript
const io = getIO();
io.to(`customer_${customerId}`).emit("delivery_otp_received", {
  orderId,
  otp, // Show directly to customer in app
});
```

---

## 📊 Complete Order Status Flow with OTP

```
Customer Places Order
    ↓
Vendor Accepts Order
    ↓
Rider Assigned → "ASSIGNED"
    ↓
Rider Accepts → "ACCEPTED"
    ↓
Rider Arrives at Vendor → "ARRIVED_VENDOR"
    ↓
Rider Picks Up Order → "PICKED_UP"
    ↓
Rider Arrives at Customer → "ARRIVED_CUSTOMER"
    ↓ (Backend generates 4-digit OTP and sends to customer)
Rider Sees OTP Input Field → "ARRIVED_CUSTOMER" (UI shows input)
    ↓
Customer Shares OTP with Rider
    ↓
Rider Enters OTP in App → Calls /api/rider/orders/{id}/deliver with OTP
    ↓
Backend Validates OTP
    ├─ ❌ Wrong OTP → "otp_verification_failed" event, stay in ARRIVED_CUSTOMER
    └─ ✅ Correct OTP → "order_status_changed" to DELIVERED, broadcast completion
    ↓
Order Marked as DELIVERED
    ↓
Rider Earnings Updated
    ↓
All Parties Notified (Customer, Vendor, Admin, Other Riders)
```

---

## 🧪 Testing the OTP Flow

### **Test Case 1: Manual Testing**

1. **Accept order** on rider dashboard
2. Navigate to tracking page
3. Click "Arrived at Vendor"
4. Click "Order Picked Up"
5. Click "Arrived at Customer"
6. **OTP input field appears** ✅
7. Backend sends OTP to customer (check logs or SMS/Email)
8. Enter OTP in input field
9. Click "Confirm Delivery"
10. Order marked as DELIVERED ✅

### **Test Case 2: Socket Events Verification**

```typescript
// In browser console, run:
const socket = getSocket(localStorage.getItem("token"));
socket.on("otp_sent_to_customer", (data) => {
  console.log("📱 OTP Event:", data);
});
socket.on("otp_verification_failed", (data) => {
  console.log("❌ Failed:", data);
});
socket.on("delivery_confirmed", (data) => {
  console.log("✅ Confirmed:", data);
});
```

### **Test Case 3: Incorrect OTP**

1. Arrive at customer
2. Enter wrong OTP (e.g., 1111)
3. Should see error: "Incorrect OTP"
4. Field clears
5. Can try again

### **Test Case 4: Expired OTP**

1. Arrive at customer (OTP sent)
2. Wait 10+ minutes
3. Try entering OTP
4. Should see: "OTP expired or not found"

---

## 🔐 Security Best Practices

```typescript
// ✅ DO
- Send OTP only when rider arrives at customer
- OTP expires after 10 minutes
- Limit attempts (3-5 tries max)
- Log all OTP attempts for audit

// ❌ DON'T
- Send OTP before rider arrives
- Show OTP in logs or network requests
- Accept OTP multiple times
- Allow unlimited retry attempts
```

---

## 📋 API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/rider/orders/{id}/accept` | PATCH | Rider accepts order |
| `/api/rider/orders/{id}/arrived-vendor` | PATCH | Mark arrived at vendor |
| `/api/rider/orders/{id}/picked-up` | PATCH | Mark order picked up |
| `/api/rider/orders/{id}/arrived-customer` | PATCH | Mark arrived at customer (triggers OTP send) |
| `/api/rider/orders/{id}/deliver` | POST | Confirm delivery with OTP |

---

## 🎯 Key Points

✅ **OTP is generated on backend** when rider arrives at customer
✅ **OTP is sent to customer** via SMS/Email/App
✅ **Rider sees input field** only after arriving at customer
✅ **Socket events notify all parties** of status changes
✅ **Delivery fee updated** after successful OTP verification
✅ **All changes broadcast in real-time** via socket.io

