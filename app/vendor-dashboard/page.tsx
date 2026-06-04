"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { LayoutDashboard, ShoppingBag, Menu, Truck, Settings, AlertCircle, ArrowUpRight, FileDown, Plus } from "lucide-react";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const STATUS_COLORS: Record<string, string> = {
  PLACED: "bg-blue-50 text-blue-600",
  ACCEPTED: "bg-yellow-50 text-yellow-700",
  PREPARING: "bg-orange-50 text-orange-600",
  READY: "bg-purple-50 text-purple-600",
  COMPLETED: "bg-green-50 text-green-600",
  CANCELLED: "bg-red-50 text-red-600",
  REJECTED: "bg-red-50 text-red-600",
};

export default function VendorDashboard() {
  const router = useRouter();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [summary, setSummary] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.push("/login"); return; }
    Promise.all([
      api.get("/api/vendor/analytics/summary"),
      api.get("/api/vendor/orders"),
      api.get("/api/vendor/analytics/daily"),
    ])
      .then(([summaryRes, ordersRes, dailyRes]) => {
        setSummary(summaryRes.data?.data);
        setOrders(ordersRes.data?.data || []);
        const daily = dailyRes.data?.data || [];
        setChartData(daily.map((d: any) => ({ date: d.date?.substring(5) || d.day, revenue: parseFloat(d.revenue || d.total_revenue || 0) })));
      })
      .catch(err => console.error("Vendor dashboard error:", err))
      .finally(() => setLoading(false));
  }, [isAuthenticated, router]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-sm">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex-col hidden md:flex">
        <div className="p-6 border-b border-gray-100">
          <Link href="/vendor-dashboard" className="flex items-center gap-2">
            <div className="bg-red-600 text-white p-1.5 rounded font-bold text-lg leading-none">P</div>
            <span className="font-bold text-xl tracking-tight text-gray-900">PRO<span className="text-red-600">-</span>LICIOUS</span>
          </Link>
        </div>
        <div className="flex-1 py-6 px-4 space-y-1">
          <Link href="/vendor-dashboard" className="flex items-center gap-3 px-3 py-2 bg-red-600 text-white rounded-lg font-medium"><LayoutDashboard className="w-5 h-5" /> Dashboard</Link>
          <Link href="/vendor-dashboard/orders" className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg font-medium"><ShoppingBag className="w-5 h-5" /> Orders</Link>
          <Link href="/vendor-dashboard/menu" className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg font-medium"><Menu className="w-5 h-5" /> Menu</Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg font-medium"><Truck className="w-5 h-5" /> Rider Tracking</Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg font-medium"><Settings className="w-5 h-5" /> Settings</Link>
        </div>
        <div className="p-4 border-t border-gray-100">
          <div className="bg-red-50 rounded-xl p-4 text-center border border-red-100">
            <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
            <h4 className="font-bold text-gray-900 text-sm mb-1">Need Support?</h4>
            <button className="w-full bg-white text-gray-900 text-xs font-bold py-2 rounded shadow-sm border border-gray-200 mt-2 hover:bg-gray-50">Contact Admin</button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-900">Dashboard Overview</h2>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-bold text-gray-900 text-sm">{user?.name || "Vendor"}</p>
              <p className="text-xs text-yellow-500 font-bold">VENDOR</p>
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
                  <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 shadow-sm">
                    <Plus className="w-4 h-4" /> Add Product
                  </button>
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
                    <div className={`w-10 h-10 bg-${stat.color}-100 text-${stat.color}-600 rounded-lg flex items-center justify-center mb-4`}>
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
                      <thead className="text-xs text-gray-500 bg-gray-50 uppercase font-bold">
                        <tr>
                          <th className="px-6 py-4">Order #</th>
                          <th className="px-6 py-4">Customer</th>
                          <th className="px-6 py-4">Amount</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Payment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.slice(0, 10).map((order: any) => (
                          <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-6 py-4 font-bold text-red-600">{order.orderNumber}</td>
                            <td className="px-6 py-4 font-bold text-gray-900">{order.customerName || "Customer"}</td>
                            <td className="px-6 py-4 font-bold text-gray-900">₹{parseFloat(order.totalAmount).toFixed(2)}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>{order.status}</span>
                            </td>
                            <td className="px-6 py-4 text-gray-500">{order.paymentMethod || "N/A"}</td>
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
