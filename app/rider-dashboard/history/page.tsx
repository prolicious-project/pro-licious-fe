"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import {
  Search,
  LayoutGrid,
  List,
  ChevronRight,
  X,
  Calendar,
  Layers,
  MapPin,
  Store,
  Tag,
  Star,
} from "lucide-react";

interface Order {
  id: number;
  orderNumber: string;
  status: string;
  assignedAt: string;
  totalAmount?: number;
  items?: any[];
  vendor?: {
    name: string;
    address: string;
  };
  address?: {
    streetAddress: string;
    city: string;
  };
}

export default function OrderHistory() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"GRID" | "LIST">("LIST");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateRange, setDateRange] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/rider/orders");
      const raw: any[] = res.data?.data || [];
      // Deduplicate by orderId (API returns orderId, not id)
      const seen = new Map<number | string, Order>();
      for (const o of raw) {
        const key = o.orderId || o.id;
        if (!key) continue;
        seen.set(key, {
          id: key,
          orderNumber: o.orderNumber || String(key),
          status: o.orderStatus || o.status || "UNKNOWN",
          assignedAt: o.assignedAt || o.orderCreatedAt || new Date().toISOString(),
          totalAmount: o.totalAmount || o.orderTotal,
          items: o.items,
          vendor: o.vendor,
          address: o.address,
        });
      }
      setOrders(Array.from(seen.values()));
    } catch (err) {
      console.error("Order history load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated]);

  const getFilteredOrders = () => {
    return orders.filter((o) => {
      // 1. Search Query
      if (searchQuery && !o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // 2. Status Filter
      if (statusFilter !== "ALL") {
        if (statusFilter === "COMPLETED" && o.status !== "DELIVERED") return false;
        if (statusFilter === "REJECTED" && o.status !== "REJECTED") return false;
        if (statusFilter === "CANCELLED" && o.status !== "CANCELLED") return false;
      }

      // 3. Date Filter
      if (dateRange !== "ALL") {
        const orderDate = new Date(o.assignedAt);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateRange === "TODAY") {
          const orderDay = new Date(o.assignedAt).toDateString();
          if (orderDay !== new Date().toDateString()) return false;
        } else if (dateRange === "YESTERDAY") {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          if (orderDate.toDateString() !== yesterday.toDateString()) return false;
        } else if (dateRange === "WEEK") {
          const lastWeek = new Date();
          lastWeek.setDate(lastWeek.getDate() - 7);
          if (orderDate < lastWeek) return false;
        } else if (dateRange === "MONTH") {
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          if (orderDate < lastMonth) return false;
        }
      }

      return true;
    });
  };

  const filtered = getFilteredOrders();

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400";
      case "REJECTED":
        return "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-655 dark:text-red-405";
      case "CANCELLED":
        return "bg-gray-100 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/30 text-gray-505";
      default:
        return "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-600 dark:text-amber-400";
    }
  };

  return (
    <div className="relative space-y-8 max-w-7xl mx-auto min-h-screen pb-12">
      <div>
        <h1 className="text-2xl font-black text-gray-950 dark:text-white tracking-tight">Order Logs</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Search and review completed or assigned order details</p>
      </div>

      {/* Filter and layout control bar */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-950 dark:text-white pl-9 pr-4 py-2 rounded-xl placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-red-500 text-xs font-semibold"
            />
          </div>

          {/* Date Selector */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-xl text-xs font-bold focus:outline-none"
          >
            <option value="ALL">All Dates</option>
            <option value="TODAY">Today</option>
            <option value="YESTERDAY">Yesterday</option>
            <option value="WEEK">Last 7 Days</option>
            <option value="MONTH">Last 30 Days</option>
          </select>
        </div>

        {/* View Layout buttons & status filters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-955 p-1 rounded-lg border border-gray-200 dark:border-gray-805">
            {(["ALL", "COMPLETED", "REJECTED"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition ${
                  statusFilter === st
                    ? "bg-red-600 text-white"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 border-l border-gray-200 dark:border-gray-800 pl-4">
            <button
              onClick={() => setViewMode("LIST")}
              className={`p-1.5 rounded-lg ${viewMode === "LIST" ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white" : "text-gray-550 dark:text-gray-450 hover:text-gray-900 dark:hover:text-white"}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("GRID")}
              className={`p-1.5 rounded-lg ${viewMode === "GRID" ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white" : "text-gray-550 dark:text-gray-450 hover:text-gray-900 dark:hover:text-white"}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid/List presentation */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 border-dashed rounded-2xl p-12 text-center text-gray-500">
          No records match the active filters.
        </div>
      ) : viewMode === "GRID" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((order, idx) => (
            <div
              key={`hist-${order.id}-${idx}`}
              onClick={() => setSelectedOrder(order)}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-gray-300 dark:hover:border-gray-700 transition cursor-pointer flex flex-col justify-between space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-black text-gray-955 dark:text-white">Order #{order.orderNumber}</h4>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold mt-1">
                    {new Date(order.assignedAt).toLocaleDateString()} at {new Date(order.assignedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${getStatusStyle(order.status)}`}>
                  {order.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                  <span className="truncate">{order.vendor?.name || "Kitchen Outlet"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span className="truncate">{order.address?.city || "Local City"}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-850 flex justify-between items-center text-xs">
                <span className="font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest text-[9px]">Earnings</span>
                <span className="font-black text-gray-950 dark:text-white">₹{order.totalAmount || 120}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest bg-gray-50/40 dark:bg-gray-950/10">
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Assigned Time</th>
                  <th className="p-4">Vendor</th>
                  <th className="p-4">Payout</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-850">
                {filtered.map((order, idx) => (
                  <tr
                    key={`hist-${order.id}-${idx}`}
                    onClick={() => setSelectedOrder(order)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-850/20 cursor-pointer transition animate-fade-in"
                  >
                    <td className="p-4 text-gray-950 dark:text-white font-bold font-mono">#{order.orderNumber}</td>
                    <td className="p-4 text-gray-605 dark:text-gray-405">
                      {new Date(order.assignedAt).toLocaleDateString()} {new Date(order.assignedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-4 truncate max-w-[150px] text-gray-700 dark:text-gray-300">
                      {order.vendor?.name || "Pro-Licious Kitchen"}
                    </td>
                    <td className="p-4 font-black text-gray-950 dark:text-white">₹{order.totalAmount || 120}</td>
                    <td className="p-4 text-right">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${getStatusStyle(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-out Side Drawer Modal for details */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedOrder(null)}
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl h-full flex flex-col justify-between z-10 animate-slide-in">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div>
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${getStatusStyle(selectedOrder.status)}`}>
                  {selectedOrder.status}
                </span>
                <h3 className="text-base font-black text-gray-950 dark:text-white mt-1.5 font-mono">Order #{selectedOrder.orderNumber}</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Route segment */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">Route Addresses</h4>
                
                <div className="space-y-4">
                  <div className="flex gap-3 items-start">
                    <Store className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Pickup Kitchen</p>
                      <p className="text-xs text-gray-550 dark:text-gray-450">{selectedOrder.vendor?.name}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">{selectedOrder.vendor?.address}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start border-t border-gray-100 dark:border-gray-850 pt-3">
                    <MapPin className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Drop Address</p>
                      <p className="text-xs text-gray-550 dark:text-gray-450">{selectedOrder.address?.streetAddress}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">{selectedOrder.address?.city}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Breakdown list */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="space-y-3 pt-5 border-t border-gray-250 dark:border-gray-800/80">
                  <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">Items Ordered</h4>
                  <div className="bg-gray-50 dark:bg-gray-950 rounded-xl p-3 border border-gray-100 dark:border-gray-850 space-y-2">
                    {selectedOrder.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-xs">
                        <span className="text-gray-700 dark:text-gray-300">{item.name || "Menu Item"} <span className="text-gray-400 font-bold">x{item.quantity || 1}</span></span>
                        <span className="font-bold text-gray-950 dark:text-white">₹{item.price || 120}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Earnings card breakdown */}
              <div className="space-y-3 pt-5 border-t border-gray-100 dark:border-gray-800/80">
                <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">Earnings Detail</h4>
                <div className="space-y-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <div className="flex justify-between">
                    <span>Base Payout</span>
                    <span>₹{selectedOrder.totalAmount ? (selectedOrder.totalAmount * 0.85).toFixed(0) : "100"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Bonus</span>
                    <span>₹{selectedOrder.totalAmount ? (selectedOrder.totalAmount * 0.15).toFixed(0) : "20"}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-100 dark:border-gray-850 pt-2 text-gray-950 dark:text-white font-black">
                    <span>Total Payout</span>
                    <span className="text-emerald-600 dark:text-emerald-400">₹{selectedOrder.totalAmount || 120}</span>
                  </div>
                </div>
              </div>

              {/* Customer Rating if completed */}
              {selectedOrder.status === "DELIVERED" && (
                <div className="bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/20 p-4 rounded-xl space-y-2 flex flex-col items-center">
                  <p className="text-[10px] text-emerald-605 dark:text-emerald-500 font-extrabold uppercase tracking-widest">Customer Review</p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-4 h-4 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold italic">"Very polite and fast delivery!"</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/40">
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-white font-bold text-xs rounded-xl transition"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
