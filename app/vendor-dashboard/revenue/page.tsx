"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { 
  TrendingUp, 
  Wallet, 
  ShoppingBag, 
  Calendar, 
  ArrowUpRight, 
  FileText, 
  BarChart3, 
  Percent, 
  Download 
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import VendorSidebar from "@/components/VendorSidebar";

interface DailyAnalyticsItem {
  date: string;
  revenue: string;
  orderCount: number;
}

export default function VendorRevenuePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  
  const [summary, setSummary] = useState<any>(null);
  const [dailyData, setDailyData] = useState<DailyAnalyticsItem[]>([]);
  const [chartMode, setChartMode] = useState<"revenue" | "orders">("revenue");
  const [loading, setLoading] = useState(true);

  const fetchRevenueData = async () => {
    try {
      const [summaryRes, dailyRes] = await Promise.all([
        api.get("/api/vendor/analytics/summary"),
        api.get("/api/vendor/analytics/daily"),
      ]);
      setSummary(summaryRes.data?.data);
      setDailyData(dailyRes.data?.data || []);
    } catch (err) {
      console.error("Error fetching revenue analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchRevenueData();
  }, [isAuthenticated, router]);

  // Calculations
  const totalRevenue = parseFloat(summary?.totalRevenue || 0);
  const completedOrders = summary?.completedOrders || 0;
  const aov = completedOrders > 0 ? totalRevenue / completedOrders : 0;
  
  // Format daily data for chart
  const chartData = dailyData.map((d) => ({
    date: d.date ? new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "",
    rawDate: d.date,
    revenue: parseFloat(d.revenue || "0"),
    orders: d.orderCount || 0,
  }));

  const exportBreakdownCSV = () => {
    if (dailyData.length === 0) return;
    const headers = ["Date", "Orders Completed", "Daily Revenue (INR)", "Average Order Value (INR)"];
    const rows = dailyData.map(d => {
      const rev = parseFloat(d.revenue || "0");
      const avg = d.orderCount > 0 ? rev / d.orderCount : 0;
      return [
        d.date,
        d.orderCount,
        rev.toFixed(2),
        avg.toFixed(2)
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `revenue_breakdown_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-sm">
      <VendorSidebar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Revenue Analytics</h2>
            <p className="text-xs text-gray-500 mt-0.5">Track your branch sales, order values, and earning trends</p>
          </div>
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

        <div className="flex-1 overflow-y-auto p-8 max-w-7xl w-full mx-auto space-y-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
            </div>
          ) : (
            <>
              {/* Top Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Revenue */}
                <div className="bg-gradient-to-br from-white to-red-50/10 p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 text-red-500/5 transition-transform duration-500 group-hover:scale-110">
                    <Wallet className="w-32 h-32" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Revenue</p>
                    <h3 className="text-3xl font-extrabold text-gray-950">₹{totalRevenue.toFixed(2)}</h3>
                    <div className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                      <TrendingUp className="w-4 h-4" />
                      <span>All-time earnings</span>
                    </div>
                  </div>
                  <div className="p-4 bg-red-50 text-red-600 rounded-2xl shadow-inner">
                    <Wallet className="w-6 h-6" />
                  </div>
                </div>

                {/* Average Order Value (AOV) */}
                <div className="bg-gradient-to-br from-white to-orange-50/10 p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 text-orange-500/5 transition-transform duration-500 group-hover:scale-110">
                    <Percent className="w-32 h-32" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Avg. Order Value (AOV)</p>
                    <h3 className="text-3xl font-extrabold text-gray-950">₹{aov.toFixed(2)}</h3>
                    <div className="text-xs text-gray-500">
                      Based on <span className="font-semibold text-gray-900">{completedOrders}</span> delivered orders
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl shadow-inner">
                    <Percent className="w-6 h-6" />
                  </div>
                </div>

                {/* Completed Orders */}
                <div className="bg-gradient-to-br from-white to-blue-50/10 p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 text-blue-500/5 transition-transform duration-500 group-hover:scale-110">
                    <ShoppingBag className="w-32 h-32" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Completed Orders</p>
                    <h3 className="text-3xl font-extrabold text-gray-950">{completedOrders}</h3>
                    <div className="text-xs text-gray-500">
                      Total vendor dashboard orders
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl shadow-inner">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Chart Section */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Sales & Volumes Trend</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Visualize your business growth over time</p>
                  </div>
                  
                  {/* Chart Toggle & Export */}
                  <div className="flex items-center gap-3">
                    <div className="inline-flex bg-gray-100 p-1 rounded-xl">
                      <button 
                        onClick={() => setChartMode("revenue")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          chartMode === "revenue" 
                            ? "bg-white text-red-600 shadow-sm" 
                            : "text-gray-500 hover:text-gray-950"
                        }`}
                      >
                        Revenue
                      </button>
                      <button 
                        onClick={() => setChartMode("orders")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          chartMode === "orders" 
                            ? "bg-white text-red-600 shadow-sm" 
                            : "text-gray-500 hover:text-gray-950"
                        }`}
                      >
                        Order Count
                      </button>
                    </div>
                    
                    <button 
                      onClick={exportBreakdownCSV}
                      disabled={dailyData.length === 0}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 hover:text-gray-950 hover:bg-gray-50 rounded-xl font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export CSV
                    </button>
                  </div>
                </div>

                <div className="h-80">
                  {chartData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      No daily trend data available.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      {chartMode === "revenue" ? (
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#dc2626" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="#dc2626" stopOpacity={0.01} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(val) => `₹${val}`} />
                          <Tooltip 
                            formatter={(value: any) => [`₹${parseFloat(value).toFixed(2)}`, "Daily Revenue"]}
                            contentStyle={{ borderRadius: "12px", border: "1px solid #f3f4f6", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}
                          />
                          <Area type="monotone" dataKey="revenue" stroke="#dc2626" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                        </AreaChart>
                      ) : (
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#9ca3af", fontSize: 11 }} />
                          <Tooltip 
                            formatter={(value: any) => [value, "Completed Orders"]}
                            contentStyle={{ borderRadius: "12px", border: "1px solid #f3f4f6", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}
                          />
                          <Bar dataKey="orders" fill="#f97316" radius={[4, 4, 0, 0]} barSize={28} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Table Section */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base flex items-center gap-1.5">
                      <Calendar className="w-5 h-5 text-red-600" /> Daily Breakdown
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">Summary of orders, revenue, and averages by date</p>
                  </div>
                  <span className="text-xs text-gray-500 font-bold font-mono">{dailyData.length} entries</span>
                </div>
                
                {dailyData.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">No daily data available.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="text-[10px] text-gray-500 bg-gray-50 uppercase font-bold border-b border-gray-100">
                        <tr>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4">Orders Completed</th>
                          <th className="px-6 py-4">Daily Revenue</th>
                          <th className="px-6 py-4">Average Order Value (AOV)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyData.map((d, index) => {
                          const rev = parseFloat(d.revenue || "0");
                          const avg = d.orderCount > 0 ? rev / d.orderCount : 0;
                          return (
                            <tr key={index} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="px-6 py-4 text-gray-900 font-semibold">
                                {d.date ? new Date(d.date).toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "long", day: "numeric" }) : "N/A"}
                              </td>
                              <td className="px-6 py-4 font-semibold text-gray-600">{d.orderCount}</td>
                              <td className="px-6 py-4 font-bold text-gray-950">₹{rev.toFixed(2)}</td>
                              <td className="px-6 py-4 font-bold text-red-600">₹{avg.toFixed(2)}</td>
                            </tr>
                          );
                        })}
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
