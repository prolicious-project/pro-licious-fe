# API Integration Guide - Pro Licious Frontend

## Overview
This document outlines the API endpoints, data structures, and integration points across all frontend pages to ensure consistency with the backend and proper data flow across customer, vendor, rider, and admin dashboards.

---

## API Service Layer
**File:** `services/api.ts`

All API calls should go through the centralized service layer to ensure consistency. This prevents bugs and makes maintenance easier.

### Rider APIs (`riderApi`)
```typescript
// Accept/Reject Orders
riderApi.acceptOrder(orderId: number)        // PATCH /api/rider/orders/{id}/accept
riderApi.rejectOrder(orderId: number)        // PATCH /api/rider/orders/{id}/reject

// Order Status Updates
riderApi.arrivedVendor(orderId: number)      // PATCH /api/rider/orders/{id}/arrived-vendor
riderApi.pickedUp(orderId: number)           // PATCH /api/rider/orders/{id}/picked-up
riderApi.arrivedCustomer(orderId: number)    // PATCH /api/rider/orders/{id}/arrived-customer
riderApi.deliverOrder(orderId: number, otp)  // POST /api/rider/orders/{id}/deliver

// Fetch Data
riderApi.getOrders()                         // GET /api/rider/orders
riderApi.getOrderById(orderId: number)       // GET /api/rider/orders/{id}
riderApi.getEarnings()                       // GET /api/rider/earnings
riderApi.getEarningsSummary()                // GET /api/rider/earnings/summary

// Location & Availability
riderApi.updateLocation({orderId?, latitude, longitude})  // POST /api/rider/location
riderApi.toggleAvailability(isOnline: boolean)            // PATCH /api/rider/availability
```

### Customer APIs (`customerApi`)
```typescript
// Orders
customerApi.getOrders()                      // GET /api/customer/orders
customerApi.getOrderById(id: number)         // GET /api/customer/orders/{id}
customerApi.getOrderTracking(id: number)     // GET /api/customer/orders/{id}/tracking
customerApi.placeOrder(data)                 // POST /api/customer/orders
customerApi.cancelOrder(id: number)          // POST /api/customer/orders/{id}/cancel
```

### Vendor APIs (`vendorApi`)
```typescript
// Orders
vendorApi.getOrders(status?: string)         // GET /api/vendor/orders
vendorApi.getOrderById(id: number)           // GET /api/vendor/orders/{id}
vendorApi.acceptOrder(id: number)            // PATCH /api/vendor/orders/{id}/accept
vendorApi.rejectOrder(id: number)            // PATCH /api/vendor/orders/{id}/reject
vendorApi.preparingOrder(id: number)         // PATCH /api/vendor/orders/{id}/preparing
vendorApi.readyOrder(id: number)             // PATCH /api/vendor/orders/{id}/ready
```

### Admin APIs (`adminApi`)
```typescript
// Orders
adminApi.getOrders(status?: string)          // GET /api/admin/orders
adminApi.getOrderById(id: number)            // GET /api/admin/orders/{id}
```

---

## Order Data Structure

### Standard Order Response
All endpoints should return order data with this structure:

```typescript
interface Order {
  // Identification
  id: number;                    // Order ID
  orderNumber: string;           // Display order number (e.g., "ORD-001")
  
  // Status Fields
  status: string;                // Current order status
  orderStatus: string;           // Alternative status field (for compatibility)
  assignmentStatus?: string;     // For rider assignments
  
  // Parties
  customerId?: number;
  vendorId?: number;
  riderId?: number;
  branchId?: number;
  
  // Financial
  subtotal?: number;             // Item subtotal
  taxAmount?: number;            // Tax amount
  deliveryFee?: number;          // Delivery charge
  platformFee?: number;          // Platform commission
  discountAmount?: number;       // Discount amount
  totalAmount: number;           // Final total
  paymentMethod?: string;        // Payment type
  
  // Timestamps
  createdAt?: string;
  assignedAt?: string;
  acceptedAt?: string;
  completedAt?: string;
  
  // Related Data
  items?: OrderItem[];
  vendor?: VendorInfo;
  customer?: CustomerInfo;
  address?: AddressInfo;
}

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
}

interface VendorInfo {
  id: number;
  name: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  image?: string;
}

interface CustomerInfo {
  name: string;
  phone: string;
  email?: string;
}

interface AddressInfo {
  streetAddress: string;
  city: string;
  latitude: number;
  longitude: number;
  zipCode?: string;
}
```

---

## Order Status Flow

### Complete Order Lifecycle
```
1. PLACED         → Order created by customer
2. ACCEPTED       → Vendor accepts order (vendor dashboard)
3. PREPARING      → Vendor preparing order
4. READY          → Order ready for pickup
5. ASSIGNED       → Rider assigned to order
6. PICKED_UP      → Rider picked up from vendor
7. IN_TRANSIT     → Rider en route to customer
8. DELIVERED      → Rider delivered to customer
9. COMPLETED      → Order completed

Possible Terminal States:
- CANCELLED       → Cancelled by customer/vendor
- REJECTED        → Rejected by vendor/rider
```

### Rider Specific Status Flow
```
Order Lifecycle from Rider Perspective:

1. ASSIGNED → Rider receives order notification
   Action: Can accept or reject within 30 seconds
   
2. ACCEPTED → Rider accepts the order
   Next Page: /rider-dashboard/track/{orderId}
   Action: Click "Arrived at Vendor"
   
3. ARRIVED_VENDOR → Rider at vendor location
   Action: Click "Order Picked Up"
   
4. PICKED_UP → Rider picked up order from vendor
   Action: Click "Arrived at Customer"
   
5. ARRIVED_CUSTOMER → Rider at customer location
   Action: Enter 4-digit OTP to confirm delivery
   
6. DELIVERED → Order successfully delivered
   Redirect: Back to /rider-dashboard
```

---

## Real-Time Updates (Socket.io Events)

### Rider Socket Events
```typescript
// Connection
socket.emit("join_order_room", { orderId: number })

// Broadcasts
socket.on("new_order_assigned", (data: {orderId, order}) => {})
socket.on("rider_assigned", (data: any) => {})
socket.on("order_status_changed", (data: {orderId, status}) => {})
socket.on("delivery_confirmed", (data: any) => {})
```

### Customer Socket Events
```typescript
// Connection
socket.emit("join_order_room", { 
  orderId: number, 
  userId: number, 
  role: "CUSTOMER" 
})

// Broadcasts
socket.on("order_status_changed", () => {})
socket.on("rider_assigned", () => {})
```

### Vendor Socket Events
```typescript
// Connection
socket.emit("join_order_room", { 
  orderId: number, 
  userId: number, 
  role: "VENDOR" 
})

// Broadcasts
socket.on("order_status_changed", () => {})
socket.on("rider_assigned", () => {})
```

---

## Page Integration Points

### 1. Rider Dashboard
**File:** `app/rider-dashboard/page.tsx`

**Purpose:** Main rider hub showing pending orders and active delivery

**API Calls:**
- `riderApi.getOrders()` - Get all orders
- `riderApi.getEarningsSummary()` - Get earnings data
- `riderApi.acceptOrder(id)` - Accept pending order
- `riderApi.rejectOrder(id)` - Reject pending order

**Data Flow:**
```
Pending Orders → Accept → Navigate to /rider-dashboard/track/{orderId}
```

**Socket Integration:**
- Listens for `new_order_assigned` to add to pending list
- Listens for `order_status_changed` to update active order
- Listens for `pending_assignments` on initial connection

---

### 2. Rider Order Tracking (Detailed Page)
**File:** `app/rider-dashboard/track/[orderId]/page.tsx`

**Purpose:** Real-time tracking with map and detailed order information

**API Calls:**
- `riderApi.getOrderById(orderId)` - Get full order details
- `riderApi.updateLocation(data)` - Send GPS location
- `riderApi.arrivedVendor(orderId)` - Mark arrived at vendor
- `riderApi.pickedUp(orderId)` - Mark order picked up
- `riderApi.arrivedCustomer(orderId)` - Mark arrived at customer
- `riderApi.deliverOrder(orderId, otp)` - Confirm delivery with OTP

**Display Elements:**
- Full-screen map with vendor, customer, and rider locations
- Order details panel showing:
  - Vendor information with phone to call
  - Customer information with phone to call
  - Order items list (all items with quantities and prices)
  - Price breakdown (subtotal, tax, fees, discounts, total)
  - Delivery progress tracker
  - Status-appropriate action buttons
  - OTP input for final confirmation

**Data Requirements:**
```typescript
Required order fields:
- vendor: { id, name, address, phone, latitude, longitude }
- customer: { name, phone }
- address: { streetAddress, city, latitude, longitude, zipCode }
- items: Array<{ name, quantity, price }>
- subtotal, taxAmount, deliveryFee, platformFee, discountAmount, totalAmount
- status (ACCEPTED | ARRIVED_VENDOR | PICKED_UP | ARRIVED_CUSTOMER | DELIVERED)
```

**Socket Integration:**
- Joins order room with rider context
- Listens for `order_status_changed` to update status
- Emits rider location updates

---

### 3. Customer Order Details
**File:** `app/orders/[id]/page.tsx`

**Purpose:** Customer view of order status and tracking

**API Calls:**
- `customerApi.getOrderById(id)` - Get order details
- `customerApi.getOrderTracking(id)` - Get tracking updates
- `customerApi.cancelOrder(id)` - Cancel order

**Socket Integration:**
- Joins order room with customer context
- Listens for `order_status_changed` to update status
- Listens for `rider_assigned` to show rider info

**Note:** Should match rider tracking page in terms of showing map and order details

---

### 4. Vendor Orders Management
**File:** `app/vendor-dashboard/orders/page.tsx`

**Purpose:** Vendor view of orders to accept and manage

**API Calls:**
- `vendorApi.getOrders(status?)` - Get all orders
- `vendorApi.getOrderById(id)` - Get order details
- `vendorApi.acceptOrder(id)` - Accept order
- `vendorApi.rejectOrder(id)` - Reject order
- `vendorApi.preparingOrder(id)` - Mark as preparing
- `vendorApi.readyOrder(id)` - Mark as ready

**Data Display:**
- Should show same order details structure as rider/customer pages
- Should update in real-time via socket events

---

### 5. Admin Orders Management
**File:** `app/admin-dashboard/orders/page.tsx`

**Purpose:** Admin monitoring of all platform orders

**API Calls:**
- `adminApi.getOrders(status?)` - Get all orders
- `adminApi.getOrderById(id)` - Get order details

**Data Display:**
- Should display complete order information from all parties
- Should show status flow from creation to completion

---

## Data Consistency Checklist

✅ **All API calls use service layer** (`riderApi`, `customerApi`, etc.)
✅ **Order responses include** vendor, customer, address with coordinates
✅ **Price fields present** (subtotal, tax, fees, discounts, total)
✅ **Status field** is consistent across all responses
✅ **Socket events** trigger data refresh on all pages
✅ **Timestamps** use consistent field names (assignedAt, completedAt)
✅ **Error handling** provides user-friendly messages
✅ **Loading states** shown during API calls
✅ **Location data** includes latitude/longitude as numbers
✅ **Items array** includes name, quantity, price for each item

---

## Error Handling

### API Error Response Format
Expected backend error format:
```typescript
{
  status: number,
  message: string,
  code: string,
  data?: any
}
```

### Error Handling Pattern
```typescript
try {
  await someApiCall();
} catch (err: any) {
  const errorMsg = err.response?.data?.message || "Default error message";
  console.error("Full error:", err);
  // Show to user
}
```

---

## Testing Checklist

### Rider Order Acceptance Flow
- [ ] Accept button visible on pending order
- [ ] Clicking accept calls `riderApi.acceptOrder(id)`
- [ ] Redirects to tracking page
- [ ] Tracking page loads order with vendor/customer details
- [ ] Map shows all three markers
- [ ] Order items displayed
- [ ] Price breakdown complete
- [ ] Status buttons work in sequence
- [ ] OTP input validates (4 digits)
- [ ] Delivery confirmation works
- [ ] Returns to dashboard after completion

### Data Sync Across Pages
- [ ] Customer page shows same order details as rider page
- [ ] Vendor page receives status updates from rider actions
- [ ] Admin page shows all orders with correct status
- [ ] Socket events update all viewers in real-time
- [ ] No data mismatches between pages

### API Consistency
- [ ] All endpoints use correct paths from `services/api.ts`
- [ ] Response data structures match interface definitions
- [ ] All required fields present in responses
- [ ] Error messages are user-friendly
- [ ] No 404 errors from wrong endpoint paths

---

## Common Issues & Solutions

### Issue: Order shows on dashboard but doesn't load on tracking page
**Solution:** Verify `riderApi.getOrderById()` returns complete order object with vendor/customer/address/items

### Issue: Map doesn't show vendor/customer locations
**Solution:** Check that vendor.latitude/longitude and address.latitude/longitude are numbers (not strings)

### Issue: Price breakdown incomplete
**Solution:** Ensure all fields (subtotal, tax, deliveryFee, platformFee, discountAmount) are included in response

### Issue: Real-time updates not working
**Solution:** Verify socket events are emitted with correct orderId and pages join room on load

### Issue: OTP input not working
**Solution:** Verify `riderApi.deliverOrder(orderId, otp)` sends OTP as string

---

## Backend Integration Notes

### When Backend Updates
1. Verify all response objects include required fields
2. Update status enum values if changed
3. Ensure socket events emitted for all status changes
4. Validate location data is numeric coordinates
5. Check error messages are consistent format
6. Test with all user roles (customer, vendor, rider, admin)

### When Frontend Updates
1. Update service methods in `services/api.ts`
2. Update interface definitions to match response
3. Add new socket event listeners if added
4. Test data flow across all related pages
5. Verify no breaking changes to existing APIs
