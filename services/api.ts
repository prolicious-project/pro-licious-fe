import { api } from "@/lib/axios";

// ============================================================
// AUTH APIs
// ============================================================
export const authApi = {
  sendOtp: (phone: string) =>
    api.post("/api/auth/send-otp", { phone }),

  verifyOtp: (data: { phone: string; otp: string; name?: string; role?: string }) =>
    api.post("/api/auth/verify-otp", data),

  login: (email: string, password: string) =>
    api.post("/api/auth/login", { email, password }),

  register: (data: { name: string; email?: string; phone: string; password?: string; role?: string }) =>
    api.post("/api/auth/register", data),

  refreshToken: (refreshToken: string) =>
    api.post("/api/auth/refresh-token", { refreshToken }),

  getMe: () =>
    api.get("/api/auth/me"),

  logout: (refreshToken: string) =>
    api.post("/api/auth/logout", { refreshToken }),
};

// ============================================================
// CUSTOMER APIs
// ============================================================
export const customerApi = {
  // Profile
  getProfile: () => api.get("/api/customer/profile"),
  updateProfile: (data: { name?: string; gender?: string; profileImage?: string }) =>
    api.patch("/api/customer/profile", data),

  // Addresses
  getAddresses: () => api.get("/api/customer/addresses"),
  addAddress: (data: {
    addressType: string; houseNumber: string; street: string;
    landmark?: string; city: string; state: string; pincode: string;
    latitude?: string; longitude?: string; isDefault?: boolean;
  }) => api.post("/api/customer/addresses", data),
  updateAddress: (id: number, data: any) =>
    api.patch(`/api/customer/addresses/${id}`, data),
  deleteAddress: (id: number) =>
    api.delete(`/api/customer/addresses/${id}`),

  // Vendors
  getVendors: (zoneId?: number) =>
    api.get("/api/customer/vendors", { params: zoneId ? { zoneId } : {} }),
  getVendorById: (id: number) =>
    api.get(`/api/customer/vendors/${id}`),
  getVendorMenu: (vendorId: number) =>
    api.get(`/api/customer/vendors/${vendorId}/menu`),

  // Search
  search: (query: string) =>
    api.get("/api/customer/search", { params: { query } }),

  // Categories
  getCategories: () => api.get("/api/customer/categories"),

  // Cart
  getCart: () => api.get("/api/customer/cart"),
  addToCart: (data: { vendorId: number; menuItemId: number; quantity: number; customizations?: any }) =>
    api.post("/api/customer/cart/items", data),
  updateCartItem: (cartItemId: number, quantity: number) =>
    api.patch(`/api/customer/cart/items/${cartItemId}`, { quantity }),
  removeCartItem: (cartItemId: number) =>
    api.delete(`/api/customer/cart/items/${cartItemId}`),
  clearCart: (vendorId?: number) =>
    api.delete("/api/customer/cart", { params: vendorId ? { vendorId } : {} }),

  // Orders
  placeOrder: (data: { vendorId: number; addressId: number; paymentMethod: string }) =>
    api.post("/api/customer/orders", data),
  getOrders: () => api.get("/api/customer/orders"),
  getOrderById: (id: number) =>
    api.get(`/api/customer/orders/${id}`),
  getOrderTracking: (id: number) =>
    api.get(`/api/customer/orders/${id}/tracking`),
  cancelOrder: (id: number) =>
    api.post(`/api/customer/orders/${id}/cancel`),

  // Payments
  initiatePayment: (orderId: number) =>
    api.post("/api/customer/payments/initiate", { orderId }),
  verifyPayment: (data: { orderId: number; razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) =>
    api.post("/api/customer/payments/verify", data),

  // Support
  createSupportTicket: (data: { subject: string; priority: string }) =>
    api.post("/api/customer/support/tickets", data),

  // Favorites
  addFavorite: (vendorId: number) =>
    api.post(`/api/customer/favorites/${vendorId}`),
  removeFavorite: (vendorId: number) =>
    api.delete(`/api/customer/favorites/${vendorId}`),

  // Notifications
  getNotifications: () => api.get("/api/customer/notifications"),
  markNotificationRead: (id: number) =>
    api.patch(`/api/customer/notifications/${id}/read`),

  // Complaints
  getComplaints: () => api.get("/api/customer/complaints"),
};

// ============================================================
// VENDOR APIs
// ============================================================
export const vendorApi = {
  // Profile
  getProfile: () => api.get("/api/vendor/profile"),

  // Branches
  getBranches: () => api.get("/api/vendor/branches"),
  updateBranchStatus: (branchId: number, status: string) =>
    api.patch(`/api/vendor/branches/${branchId}/status`, { status }),

  // Operating Hours
  getOperatingHours: () => api.get("/api/vendor/operating-hours"),
  updateOperatingHours: (data: { branchId: number; hours: { dayOfWeek: number; openTime: string; closeTime: string }[] }) =>
    api.put("/api/vendor/operating-hours", data),

  // Categories
  getCategories: () => api.get("/api/vendor/categories"),
  createCategory: (data: { name: string; description?: string }) =>
    api.post("/api/vendor/categories", data),
  updateCategory: (id: number, data: { name?: string; description?: string }) =>
    api.patch(`/api/vendor/categories/${id}`, data),
  deleteCategory: (id: number) =>
    api.delete(`/api/vendor/categories/${id}`),

  // Menu Items
  getMenu: () => api.get("/api/vendor/menu"),
  createMenuItem: (data: {
    categoryId: number; name: string; description?: string;
    price: number; isVeg?: boolean; stockQuantity?: number; preparationTime?: number;
  }) => api.post("/api/vendor/menu", data),
  updateMenuItem: (id: number, data: any) =>
    api.patch(`/api/vendor/menu/${id}`, data),
  deleteMenuItem: (id: number) =>
    api.delete(`/api/vendor/menu/${id}`),
  toggleMenuAvailability: (id: number, status: string) =>
    api.patch(`/api/vendor/menu/${id}/availability`, { status }),

  // Orders
  getOrders: (status?: string) =>
    api.get("/api/vendor/orders", { params: status ? { status } : {} }),
  getOrderById: (id: number) =>
    api.get(`/api/vendor/orders/${id}`),
  acceptOrder: (id: number) =>
    api.patch(`/api/vendor/orders/${id}/accept`),
  rejectOrder: (id: number) =>
    api.patch(`/api/vendor/orders/${id}/reject`),
  preparingOrder: (id: number) =>
    api.patch(`/api/vendor/orders/${id}/preparing`),
  readyOrder: (id: number) =>
    api.patch(`/api/vendor/orders/${id}/ready`),

  // Analytics
  getAnalyticsSummary: () => api.get("/api/vendor/analytics/summary"),
  getDailyAnalytics: () => api.get("/api/vendor/analytics/daily"),

  // Financial
  getTransactions: () => api.get("/api/vendor/transactions"),
  getSettlements: () => api.get("/api/vendor/settlements"),
  getPerformance: () => api.get("/api/vendor/performance"),
};

// ============================================================
// RIDER APIs
// ============================================================
export const riderApi = {
  // Availability
  toggleAvailability: (isOnline: boolean) =>
    api.patch("/api/rider/availability", { isOnline }),

  // Location
  updateLocation: (data: { orderId?: number; latitude: number; longitude: number }) =>
    api.post("/api/rider/location", data),

  // Orders
  getOrders: () => api.get("/api/rider/orders"),
  getOrderById: (id: number) =>
    api.get(`/api/rider/orders/${id}`),
  acceptOrder: (id: number) =>
    api.patch(`/api/rider/orders/${id}/accept`),
  rejectOrder: (id: number) =>
    api.patch(`/api/rider/orders/${id}/reject`),
  arrivedVendor: (id: number) =>
    api.patch(`/api/rider/orders/${id}/arrived-vendor`),
  pickedUp: (id: number) =>
    api.patch(`/api/rider/orders/${id}/picked-up`),
  arrivedCustomer: (id: number) =>
    api.patch(`/api/rider/orders/${id}/arrived-customer`),
  deliverOrder: (id: number, otp: string) =>
    api.post(`/api/rider/orders/${id}/deliver`, { otp }),

  // Earnings
  getEarnings: () => api.get("/api/rider/earnings"),
  getEarningsSummary: () => api.get("/api/rider/earnings/summary"),

  // Others
  getShifts: () => api.get("/api/rider/shifts"),
  getSettlements: () => api.get("/api/rider/settlements"),
  getPayouts: () => api.get("/api/rider/payouts"),
  getNotifications: () => api.get("/api/rider/notifications"),
};

// ============================================================
// ADMIN APIs
// ============================================================
export const adminApi = {
  // Dashboard
  getLiveDashboard: () => api.get("/api/admin/dashboard/live"),
  getDailyAnalytics: () => api.get("/api/admin/analytics/daily"),
  getDemandSupply: () => api.get("/api/admin/analytics/demand-supply"),

  // Orders
  getOrders: (status?: string) =>
    api.get("/api/admin/orders", { params: status ? { status } : {} }),
  getOrderById: (id: number) =>
    api.get(`/api/admin/orders/${id}`),

  // Vendors
  getVendors: () => api.get("/api/admin/vendors"),
  createVendor: (data: { userId: number; name: string; phone: string; email: string }) =>
    api.post("/api/admin/vendors", data),
  updateVendorStatus: (id: number, status: string) =>
    api.patch(`/api/admin/vendors/${id}/status`, { status }),
  deleteVendor: (id: number) =>
    api.delete(`/api/admin/vendors/${id}`),
  getVendorDocs: (id: number) =>
    api.get(`/api/admin/vendors/${id}/documents`),
  verifyVendorDoc: (vendorId: number, docId: number, status: string) =>
    api.patch(`/api/admin/vendors/${vendorId}/documents/${docId}`, { status }),

  // Riders
  getRiders: () => api.get("/api/admin/riders"),
  getRiderDocs: (id: number) =>
    api.get(`/api/admin/riders/${id}/documents`),
  verifyRiderDoc: (riderId: number, docId: number, status: string) =>
    api.patch(`/api/admin/riders/${riderId}/documents/${docId}`, { status }),

  // Tickets & Complaints
  getTickets: () => api.get("/api/admin/tickets"),
  respondTicket: (id: number, response: string) =>
    api.post(`/api/admin/tickets/${id}/respond`, { response }),
  getComplaints: () => api.get("/api/admin/complaints"),
  respondComplaint: (id: number, response: string) =>
    api.post(`/api/admin/complaints/${id}/respond`, { response }),

  // System
  getAuditLogs: () => api.get("/api/admin/audit-logs"),
  getFraudFlags: () => api.get("/api/admin/fraud-flags"),
};
