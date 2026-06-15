# PRO-LICIOUS: Complete Production-Ready Implementation Prompt

## 🎯 OBJECTIVE
Make the entire PRO-LICIOUS platform production-ready with proper real-time synchronization. After this sprint, the application should work end-to-end where **only changing Razorpay API keys** enables full order processing from creation to delivery.

## 📋 CURRENT STATE ANALYSIS

### ✅ What's Done
- All UI pages created
- Redux state management structure
- Socket.io library integrated
- Basic API endpoints created
- Database schema established

### ❌ What's Broken
- **Real-time Sync**: Vendor accepts → Customer doesn't see update
- **Cross-Page Updates**: Rider accepts → Vendor page doesn't refresh
- **Data Flow**: No proper Socket.io emissions between roles
- **Functionality**: Pages work in isolation, not as system
- **Order Tracking**: Status changes not visible across platforms
- **State Management**: Redux not synchronized with backend changes

## 🏗️ ARCHITECTURE REQUIREMENTS

### Socket.io Event Flow (CRITICAL)

```
CUSTOMER CREATES ORDER
        ↓
        emit: new_order_created {orderId, customerId, vendorId}
        ↓
        → Vendor dashboard receives → Shows "New Order"
        → Admin dashboard receives → Shows "New Order"
        
VENDOR ACCEPTS ORDER
        ↓
        emit: order_accepted {orderId, vendorId, status: ACCEPTED}
        ↓
        → Customer sees status change → "Order Accepted"
        → Admin dashboard updates
        → System searches for available rider
        
VENDOR MARKS PREPARING
        ↓
        emit: order_preparing {orderId, status: PREPARING, eta}
        ↓
        → Customer sees "Being Prepared"
        → Rider can see order is coming
        
VENDOR MARKS READY
        ↓
        emit: order_ready {orderId, status: READY}
        ↓
        → Rider system: "Ready for pickup"
        → Customer: "Order ready for pickup"
        
RIDER ACCEPTS ORDER
        ↓
        emit: rider_assigned {orderId, riderId, riderDetails}
        ↓
        → Customer sees rider details + location
        → Vendor confirms rider assigned
        → Admin updates live tracking
        
RIDER PICKS UP ORDER
        ↓
        emit: order_picked_up {orderId, riderId, location}
        ↓
        → Customer sees "On the way"
        → Real-time map tracking starts
        → Vendor sees order left
        
RIDER ARRIVES AT CUSTOMER
        ↓
        emit: rider_arrived {orderId, riderId, eta: 1min}
        ↓
        → Customer gets notification
        → OTP generated and sent to customer
        
RIDER ENTERS OTP & DELIVERS
        ↓
        emit: order_delivered {orderId, deliveredAt, timestamp}
        ↓
        → Order marked complete
        → Rider earnings updated
        → Payment processed
        → Customer can review/rate
        → Vendor sees completion
```

## 📊 COMPLETE DATABASE SCHEMA

### Orders Table
```sql
id, orderNumber, customerId, vendorId, riderId
status (PLACED → ACCEPTED → PREPARING → READY → ASSIGNED → PICKED_UP → IN_TRANSIT → DELIVERED → COMPLETED)
items (JSON: [{itemId, quantity, price, specialInstructions}])
totalAmount, subtotal, taxAmount, deliveryFee, platformFee, discountAmount
vendorLat, vendorLng, customerLat, customerLng
paymentStatus (PENDING → PAID → FAILED)
paymentMethod (RAZORPAY, etc)
razorpayOrderId, razorpayPaymentId
customerPhone, vendorPhone, riderPhone
customerAddress, customerCity, customerZipCode
specialInstructions, notes
createdAt, acceptedAt, readyAt, pickedUpAt, arrivedAt, deliveredAt
cancelledAt, cancelledBy (CUSTOMER, VENDOR, RIDER), cancelReason
rating, review, riderRating
```

### Order Items Table
```sql
id, orderId, itemId, itemName, quantity, pricePerUnit, totalPrice
category, description, image, specifications
```

### Transactions Table
```sql
id, orderId, vendorId, riderId
amount, type (ORDER, REFUND, PAYOUT)
status (PENDING, COMPLETED, FAILED)
paymentId (Razorpay)
createdAt, completedAt
```

### Riders Table
```sql
id, name, phone, email
latitude, longitude (current location)
isOnline, isAvailable
totalEarnings, totalDeliveries, averageRating
documents (license, bike, insurance - stored as URLs)
bankDetails, bankAccount, ifscCode
createdAt
```

### Vendors Table
```sql
id, name, phone, email
latitude, longitude (business location)
isActive, isOnline
totalOrders, totalRevenue, averageRating
documents (FSSAI, GST, PAN, license - stored as URLs)
bankDetails, bankAccount, ifscCode
categories (vegetarian meat, non-veg meat, etc)
createdAt
```

## 🔌 REQUIRED SOCKET.IO EVENTS

### Client → Server Emissions
```typescript
// Customer
emit('join_customer_room', {customerId})
emit('place_order', {items, totalAmount, address, specialInstructions})
emit('cancel_order', {orderId, reason})
emit('rate_order', {orderId, rating, review, riderRating})

// Vendor
emit('join_vendor_room', {vendorId})
emit('accept_order', {orderId})
emit('reject_order', {orderId, reason})
emit('mark_preparing', {orderId, eta})
emit('mark_ready', {orderId})
emit('cancel_order', {orderId, reason})

// Rider
emit('join_rider_room', {riderId})
emit('update_location', {riderId, latitude, longitude})
emit('accept_delivery', {orderId})
emit('reject_delivery', {orderId, reason})
emit('arrived_vendor', {orderId})
emit('pick_up_order', {orderId})
emit('arrived_customer', {orderId})
emit('deliver_order', {orderId, otp})
emit('go_online', {riderId})
emit('go_offline', {riderId})

// Admin
emit('join_admin_room', {})
```

### Server → Client Emissions
```typescript
// Broadcast Events
broadcast('new_order_created', {orderId, vendorId, customerName, totalAmount})
broadcast('order_accepted', {orderId, vendorId, status})
broadcast('order_preparing', {orderId, eta, status})
broadcast('order_ready', {orderId, status})
broadcast('rider_assigned', {orderId, riderId, riderName, riderPhone, riderLocation})
broadcast('order_picked_up', {orderId, riderId, location})
broadcast('rider_arrived', {orderId, riderId, eta})
broadcast('order_delivered', {orderId, deliveredAt, riderEarnings})
broadcast('order_completed', {orderId, rating, review})
broadcast('order_cancelled', {orderId, cancelledBy, reason})
broadcast('order_rejected', {orderId, rejectedBy, reason})

// Rider Location Real-Time
broadcast('rider_location_updated', {orderId, riderId, latitude, longitude, distance, eta})

// Error Events
broadcast('order_error', {orderId, error})
broadcast('payment_failed', {orderId, reason})

// Notifications
to(customerId).emit('order_status_changed', {orderId, status, message})
to(vendorId).emit('new_order_assigned', {orderDetails})
to(riderId).emit('new_delivery_assigned', {orderDetails})
to(userId).emit('notification', {type, title, message, orderId})
```

## 🔗 REQUIRED API ENDPOINTS

### Customer Endpoints
```
POST   /api/customer/register
POST   /api/customer/login
GET    /api/customer/profile
PUT    /api/customer/profile
POST   /api/customer/orders
GET    /api/customer/orders
GET    /api/customer/orders/{id}
PATCH  /api/customer/orders/{id}/cancel
POST   /api/customer/orders/{id}/rate
GET    /api/customer/addresses
POST   /api/customer/addresses
PUT    /api/customer/addresses/{id}
```

### Vendor Endpoints
```
POST   /api/vendor/register
POST   /api/vendor/login
GET    /api/vendor/dashboard
PATCH  /api/vendor/orders/{id}/accept
PATCH  /api/vendor/orders/{id}/reject
PATCH  /api/vendor/orders/{id}/preparing
PATCH  /api/vendor/orders/{id}/ready
PATCH  /api/vendor/orders/{id}/cancel
GET    /api/vendor/orders
GET    /api/vendor/orders/{id}
GET    /api/vendor/menu
POST   /api/vendor/menu
PUT    /api/vendor/menu/{id}
DELETE /api/vendor/menu/{id}
PATCH  /api/vendor/menu/{id}/toggle-availability
GET    /api/vendor/analytics/summary
GET    /api/vendor/analytics/daily
GET    /api/vendor/transactions
GET    /api/vendor/payouts
```

### Rider Endpoints
```
POST   /api/rider/register
POST   /api/rider/login
GET    /api/rider/dashboard
PATCH  /api/rider/status (online/offline)
GET    /api/rider/available-orders
PATCH  /api/rider/orders/{id}/accept
PATCH  /api/rider/orders/{id}/reject
POST   /api/rider/location (update GPS)
PATCH  /api/rider/orders/{id}/arrived-vendor
PATCH  /api/rider/orders/{id}/picked-up
PATCH  /api/rider/orders/{id}/arrived-customer
POST   /api/rider/orders/{id}/deliver (with OTP)
GET    /api/rider/orders
GET    /api/rider/orders/{id}
GET    /api/rider/earnings
GET    /api/rider/earnings/summary
GET    /api/rider/profile
```

### Admin Endpoints
```
GET    /api/admin/dashboard
GET    /api/admin/orders
GET    /api/admin/vendors
POST   /api/admin/vendors (add vendor)
PATCH  /api/admin/vendors/{id}/status
GET    /api/admin/riders
POST   /api/admin/riders (add rider)
PATCH  /api/admin/riders/{id}/status
GET    /api/admin/customers
GET    /api/admin/analytics
GET    /api/admin/audit-logs
GET    /api/admin/tickets
POST   /api/admin/tickets/{id}/response
```

## 🎨 FRONTEND COMPONENT STRUCTURE

### Customer App
```
/login → /otp-verification → /home
  ├── Header (location, search, profile, cart)
  ├── Categories (Vegetarian Meat, Non-Veg, etc)
  ├── Vendor Listing (similar to Zomato)
  ├── Vendor Detail Page
  │   └── Menu Items with Add to Cart
  ├── Cart Page
  ├── Checkout Page
  ├── Payment Page (Razorpay)
  ├── Order Tracking (Live with Socket.io)
  │   └── Map + Rider Details + OTP Input
  ├── Orders History
  ├── Order Rating/Review
  ├── Profile
  └── Support

Real-Time Updates:
- New order accepted → Show "Accepted" status
- Vendor starts preparing → Show ETA
- Order ready → Show notification
- Rider assigned → Show rider details + map
- Rider on way → Live map tracking
- Rider arrived → Show OTP input
- Order delivered → Show completion
```

### Vendor App
```
/login → /otp-verification → /dashboard
  ├── Dashboard
  │   ├── Today's Orders
  │   ├── Revenue
  │   ├── Pending Orders
  │   └── Earnings
  ├── Orders Page
  │   ├── Filter (Pending, Preparing, Ready, Completed)
  │   ├── Accept/Reject Button
  │   ├── Mark Preparing Button
  │   ├── Mark Ready Button
  │   └── Order Details Modal
  ├── Menu Management
  │   ├── Add Item (name, price, image, quantity, specs, description)
  │   ├── Edit Item
  │   ├── Delete Item
  │   └── Toggle Availability
  ├── Analytics Dashboard
  │   ├── Total Sales
  │   ├── Average Revenue
  │   ├── Daily Orders
  │   └── Charts
  ├── Transactions
  │   └── Transaction History
  ├── Payouts
  │   └── Pending Amounts
  ├── Profile
  └── Customer Support

Real-Time Updates (Socket.io):
- New order arrives → Notification + Add to list
- Rider accepts order → Status updates
- Rider picks up → Status updates
- Rider delivers → Mark complete
```

### Rider App
```
/login → /otp-verification → /dashboard
  ├── Dashboard
  │   ├── Online/Offline Toggle
  │   ├── Today's Earnings
  │   ├── Orders Completed
  │   └── Active Delivery
  ├── Available Orders
  │   └── List of orders near rider
  │   └── Accept Button
  ├── Current Delivery Tracking
  │   ├── Vendor Location Map
  │   ├── Vendor Details + Call
  │   ├── "Arrived at Vendor" Button
  │   ├── "Pick Up Order" Button
  │   ├── Customer Location Map
  │   ├── Customer Details + Call
  │   ├── "Arrived at Customer" Button
  │   ├── OTP Input (4-digit)
  │   └── "Confirm Delivery" Button
  ├── Orders History
  │   └── List of completed deliveries
  ├── Earnings
  │   ├── Daily/Weekly/Custom filter
  │   └── Breakdown per order
  ├── Profile
  └── Support

Real-Time Updates (Socket.io):
- New order available → Notification
- Accept order → Go to tracking
- Status changes → Update buttons
- Rider location broadcast to customer/vendor
- Order completed → Add to history
```

### Admin Dashboard
```
/login → /otp-verification → /dashboard
  ├── Live Dashboard
  │   ├── Total Orders Today
  │   ├── Active Riders
  │   ├── Active Vendors
  │   ├── Total Customers
  │   └── Live Map (all riders)
  ├── Orders Management
  │   ├── Filter (Pending, Completed, Cancelled, Rejected)
  │   ├── Date Range Filter
  │   ├── Order Details
  │   └── Cancellation Reason
  ├── Vendor Management
  │   ├── List of Vendors
  │   ├── Add Vendor (with documents upload)
  │   ├── Enable/Disable Vendor
  │   ├── View Vendor Details
  │   └── Commission Settings
  ├── Rider Management
  │   ├── List of Riders
  │   ├── Add Rider (with documents upload)
  │   ├── Enable/Disable Rider
  │   ├── View Rider Details
  │   └── Earnings View
  ├── Customer Tickets
  │   ├── List of Tickets (Customer, Vendor, Rider issues)
  │   ├── Ticket Status (Open, In Progress, Resolved)
  │   ├── Respond to Ticket
  │   └── Ticket History
  ├── Analytics
  │   ├── Vendor Performance
  │   ├── Rider Performance
  │   ├── Revenue Charts
  │   ├── Order Trends
  │   └── Customer Reviews
  ├── Audit Logs
  │   └── All admin activities tracked
  └── Settings
```

## 🔐 AUTHENTICATION FLOW

```
1. User submits phone number
2. Backend sends OTP via SMS
3. User enters OTP
4. Backend validates OTP
5. Backend generates JWT token
6. Frontend stores token in localStorage
7. All API requests include token
8. Socket.io connection uses token for auth
9. Server verifies token before allowing socket events
```

## 💳 PAYMENT INTEGRATION (Razorpay)

```
Customer Checkout:
  ↓
Create Razorpay order via API
  ↓
Frontend shows Razorpay checkout modal
  ↓
Customer enters card/UPI details
  ↓
Razorpay returns paymentId + orderId
  ↓
Backend verifies payment via Razorpay API
  ↓
If verified:
  - Mark order as PAID
  - Emit order_status_changed to vendor
  - Create delivery record
  - Trigger rider assignment
  ↓
Else:
  - Mark as FAILED
  - Emit payment_failed
```

## 🗺️ REAL-TIME DELIVERY TRACKING

```
Rider Accepts Order:
  ↓
GPS Tracking Starts (every 5 seconds)
  ↓
emit('update_location', {riderId, latitude, longitude})
  ↓
Server Broadcasts:
  broadcast('rider_location_updated', {
    orderId, riderId, 
    latitude, longitude,
    distanceToCustomer,
    eta (in minutes)
  })
  ↓
Customer App Receives:
  - Updates map marker
  - Shows distance
  - Shows ETA
  - Updates "Rider arriving in X mins"
```

## 🔔 NOTIFICATION SYSTEM

```
Local Notifications (App)
- Order accepted
- Order preparing
- Order ready for pickup
- Rider assigned
- Rider on the way
- Rider arrived

Server should also integrate SMS/Email for:
- Order confirmation
- OTP (delivery)
- Order completed
```

## 🧪 TESTING CHECKLIST

### End-to-End Order Flow Test
```
[ ] Customer logs in
[ ] Customer searches vendor
[ ] Customer adds items to cart
[ ] Customer proceeds to checkout
[ ] Razorpay payment successful
[ ] Vendor receives order notification
[ ] Vendor sees order in dashboard (real-time)
[ ] Vendor accepts order
[ ] Customer sees "Order Accepted" (real-time)
[ ] Vendor marks preparing
[ ] Customer sees ETA (real-time)
[ ] Vendor marks ready
[ ] Customer gets notification
[ ] Rider available (logs in, goes online)
[ ] Rider sees order in available list
[ ] Rider accepts order
[ ] Customer sees rider details + map (real-time)
[ ] Vendor sees rider assigned (real-time)
[ ] Rider goes to vendor
[ ] Rider marks "Arrived at Vendor"
[ ] Vendor sees rider arrival
[ ] Rider marks "Picked Up"
[ ] Customer sees "Order on the way"
[ ] Real-time map tracking works
[ ] Rider goes to customer
[ ] Rider marks "Arrived at Customer"
[ ] Customer gets OTP notification
[ ] Rider enters OTP
[ ] Order marked DELIVERED
[ ] Rider earnings updated
[ ] Customer can rate order
[ ] Vendor sees delivery completed
```

### Real-Time Sync Tests
```
[ ] Vendor accepts → Customer sees (within 1 second)
[ ] Vendor marks preparing → Customer sees ETA (within 1 second)
[ ] Vendor marks ready → Rider sees (within 1 second)
[ ] Rider location → Customer map updates (every 5 seconds)
[ ] Rider arrives → Customer gets notification
[ ] Order delivered → All three parties notified
[ ] Admin sees all changes live
```

## 📱 Response Format Standards

All API responses should follow:
```typescript
{
  success: boolean,
  data: T,
  message: string,
  error?: string
}
```

## 🔒 ERROR HANDLING

```
- All API errors should emit socket events
- All socket errors should log to browser console
- Payment failures should retry mechanism
- Network disconnection should queue events
- OTP failures should allow retry (max 3)
- Order rejection should notify customer
```

## 📊 STATE MANAGEMENT (Redux)

Required slices:
```
- auth (user, token, isAuthenticated, role)
- orders (currentOrder, orderHistory, status)
- cart (items, total, quantity)
- notifications (list of notifications)
- map (rider location, vendor location, customer location)
- vendor (vendorProfile, menu, orders, analytics)
- rider (riderProfile, earnings, currentDelivery)
- admin (allOrders, allRiders, allVendors, analytics)
```

Redux should sync with Socket.io:
```
Socket event received 
  → Dispatch Redux action
  → Update component state
  → Component re-renders
  → UI shows latest data
```

## 🚀 DEPLOYMENT CHECKLIST

```
[ ] All 404 errors handled
[ ] All API errors caught and displayed
[ ] Socket.io reconnection working
[ ] Real-time updates working end-to-end
[ ] Payment integration tested with Razorpay
[ ] Database migrations run
[ ] Environment variables set (.env)
[ ] CORS configured correctly
[ ] SSL certificate valid
[ ] Rate limiting enabled
[ ] Input validation on all forms
[ ] XSS protection enabled
[ ] CSRF tokens implemented
[ ] Audit logs working
[ ] Admin access restricted
[ ] User roles properly enforced
```

## 🎯 SUCCESS CRITERIA

The system is production-ready when:
1. ✅ Customer can place order → Vendor receives (real-time)
2. ✅ Vendor accepts → Customer sees update (real-time)
3. ✅ Vendor marks ready → System finds rider (real-time)
4. ✅ Rider accepts → Customer sees rider on map (real-time)
5. ✅ Rider location updates → Customer map refreshes (every 5 sec)
6. ✅ Rider delivers → Order complete, earnings updated (real-time)
7. ✅ All pages stay synchronized without page refresh
8. ✅ Payment flow complete with Razorpay
9. ✅ OTP verification works for delivery
10. ✅ Admin sees everything live
11. ✅ No console errors in production build
12. ✅ All notifications working
13. ✅ Zero data inconsistencies between pages

## 📝 NOTES FOR DEVELOPMENT TEAM

- **Priority**: Real-time sync > UI polish
- **Socket.io is critical**: Every status change must emit an event
- **Redux sync**: Socket events must update Redux state
- **Database transactions**: Use transactions for payment + order creation
- **Error messages**: User-friendly, not technical
- **Logging**: Server-side logging for all transactions
- **Testing**: Manual end-to-end testing for full order flow
- **Performance**: Rider location updates every 5 seconds (not more frequent)
- **Notifications**: Both in-app and SMS/Email
- **Timezone**: Store all timestamps in UTC

---

**Timeline**: 1 June - 6 July (One complete sprint)
**Only After This**: Change Razorpay keys and go live

**Definition of Done**: User places order → Payment → Vendor accepts → Rider picks up → Delivers → Payment settled (All real-time, zero manual intervention)
