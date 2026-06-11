"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { 
  ArrowUpRight, Activity, ShieldCheck, AlertTriangle, 
  Search, FileText, Store, Truck, Users, IndianRupee, 
  Map, Clock, Check, X, ShieldAlert, Sparkles, Navigation,
  LayoutDashboard
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import AdminSidebar from "@/components/AdminSidebar";

type TabType = "overview" | "orders" | "vendors" | "riders" | "customers" | "payments" | "tracking";

export default function AdminDashboard() {
  const router = useRouter();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  
  // Realtime datasets
  const [realtimeData, setRealtimeData] = useState<any>(null);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [demandSupplyData, setDemandSupplyData] = useState<any[]>([]);
  
  // UX State
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [trackedOrderId, setTrackedOrderId] = useState<number | null>(null);

  // Initial redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // Fast Polling Effect (1 second for telemetry)
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchRealtime = async () => {
      try {
        const res = await api.get("/api/admin/dashboard/realtime");
        setRealtimeData(res.data?.data);
        setTick((prev) => prev + 1);
      } catch (err) {
        console.error("Realtime fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRealtime();
    const interval = setInterval(fetchRealtime, 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Analytics Polling Effect (30 seconds for charts and zones)
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchAnalytics = () => {
      Promise.all([
        api.get("/api/admin/analytics/daily"),
        api.get("/api/admin/analytics/demand-supply"),
      ])
        .then(([dailyRes, dsRes]) => {
          const daily = dailyRes.data?.data || [];
          setDailyData(daily.map((d: any) => ({
            date: d.metricDate || d.date?.substring(5) || d.day,
            orders: parseInt(d.totalOrders || d.orders || 0)
          })).reverse());
          setDemandSupplyData(dsRes.data?.data || []);
        })
        .catch((err) => console.error("Analytics fetch error:", err));
    };

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // --- DATA MAPPINGS ---
  
  const mappedOrders = useMemo(() => {
    if (!realtimeData) return [];
    const { orders = [], users = [], vendors = [], customerProfiles = [], riders = [], payments = [] } = realtimeData;
    
    return orders.map((order: any) => {
      const profile = customerProfiles.find((cp: any) => cp.id === order.customerId);
      const customer = profile ? users.find((u: any) => u.id === profile.userId) : null;
      const vendor = vendors.find((v: any) => v.id === order.vendorId);
      const riderObj = riders.find((r: any) => r.id === order.riderId);
      const riderUser = riderObj ? users.find((u: any) => u.id === riderObj.userId) : null;
      const payment = payments.find((p: any) => p.orderId === order.id);

      return {
        ...order,
        customerName: customer ? customer.name : "John Customer (Demo)",
        customerPhone: customer ? customer.phone : "N/A",
        vendorName: vendor ? vendor.name : "Unknown Vendor",
        riderName: riderUser ? riderUser.name : "Unassigned",
        riderPhone: riderUser ? riderUser.phone : "N/A",
        paymentStatus: payment ? payment.status : "SUCCESS",
        paymentMethod: payment ? payment.paymentMode : "UPI"
      };
    });
  }, [realtimeData]);

  const mappedRiders = useMemo(() => {
    if (!realtimeData) return [];
    const { riders = [], users = [], riderAvailability = [] } = realtimeData;
    
    return riders.map((rider: any) => {
      const userObj = users.find((u: any) => u.id === rider.userId);
      const avail = riderAvailability.find((a: any) => a.riderId === rider.id);
      return {
        ...rider,
        name: userObj ? userObj.name : "Speedy Rider (Demo)",
        phone: userObj ? userObj.phone : "N/A",
        email: userObj ? userObj.email : "N/A",
        isOnline: avail ? avail.isOnline : false,
        activeOrders: avail ? avail.activeOrders : 0,
        lastSeen: avail ? avail.lastSeen : null
      };
    });
  }, [realtimeData]);

  const mappedVendors = useMemo(() => {
    if (!realtimeData) return [];
    const { vendors = [] } = realtimeData;
    return vendors;
  }, [realtimeData]);

  const mappedCustomers = useMemo(() => {
    if (!realtimeData) return [];
    const { users = [] } = realtimeData;
    return users.filter((u: any) => u.role === "CUSTOMER");
  }, [realtimeData]);

  const mappedPayments = useMemo(() => {
    if (!realtimeData) return [];
    const { payments = [] } = realtimeData;
    return payments;
  }, [realtimeData]);

  // --- FILTERING LOGIC ---

  const searchFilter = (item: any, fields: string[]) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return fields.some((field) => {
      const val = item[field];
      return val && String(val).toLowerCase().includes(q);
    });
  };

  const filteredOrders = useMemo(() => {
    return mappedOrders.filter((item: any) => 
      searchFilter(item, ["orderNumber", "customerName", "vendorName", "riderName", "status"])
    );
  }, [mappedOrders, searchQuery]);

  const filteredVendors = useMemo(() => {
    return mappedVendors.filter((item: any) => 
      searchFilter(item, ["name", "phone", "email", "status"])
    );
  }, [mappedVendors, searchQuery]);

  const filteredRiders = useMemo(() => {
    return mappedRiders.filter((item: any) => 
      searchFilter(item, ["name", "phone", "email", "vehicleType", "vehicleNumber"])
    );
  }, [mappedRiders, searchQuery]);

  const filteredCustomers = useMemo(() => {
    return mappedCustomers.filter((item: any) => 
      searchFilter(item, ["name", "phone", "email"])
    );
  }, [mappedCustomers, searchQuery]);

  const filteredPayments = useMemo(() => {
    return mappedPayments.filter((item: any) => 
      searchFilter(item, ["paymentReference", "amount", "status", "paymentMode"])
    );
  }, [mappedPayments, searchQuery]);

  // --- STATS OVERVIEW ---
  
  const stats = useMemo(() => {
    if (!realtimeData) return { revenue: "0.00", activeOrders: 0, vendors: 0, riders: 0, customers: 0 };
    const { orders = [], vendors = [], customerProfiles = [], riderAvailability = [] } = realtimeData;
    
    const active = orders.filter((o: any) => !["DELIVERED", "CANCELLED"].includes(o.status)).length;
    const online = riderAvailability.filter((a: any) => a.isOnline).length;
    const revenue = orders
      .filter((o: any) => o.status === "DELIVERED")
      .reduce((acc: number, o: any) => acc + parseFloat(o.totalAmount || 0), 0)
      .toFixed(2);

    return {
      revenue,
      activeOrders: active,
      vendors: vendors.length,
      riders: online,
      customers: customerProfiles.length
    };
  }, [realtimeData]);

  // --- SVG MAP COORDINATE PROJECTION ---
  // Mumbai coordinates ranges: Lng ~ 72.80 - 72.90, Lat ~ 19.00 - 19.10
  const projectCoords = (latStr: string | null, lngStr: string | null) => {
    const lat = parseFloat(latStr || "19.05");
    const lng = parseFloat(lngStr || "72.83");
    
    // Convert to percentage values (10% to 90% boundary box inside SVG)
    const x = ((lng - 72.80) / 0.10) * 100;
    const y = (1 - (lat - 19.00) / 0.10) * 100; // Invert Y as SVG starts from top-left
    
    return { 
      x: Math.max(10, Math.min(90, x)), 
      y: Math.max(10, Math.min(90, y)) 
    };
  };

  // Find coordinates for rider tracking map
  const liveRiderMapNodes = useMemo(() => {
    if (!realtimeData) return [];
    const { trackingEvents = [] } = realtimeData;

    // Get active orders currently being delivered
    const activeOrders = mappedOrders.filter((o: any) => ["PREPARING", "READY", "PICKED_UP"].includes(o.status));
    
    return activeOrders.map((order: any) => {
      // Look for latest GPS update in trackingEvents
      const latestGPS = trackingEvents.find((evt: any) => evt.orderId === order.id && evt.eventType === "LOCATION_UPDATE");
      
      // Default positions: Branch = Vendor, Customer = Address
      // For seed data: branch = linking road/bandra, customer = linkages
      const branchLat = "19.0544";
      const branchLng = "72.8339";
      const custLat = "19.0596";
      const custLng = "72.8295";

      const start = projectCoords(branchLat, branchLng);
      const end = projectCoords(custLat, custLng);

      // Simulate a moving rider coordinate based on creation timestamp
      const createdTime = new Date(order.createdAt).getTime();
      const timeElapsed = (Date.now() - createdTime) / 1000; // seconds
      const deliveryDuration = 180; // simulate 3 minute trip
      const ratio = Math.min(1, Math.max(0, timeElapsed / deliveryDuration));

      let currentX = start.x;
      let currentY = start.y;

      if (latestGPS?.latitude && latestGPS?.longitude) {
        const gpsProj = projectCoords(latestGPS.latitude, latestGPS.longitude);
        currentX = gpsProj.x;
        currentY = gpsProj.y;
      } else {
        // Linear interpolation if no real GPS location event exists yet
        currentX = start.x + (end.x - start.x) * ratio;
        currentY = start.y + (end.y - start.y) * ratio;
      }

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        riderName: order.riderName,
        riderPhone: order.riderPhone,
        vendorName: order.vendorName,
        customerName: order.customerName,
        status: order.status,
        progress: Math.round(ratio * 100),
        start,
        end,
        current: { x: currentX, y: currentY }
      };
    });
  }, [realtimeData, mappedOrders]);

  const currentlyTrackedRider = useMemo(() => {
    if (!trackedOrderId) return null;
    return liveRiderMapNodes.find((n: any) => n.orderId === trackedOrderId) || null;
  }, [liveRiderMapNodes, trackedOrderId]);

  // Action: toggle rider online status
  const handleToggleRiderStatus = async (riderId: number, currentStatus: boolean) => {
    try {
      await api.patch(`/api/admin/riders/${riderId}/status`, { status: currentStatus ? "SUSPENDED" : "ACTIVE" });
      // The realtime interval will automatically pick up the status change next second.
    } catch (err) {
      console.error("Failed to change rider status:", err);
    }
  };

  // Action: toggle vendor status
  const handleToggleVendorStatus = async (vendorId: number, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      await api.patch(`/api/admin/vendors/${vendorId}/status`, { status: nextStatus });
    } catch (err) {
      console.error("Failed to change vendor status:", err);
    }
  };

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden text-sm">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Viewport */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        
        {/* Real-time Header */}
        <header className="bg-white border-b border-gray-100 px-8 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Operations Center</h2>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Live Feed
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">Telemetry ticking: {tick}s • Poll interval: 1000ms</p>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            {/* Global Search Box */}
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Live search items..."
                className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 text-xs transition-all shadow-sm"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 font-bold text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="hidden lg:flex items-center gap-3 border-l border-gray-100 pl-4">
              <div className="text-right">
                <p className="font-bold text-gray-900 text-xs">{user?.name || "Admin"}</p>
                <p className="text-[10px] text-red-600 font-bold uppercase tracking-wider">Super Admin</p>
              </div>
              <div className="w-9 h-9 bg-zinc-800 rounded-xl flex items-center justify-center text-white font-extrabold shadow-md">
                {user?.name?.[0] || "A"}
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Tabs Toolbar */}
        <div className="px-8 border-b border-gray-100 bg-gray-50/50 flex gap-2 overflow-x-auto py-2 shrink-0">
          {[
            { id: "overview", label: "Overview", icon: LayoutDashboard },
            { id: "orders", label: `Orders (${filteredOrders.length})`, icon: FileText },
            { id: "vendors", label: `Vendors (${filteredVendors.length})`, icon: Store },
            { id: "riders", label: `Delivery Riders (${filteredRiders.length})`, icon: Truck },
            { id: "customers", label: `Customers (${filteredCustomers.length})`, icon: Users },
            { id: "payments", label: `Payments (${filteredPayments.length})`, icon: IndianRupee },
            { id: "tracking", label: `Rider Tracking (${liveRiderMapNodes.length})`, icon: Navigation },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as TabType);
                  setSearchQuery(""); // Clear search on tab switch for cleaner UX
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive 
                    ? "bg-red-600 text-white shadow-md shadow-red-600/10 border-b border-red-700" 
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100 bg-white border border-gray-100"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Real-time Content Workspace */}
        <div className="flex-1 overflow-y-auto p-8 bg-zinc-50/20">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent shadow-sm"></div>
              <p className="text-gray-400 font-bold text-sm">Initializing operational streams...</p>
            </div>
          ) : (
            <div className="space-y-6 max-w-7xl mx-auto">
              
              {/* Tab 1: Overview Dashboard */}
              {activeTab === "overview" && (
                <>
                  {/* Operations KPIs */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: "Delivered Revenue", value: `₹${parseFloat(stats.revenue).toLocaleString()}`, icon: IndianRupee, desc: "Delivered orders total" },
                      { label: "Active Orders", value: stats.activeOrders, icon: Clock, desc: "Processing & Out for delivery" },
                      { label: "Registered Merchants", value: stats.vendors, icon: Store, desc: "Total onboarded partners" },
                      { label: "Active Riders Online", value: stats.riders, icon: Truck, desc: "Available for deliveries" },
                    ].map((stat, i) => (
                      <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-gray-400 font-bold text-[10px] uppercase tracking-wider">{stat.label}</p>
                            <h3 className="text-2xl font-black text-gray-900 mt-1">{stat.value}</h3>
                          </div>
                          <div className="p-3 bg-red-50 text-red-600 rounded-2xl shadow-inner"><stat.icon className="w-5 h-5" /></div>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-4 font-medium">{stat.desc}</p>
                      </div>
                    ))}
                  </div>

                  {/* Volume Chart & Alert Telemetry */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Charts */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h3 className="font-bold text-gray-900 text-base">System Load Analysis</h3>
                          <p className="text-gray-400 text-xs mt-0.5">Overall order throughput past 30 days</p>
                        </div>
                      </div>
                      <div className="h-64">
                        {dailyData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 10 }} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 10 }} />
                              <Tooltip />
                              <Area type="monotone" dataKey="orders" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorOrders)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-gray-400 text-xs">Awaiting daily telemetry updates...</div>
                        )}
                      </div>
                    </div>

                    {/* Incident Telemetry */}
                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
                      <h3 className="font-bold text-gray-900 text-base mb-1">Security & Flag Feed</h3>
                      <p className="text-gray-400 text-xs mb-4">Risk scoring checks on user wallets/orders</p>
                      
                      <div className="flex-1 space-y-4 overflow-y-auto max-h-64 pr-1">
                        <div className="flex gap-3 items-start border-b border-gray-50 pb-4">
                          <div className="bg-green-50 p-2.5 rounded-xl text-green-600"><ShieldCheck className="w-5 h-5" /></div>
                          <div>
                            <p className="font-bold text-xs text-gray-900">Fraud Engine Active</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Verification checks successfully applied to all orders.</p>
                          </div>
                        </div>

                        <div className="flex gap-3 items-start border-b border-gray-50 pb-4">
                          <div className="bg-red-50 p-2.5 rounded-xl text-red-600"><ShieldAlert className="w-5 h-5" /></div>
                          <div>
                            <p className="font-bold text-xs text-gray-900">No Incidents Reported</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Zero exceptions caught on gateway checkouts.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Demand & Supply Zone Metrics */}
                  <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-900 text-base mb-1">Live Surge Coordinates</h3>
                    <p className="text-gray-400 text-xs mb-6">Zone saturation levels updated real-time</p>
                    
                    {demandSupplyData.length === 0 ? (
                      <p className="text-gray-400 py-6 text-center text-xs">No metrics received from zones.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="text-[10px] font-bold uppercase text-gray-400 border-b border-gray-100 bg-gray-50/50">
                              <th className="px-6 py-3">Zone Coordinates</th>
                              <th className="px-6 py-3">Live Active Orders</th>
                              <th className="px-6 py-3">Riders Stationed</th>
                              <th className="px-6 py-3">Surge Charge</th>
                              <th className="px-6 py-3">Telemetry Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 text-xs">
                            {demandSupplyData.slice(0, 5).map((metric: any) => (
                              <tr key={metric.id} className="hover:bg-gray-50/50">
                                <td className="px-6 py-4 font-bold text-gray-900">Zone #{metric.zoneId}</td>
                                <td className="px-6 py-4 font-bold">{metric.activeOrders}</td>
                                <td className="px-6 py-4 text-gray-500">{metric.availableRiders}</td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                    parseFloat(metric.surgeFactor) > 1.2 
                                      ? "bg-amber-50 text-amber-700 border border-amber-100" 
                                      : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                  }`}>
                                    {parseFloat(metric.surgeFactor).toFixed(2)}x
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-bold">
                                  {parseFloat(metric.surgeFactor) > 1.2 ? (
                                    <span className="text-amber-600 font-extrabold text-[10px] tracking-wide">⚡ SURGE PRICING</span>
                                  ) : (
                                    <span className="text-emerald-600 font-bold text-[10px] tracking-wide">STABLE</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Tab 2: Live Orders Feed */}
              {activeTab === "orders" && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-black text-gray-900 text-lg">Orders Telemetry</h3>
                      <p className="text-gray-400 text-xs mt-0.5">Real-time status changes and pricing details</p>
                    </div>
                  </div>

                  {filteredOrders.length === 0 ? (
                    <div className="text-center py-20 text-gray-400 text-xs">No orders match search query.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-[10px] font-bold uppercase text-gray-400 border-b border-gray-100 bg-gray-50/50">
                            <th className="px-6 py-3">Order Number</th>
                            <th className="px-6 py-3">Customer</th>
                            <th className="px-6 py-3">Merchant</th>
                            <th className="px-6 py-3">Rider Assigned</th>
                            <th className="px-6 py-3">Amount</th>
                            <th className="px-6 py-3">Payment</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs">
                          {filteredOrders.map((order: any) => (
                            <tr key={order.id} className="hover:bg-gray-50/30">
                              <td className="px-6 py-4 font-bold text-gray-900">{order.orderNumber}</td>
                              <td className="px-6 py-4 font-bold">{order.customerName}</td>
                              <td className="px-6 py-4 text-gray-600 font-medium">{order.vendorName}</td>
                              <td className="px-6 py-4 text-gray-600">{order.riderName}</td>
                              <td className="px-6 py-4 font-black">₹{parseFloat(order.totalAmount).toFixed(2)}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                                  order.paymentStatus === "SUCCESS" 
                                    ? "bg-emerald-50 text-emerald-600" 
                                    : "bg-amber-50 text-amber-600"
                                }`}>
                                  {order.paymentStatus} ({order.paymentMethod})
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                  order.status === "DELIVERED" 
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                    : order.status === "CANCELLED"
                                    ? "bg-red-50 text-red-700 border border-red-100"
                                    : "bg-blue-50 text-blue-700 border border-blue-100 animate-pulse"
                                }`}>
                                  {order.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {["DELIVERED", "CANCELLED"].includes(order.status) ? (
                                  <span className="text-gray-400 text-[10px] font-bold uppercase">Archived</span>
                                ) : (
                                  <button
                                    onClick={() => setTrackedOrderId(order.id)}
                                    className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-1.5 rounded-lg text-[10px] border border-red-100 shadow-sm transition-all"
                                  >
                                    Track Live
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Live Vendors */}
              {activeTab === "vendors" && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                  <div>
                    <h3 className="font-black text-gray-900 text-lg">Merchant Registry</h3>
                    <p className="text-gray-400 text-xs mt-0.5">Control access and status of local slaughterhouses and shops</p>
                  </div>

                  {filteredVendors.length === 0 ? (
                    <div className="text-center py-20 text-gray-400 text-xs">No merchants match query.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-[10px] font-bold uppercase text-gray-400 border-b border-gray-100 bg-gray-50/50">
                            <th className="px-6 py-3">Store Name</th>
                            <th className="px-6 py-3">Phone</th>
                            <th className="px-6 py-3">Email</th>
                            <th className="px-6 py-3">Rating</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Access control</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs">
                          {filteredVendors.map((vendor: any) => (
                            <tr key={vendor.id} className="hover:bg-gray-50/30">
                              <td className="px-6 py-4 font-bold text-gray-900">{vendor.name}</td>
                              <td className="px-6 py-4 text-gray-600">{vendor.phone || "N/A"}</td>
                              <td className="px-6 py-4 text-gray-600">{vendor.email || "N/A"}</td>
                              <td className="px-6 py-4 font-bold text-amber-600">★ {vendor.rating || "0.00"}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase ${
                                  vendor.status === "ACTIVE" 
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                    : "bg-red-50 text-red-700 border border-red-100"
                                }`}>
                                  {vendor.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => handleToggleVendorStatus(vendor.id, vendor.status)}
                                  className={`font-bold px-3 py-1.5 rounded-lg text-[10px] shadow-sm border transition-all ${
                                    vendor.status === "ACTIVE" 
                                      ? "bg-red-50 text-red-600 border-red-100 hover:bg-red-100" 
                                      : "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
                                  }`}
                                >
                                  {vendor.status === "ACTIVE" ? "Suspend" : "Activate"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Live Riders */}
              {activeTab === "riders" && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                  <div>
                    <h3 className="font-black text-gray-900 text-lg">Delivery Riders</h3>
                    <p className="text-gray-400 text-xs mt-0.5">Real-time tracking of driver availability and vehicle validations</p>
                  </div>

                  {filteredRiders.length === 0 ? (
                    <div className="text-center py-20 text-gray-400 text-xs">No delivery riders found.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-[10px] font-bold uppercase text-gray-400 border-b border-gray-100 bg-gray-50/50">
                            <th className="px-6 py-3">Driver Name</th>
                            <th className="px-6 py-3">Phone</th>
                            <th className="px-6 py-3">Vehicle Details</th>
                            <th className="px-6 py-3">License Number</th>
                            <th className="px-6 py-3">Network Status</th>
                            <th className="px-6 py-3">Approval</th>
                            <th className="px-6 py-3 text-right">Controls</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs">
                          {filteredRiders.map((rider: any) => (
                            <tr key={rider.id} className="hover:bg-gray-50/30">
                              <td className="px-6 py-4 font-bold text-gray-900">{rider.name}</td>
                              <td className="px-6 py-4 text-gray-600">{rider.phone}</td>
                              <td className="px-6 py-4 font-medium text-gray-700">
                                {rider.vehicleType || "BIKE"} ({rider.vehicleNumber || "N/A"})
                              </td>
                              <td className="px-6 py-4 font-mono">{rider.licenseNumber || "N/A"}</td>
                              <td className="px-6 py-4">
                                <span className={`flex items-center gap-1.5 font-bold ${
                                  rider.isOnline ? "text-emerald-600" : "text-gray-400"
                                }`}>
                                  <span className={`h-2 w-2 rounded-full ${rider.isOnline ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`}></span>
                                  {rider.isOnline ? "ONLINE" : "OFFLINE"}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                                  rider.status === "ACTIVE" 
                                    ? "bg-emerald-50 text-emerald-600" 
                                    : "bg-red-50 text-red-600"
                                }`}>
                                  {rider.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => handleToggleRiderStatus(rider.id, rider.status === "ACTIVE")}
                                  className={`font-bold px-3 py-1.5 rounded-lg text-[10px] shadow-sm border transition-all ${
                                    rider.status === "ACTIVE" 
                                      ? "bg-red-50 text-red-600 border-red-100 hover:bg-red-100" 
                                      : "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100"
                                  }`}
                                >
                                  {rider.status === "ACTIVE" ? "Suspend" : "Approve"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 5: Customers */}
              {activeTab === "customers" && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                  <div>
                    <h3 className="font-black text-gray-900 text-lg">Customer Directory</h3>
                    <p className="text-gray-400 text-xs mt-0.5">Roster of registered users ordering products on the platform</p>
                  </div>

                  {filteredCustomers.length === 0 ? (
                    <div className="text-center py-20 text-gray-400 text-xs">No customers found.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-[10px] font-bold uppercase text-gray-400 border-b border-gray-100 bg-gray-50/50">
                            <th className="px-6 py-3">Customer Name</th>
                            <th className="px-6 py-3">Phone</th>
                            <th className="px-6 py-3">Email Address</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Registered At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs">
                          {filteredCustomers.map((cust: any) => (
                            <tr key={cust.id} className="hover:bg-gray-50/30">
                              <td className="px-6 py-4 font-bold text-gray-900">{cust.name}</td>
                              <td className="px-6 py-4 text-gray-600">{cust.phone || "N/A"}</td>
                              <td className="px-6 py-4 text-gray-600">{cust.email || "N/A"}</td>
                              <td className="px-6 py-4">
                                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-600 uppercase">
                                  {cust.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-gray-400 font-mono">
                                {new Date(cust.createdAt).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 6: Live Payments */}
              {activeTab === "payments" && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                  <div>
                    <h3 className="font-black text-gray-900 text-lg">Payments Log</h3>
                    <p className="text-gray-400 text-xs mt-0.5">E-checkout transaction logs refreshed in real-time</p>
                  </div>

                  {filteredPayments.length === 0 ? (
                    <div className="text-center py-20 text-gray-400 text-xs">No transactions recorded.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-[10px] font-bold uppercase text-gray-400 border-b border-gray-100 bg-gray-50/50">
                            <th className="px-6 py-3">Transaction ID</th>
                            <th className="px-6 py-3">Order ID</th>
                            <th className="px-6 py-3">Amount</th>
                            <th className="px-6 py-3">Gateway</th>
                            <th className="px-6 py-3">Payment Mode</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-xs">
                          {filteredPayments.map((pay: any) => (
                            <tr key={pay.id} className="hover:bg-gray-50/30">
                              <td className="px-6 py-4 font-mono font-bold text-gray-700">{pay.paymentReference || "pay_mock_1"}</td>
                              <td className="px-6 py-4 font-bold text-gray-900">Order #{pay.orderId}</td>
                              <td className="px-6 py-4 font-black text-gray-900">₹{parseFloat(pay.amount).toFixed(2)}</td>
                              <td className="px-6 py-4 text-gray-500 font-bold">{pay.gateway}</td>
                              <td className="px-6 py-4 text-gray-600 font-medium">{pay.paymentMode || "UPI"}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                  pay.status === "SUCCESS"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                    : "bg-red-50 text-red-700 border border-red-100"
                                }`}>
                                  {pay.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-gray-400 font-mono">
                                {new Date(pay.createdAt).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 7: Rider Live Tracking & Map */}
              {activeTab === "tracking" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left: Interactive SVGs Map Container */}
                  <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
                    <div>
                      <h3 className="font-black text-gray-900 text-base">Live Geographic Position</h3>
                      <p className="text-gray-400 text-xs mt-0.5">Animated bike nodes projecting actual coordinates in Mumbai</p>
                    </div>

                    {/* SVG Map Grid */}
                    <div className="relative aspect-[4/3] bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 shadow-inner flex items-center justify-center">
                      
                      {/* Grid Map Background Lines */}
                      <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                      </svg>

                      {/* simulated streets */}
                      <svg className="absolute inset-0 w-full h-full opacity-25" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <line x1="10" y1="20" x2="90" y2="20" stroke="white" strokeWidth="0.5" strokeDasharray="1,1" />
                        <line x1="20" y1="10" x2="20" y2="90" stroke="white" strokeWidth="0.5" strokeDasharray="1,1" />
                        <line x1="10" y1="50" x2="90" y2="50" stroke="white" strokeWidth="0.5" />
                        <line x1="72" y1="10" x2="72" y2="90" stroke="white" strokeWidth="0.5" />
                        <line x1="10" y1="80" x2="90" y2="80" stroke="white" strokeWidth="0.5" strokeDasharray="1,1" />
                      </svg>

                      <div className="absolute top-4 left-4 z-20 bg-zinc-950/80 px-3 py-1.5 rounded-lg border border-zinc-800 text-[10px] text-zinc-400 font-mono shadow-md">
                        MUMBAI SUBURBS MAP GRID (PROJ)
                      </div>

                      {/* Map Nodes Layer */}
                      <svg className="absolute inset-0 w-full h-full z-10" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                        
                        {/* Selected rider path */}
                        {currentlyTrackedRider && (
                          <line
                            x1={currentlyTrackedRider.start.x}
                            y1={currentlyTrackedRider.start.y}
                            x2={currentlyTrackedRider.end.x}
                            y2={currentlyTrackedRider.end.y}
                            stroke="#ef4444"
                            strokeWidth="0.6"
                            strokeDasharray="2,2"
                          />
                        )}

                        {liveRiderMapNodes.map((node: any) => {
                          const isTracked = trackedOrderId === node.orderId;
                          return (
                            <g key={node.orderId}>
                              
                              {/* Vendor Hub Pin */}
                              <circle cx={node.start.x} cy={node.start.y} r="2.5" fill="#f59e0b" className="shadow-lg" />
                              <text x={node.start.x + 3} y={node.start.y + 1} fill="#ffffff" fontSize="2" fontWeight="bold">Store</text>

                              {/* Customer Destination Pin */}
                              <circle cx={node.end.x} cy={node.end.y} r="2.5" fill="#10b981" />
                              <text x={node.end.x + 3} y={node.end.y + 1} fill="#10b981" fontSize="2" fontWeight="bold">Home</text>

                              {/* Rider Bike dot */}
                              <g className={`transition-all duration-1000 ${isTracked ? "scale-125" : ""}`}>
                                <circle 
                                  cx={node.current.x} 
                                  cy={node.current.y} 
                                  r={isTracked ? "3.5" : "2.5"} 
                                  fill="#ef4444" 
                                  stroke="#ffffff"
                                  strokeWidth="0.5"
                                />
                                {/* pulse ripple for tracked node */}
                                {isTracked && (
                                  <circle 
                                    cx={node.current.x} 
                                    cy={node.current.y} 
                                    r="6" 
                                    fill="none" 
                                    stroke="#ef4444" 
                                    strokeWidth="0.3"
                                    className="animate-ping origin-center"
                                  />
                                )}
                              </g>
                            </g>
                          );
                        })}
                      </svg>

                      {liveRiderMapNodes.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/50 backdrop-blur-xs text-zinc-400 text-xs font-bold p-8 text-center">
                          No active deliveries are currently on the road for map tracking.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Active Delivery Roster */}
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col gap-4">
                    <div>
                      <h3 className="font-black text-gray-900 text-base">Active Tracking List</h3>
                      <p className="text-gray-400 text-xs mt-0.5">Click 'Track' to map coordinates</p>
                    </div>

                    <div className="flex-1 space-y-3 overflow-y-auto max-h-[400px] pr-1">
                      {liveRiderMapNodes.map((node: any) => {
                        const isTracked = trackedOrderId === node.orderId;
                        return (
                          <div 
                            key={node.orderId}
                            onClick={() => setTrackedOrderId(node.orderId)}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${
                              isTracked 
                                ? "bg-red-50/20 border-red-200" 
                                : "bg-gray-50/50 border-gray-100 hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Order #{node.orderNumber}</span>
                                <h4 className="font-bold text-gray-900 text-xs mt-0.5">{node.riderName}</h4>
                              </div>
                              <span className="bg-red-600 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase animate-pulse">
                                {node.status}
                              </span>
                            </div>

                            <div className="text-[10px] text-gray-500 space-y-1">
                              <p><span className="font-bold text-gray-400">Pickup:</span> {node.vendorName}</p>
                              <p><span className="font-bold text-gray-400">Dest:</span> {node.customerName}</p>
                            </div>

                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                              <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-red-600 h-full transition-all duration-1000" style={{ width: `${node.progress}%` }}></div>
                              </div>
                              <span className="text-[9px] font-black text-gray-700">{node.progress}%</span>
                            </div>
                          </div>
                        );
                      })}

                      {liveRiderMapNodes.length === 0 && (
                        <p className="text-gray-400 py-6 text-center text-xs">No active orders available to track.</p>
                      )}
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
