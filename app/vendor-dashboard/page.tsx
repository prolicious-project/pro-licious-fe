"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { ArrowUpRight, FileDown, Plus } from "lucide-react";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import VendorSidebar from "@/components/VendorSidebar";
import OrderStatusBadge from "@/components/OrderStatusBadge";

export default function VendorDashboard() {
  const router = useRouter();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [summary, setSummary] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [summaryRes, ordersRes, dailyRes] = await Promise.all([
        api.get("/api/vendor/analytics/summary"),
        api.get("/api/vendor/orders"),
        api.get("/api/vendor/analytics/daily"),
      ]);
      setSummary(summaryRes.data?.data);
      setOrders(ordersRes.data?.data || []);
      const daily = dailyRes.data?.data || [];
      setChartData(daily.map((d: any) => ({
        date: d.date?.substring(5) || d.day,
        revenue: parseFloat(d.revenue || d.total_revenue || 0)
      })));
    } catch (err) {
      console.error("Vendor dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) { router.push("/login"); return; }
    fetchDashboardData();
  }, [isAuthenticated, router]);

  const handleOrderAction = async (orderId: number, action: string) => {
    try {
      await api.patch(`/api/vendor/orders/${orderId}/${action}`);
      await fetchDashboardData();
    } catch (e) {
      console.error(`Error performing action ${action} on order ${orderId}:`, e);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-sm">
      {/* Sidebar */}
      <VendorSidebar />

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-900">Dashboard Overview</h2>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-bold text-gray-900 text-sm">{user?.name || "Vendor"}</p>
              <p className="text-xs text-yellow-500 font-bold font-mono">VENDOR</p>
            </div>
            <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold shadow-sm">
              {user?.name?.[0] || "V"}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 max-w-7xl w-full mx-auto space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
            </div>
          ) : (
            <>
              {/* Welcome */}
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Welcome back, {user?.name?.split(" ")[0]}!</h1>
                  <p className="text-gray-500">Here's what's happening with your store today.</p>
                </div>
                <div className="flex gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 shadow-sm">
                    <FileDown className="w-4 h-4" /> Export
                  </button>
                  <Link href="/vendor-dashboard/menu" className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 shadow-sm">
                    <Plus className="w-4 h-4" /> Add Product
                  </Link>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: "Total Revenue", value: `₹${parseFloat(summary?.totalRevenue || 0).toFixed(2)}`, color: "blue" },
                  { label: "Total Orders", value: summary?.totalOrders ?? 0, color: "red" },
                  { label: "Pending Orders", value: summary?.pendingOrders ?? orders.filter(o => o.status === 'PLACED').length, color: "yellow" },
                  { label: "Completed Orders", value: summary?.completedOrders ?? orders.filter(o => o.status === 'COMPLETED').length, color: "green" },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="w-10 h-10 bg-gray-100 text-red-600 rounded-lg flex items-center justify-center mb-4">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                    <p className="text-gray-500 font-medium text-sm">{stat.label}</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</h3>
                  </div>
                ))}
              </div>

              {/* Chart */}
              {chartData.length > 0 && (
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-gray-900 text-lg mb-6">Daily Revenue Trend</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="revenue" stroke="#dc2626" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Orders Table */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-bold text-gray-900 text-lg">Recent Orders</h3>
                  <span className="text-xs text-gray-500 font-medium">{orders.length} total</span>
                </div>
                {orders.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">No orders yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 bg-gray-50 uppercase font-bold border-b border-gray-100">
                        <tr>
                          <th className="px-6 py-4">Order #</th>
                          <th className="px-6 py-4">Customer</th>
                          <th className="px-6 py-4">Amount</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Payment</th>
                          <th className="px-6 py-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 10).map((order: any) => (
                          <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-6 py-4 font-bold text-red-600">{order.orderNumber}</td>
                            <td className="px-6 py-4 font-bold text-gray-900">{order.customerName || "Customer"}</td>
                            <td className="px-6 py-4 font-bold text-gray-900">₹{parseFloat(order.totalAmount).toFixed(2)}</td>
                            <td className="px-6 py-4">
                              <OrderStatusBadge status={order.status} />
                            </td>
                            <td className="px-6 py-4 text-gray-500">{order.paymentMethod || "N/A"}</td>
                            <td className="px-6 py-4 flex gap-2">
                              {order.status === "PLACED" && (
                                <>
                                  <button onClick={() => handleOrderAction(order.id, "accept")} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-xs shadow-sm">
                                    Accept
                                  </button>
                                  <button onClick={() => handleOrderAction(order.id, "reject")} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs shadow-sm">
                                    Reject
                                  </button>
                                </>
                              )}
                              {order.status === "ACCEPTED" && (
                                <button onClick={() => handleOrderAction(order.id, "preparing")} className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded font-bold text-xs shadow-sm">
                                  Start Cooking
                                </button>
                              )}
                              {order.status === "PREPARING" && (
                                <button onClick={() => handleOrderAction(order.id, "ready")} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded font-bold text-xs shadow-sm">
                                  Mark Ready
                                </button>
                              )}
                              {!["PLACED", "ACCEPTED", "PREPARING"].includes(order.status) && (
                                <span className="text-gray-400 font-medium text-xs">No Action</span>
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
        </div>
      </main>
    </div>
  );
}

