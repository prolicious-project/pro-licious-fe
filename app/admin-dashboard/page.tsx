"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { LayoutDashboard, Store, Truck, Users, Activity, Settings, AlertTriangle, ShieldCheck, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AdminDashboard() {
  const router = useRouter();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [liveData, setLiveData] = useState<any>(null);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.push("/login"); return; }
    Promise.all([
      api.get("/api/admin/dashboard/live"),
      api.get("/api/admin/analytics/daily"),
    ])
      .then(([liveRes, dailyRes]) => {
        setLiveData(liveRes.data?.data);
        const daily = dailyRes.data?.data || [];
        setDailyData(daily.map((d: any) => ({ date: d.date?.substring(5) || d.day, orders: parseInt(d.totalOrders || d.orders || 0) })));
      })
      .catch(err => console.error("Admin dashboard error:", err))
      .finally(() => setLoading(false));
  }, [isAuthenticated, router]);

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden text-sm">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-900 text-zinc-300 border-r border-zinc-800 flex-col hidden md:flex">
        <div className="p-6 border-b border-zinc-800">
          <Link href="/admin-dashboard" className="flex items-center gap-2">
            <div className="bg-red-600 text-white p-1.5 rounded font-bold text-lg leading-none">P</div>
            <span className="font-bold text-xl tracking-tight text-white">ADMIN<span className="text-red-600">.</span></span>
          </Link>
        </div>
        <div className="flex-1 py-6 px-4 space-y-1">
          <div className="text-xs font-bold text-zinc-500 uppercase px-3 mb-2 mt-2">Platform</div>
          <Link href="/admin-dashboard" className="flex items-center gap-3 px-3 py-2 bg-red-600 text-white rounded-lg font-medium"><LayoutDashboard className="w-5 h-5" /> Live Overview</Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 hover:text-white rounded-lg font-medium"><Store className="w-5 h-5" /> Vendors</Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 hover:text-white rounded-lg font-medium"><Truck className="w-5 h-5" /> Riders</Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 hover:text-white rounded-lg font-medium"><Users className="w-5 h-5" /> Customers</Link>
          <div className="text-xs font-bold text-zinc-500 uppercase px-3 mb-2 mt-4">System</div>
          <Link href="#" className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 hover:text-white rounded-lg font-medium"><Activity className="w-5 h-5" /> Analytics</Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 hover:text-white rounded-lg font-medium"><AlertTriangle className="w-5 h-5" /> Tickets</Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 hover:text-white rounded-lg font-medium"><ShieldCheck className="w-5 h-5" /> Audit Logs</Link>
          <Link href="#" className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-800 hover:text-white rounded-lg font-medium"><Settings className="w-5 h-5" /> Settings</Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-900">Platform Live Overview</h2>
          <div className="flex items-center gap-4">
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
                  { label: "Online Vendors", value: liveData?.activeVendors ?? liveData?.totalVendors ?? 0, color: "orange" },
                  { label: "Active Riders", value: liveData?.activeRiders ?? liveData?.totalRiders ?? 0, color: "purple" },
                ].map((stat, i) => (
                  <div key={i} className={`bg-white p-6 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-${stat.color}-600`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-2 bg-${stat.color}-50 text-${stat.color}-600 rounded-lg`}><ArrowUpRight className="w-5 h-5" /></div>
                      {stat.change && <span className="text-green-500 text-xs font-bold bg-green-50 px-2 py-1 rounded">{stat.change}</span>}
                    </div>
                    <p className="text-gray-500 font-medium text-sm">{stat.label}</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</h3>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                  <h3 className="font-bold text-gray-900 text-lg mb-6">Platform Order Volume</h3>
                  <div className="h-64">
                    {dailyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 12 }} />
                          <Tooltip />
                          <Area type="monotone" dataKey="orders" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorOrders)" />
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
                          <p className="text-xs text-gray-500">No alerts at this time.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
