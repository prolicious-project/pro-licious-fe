"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { ArrowUpRight, Activity, ShieldCheck, AlertTriangle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminDashboard() {
  const router = useRouter();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [liveData, setLiveData] = useState<any>(null);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [demandSupplyData, setDemandSupplyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.push("/login"); return; }
    Promise.all([
      api.get("/api/admin/dashboard/live"),
      api.get("/api/admin/analytics/daily"),
      api.get("/api/admin/analytics/demand-supply"),
    ])
      .then(([liveRes, dailyRes, dsRes]) => {
        setLiveData(liveRes.data?.data);
        const daily = dailyRes.data?.data || [];
        setDailyData(daily.map((d: any) => ({
          date: d.metricDate || d.date?.substring(5) || d.day,
          orders: parseInt(d.totalOrders || d.orders || 0)
        })).reverse());
        setDemandSupplyData(dsRes.data?.data || []);
      })
      .catch(err => console.error("Admin dashboard error:", err))
      .finally(() => setLoading(false));
  }, [isAuthenticated, router]);

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden text-sm">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-900">Platform Live Overview</h2>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-bold text-gray-900 text-sm">{user?.name || "Admin"}</p>
              <p className="text-xs text-red-600 font-bold font-mono">ADMIN</p>
            </div>
            <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
              {user?.name?.[0] || "A"}
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
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: "Total Revenue", value: `₹${parseFloat(liveData?.totalRevenue || 0).toFixed(2)}`, color: "red", change: "+24%" },
                  { label: "Active Orders", value: liveData?.activeOrders ?? liveData?.totalOrders ?? 0, color: "blue", change: "+12%" },
                  { label: "Total Vendors", value: liveData?.vendors ?? liveData?.totalVendors ?? 0, color: "orange" },
                  { label: "Active Riders", value: liveData?.onlineRiders ?? liveData?.activeRiders ?? 0, color: "purple" },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-red-600">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-red-50 text-red-600 rounded-lg"><ArrowUpRight className="w-5 h-5" /></div>
                      {stat.change && <span className="text-green-500 text-xs font-bold bg-green-50 px-2 py-1 rounded">{stat.change}</span>}
                    </div>
                    <p className="text-gray-500 font-medium text-sm">{stat.label}</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</h3>
                  </div>
                ))}
              </div>

              {/* Chart & Live Alerts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-gray-900 text-lg mb-6">Platform Order Volume (Last 30 Days)</h3>
                  <div className="h-64">
                    {dailyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
                          <Tooltip />
                          <Area type="monotone" dataKey="orders" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorOrders)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400">No daily data yet.</div>
                    )}
                  </div>
                </div>

                {/* Alerts */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                  <h3 className="font-bold text-gray-900 text-lg mb-4">System Alerts</h3>
                  <div className="flex-1 space-y-4">
                    {liveData?.alerts?.length > 0 ? liveData.alerts.map((alert: any, i: number) => (
                      <div key={i} className="flex gap-3 items-start border-b border-gray-100 pb-4">
                        <div className="bg-red-50 p-2 rounded text-red-600"><AlertTriangle className="w-4 h-4" /></div>
                        <div>
                          <p className="font-bold text-sm text-gray-900">{alert.title}</p>
                          <p className="text-xs text-gray-500">{alert.message}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="flex gap-3 items-start border-b border-gray-100 pb-4">
                        <div className="bg-green-50 p-2 rounded text-green-600"><ShieldCheck className="w-4 h-4" /></div>
                        <div>
                          <p className="font-bold text-sm text-gray-900">All Systems Operational</p>
                          <p className="text-xs text-gray-500">No active incidents or fraud warnings.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Demand/Supply Analytics */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-gray-900 text-lg">Zone Demand & Supply</h3>
                  <span className="text-xs text-gray-500 font-medium font-mono">{demandSupplyData.length} records</span>
                </div>
                {demandSupplyData.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">No demand/supply data available.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-gray-500 bg-gray-50 uppercase font-bold border-b border-gray-100">
                        <tr>
                          <th className="px-6 py-4">Zone ID</th>
                          <th className="px-6 py-4">Active Orders</th>
                          <th className="px-6 py-4">Available Riders</th>
                          <th className="px-6 py-4">Surge Factor</th>
                          <th className="px-6 py-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {demandSupplyData.slice(0, 10).map((metric: any) => (
                          <tr key={metric.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-6 py-4 font-bold text-gray-900">Zone #{metric.zoneId}</td>
                            <td className="px-6 py-4 font-bold text-gray-900">{metric.activeOrders}</td>
                            <td className="px-6 py-4 text-gray-600">{metric.availableRiders}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${parseFloat(metric.surgeFactor) > 1.0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                {parseFloat(metric.surgeFactor).toFixed(2)}x
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {parseFloat(metric.surgeFactor) > 1.2 ? (
                                <span className="text-orange-600 font-bold text-xs">⚡ HIGH DEMAND</span>
                              ) : (
                                <span className="text-green-600 font-medium text-xs">NORMAL</span>
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

