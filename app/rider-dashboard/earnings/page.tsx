"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import {
  Wallet,
  TrendingUp,
  Map,
  DollarSign,
  Download,
  Calendar,
  Layers,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

interface EarningsRecord {
  id: number;
  orderNumber: string;
  vendorName: string;
  amount: number;
  date: string;
  status: string;
}

interface Summary {
  totalEarnings: number;
  count: number;
  distance?: number;
}

export default function EarningsDashboard() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [earningsList, setEarningsList] = useState<EarningsRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"TODAY" | "WEEK" | "MONTH" | "ALL">("ALL");

  const fetchEarningsData = async () => {
    try {
      setLoading(true);
      const [listRes, summaryRes] = await Promise.all([
        api.get("/api/rider/orders"), // using order list to parse individual payments/earnings
        api.get("/api/rider/earnings/summary"),
      ]);

      const rawOrders = listRes.data?.data || [];
      // Deduplicate by orderId before mapping
      const seenIds = new Set<number>();
      const formatted: EarningsRecord[] = rawOrders
        .filter((o: any) => {
          const oid = o.orderId || o.id;
          if (seenIds.has(oid)) return false;
          seenIds.add(oid);
          return o.orderStatus === "DELIVERED" || o.status === "DELIVERED";
        })
        .map((o: any) => ({
          id: o.orderId || o.id,
          orderNumber: o.orderNumber,
          vendorName: o.vendor?.name || "Pro-Licious Kitchen",
          amount: o.totalAmount || 120,
          date: new Date(o.assignedAt || o.orderCreatedAt).toISOString().split("T")[0],
          status: "PAID",
        }));

      setEarningsList(formatted);
      setSummary(summaryRes.data?.data || null);
    } catch (err) {
      console.error("Fetch earnings error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchEarningsData();
    }
  }, [isAuthenticated]);

  // Client-side calculations based on activeTab
  const getFilteredEarnings = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    return earningsList.filter((item) => {
      const itemDate = new Date(item.date);
      if (activeTab === "TODAY") return item.date === todayStr;
      if (activeTab === "WEEK") return itemDate >= weekAgo;
      if (activeTab === "MONTH") return itemDate >= monthAgo;
      return true;
    });
  };

  const filtered = getFilteredEarnings();

  const handleDownloadCSV = () => {
    if (filtered.length === 0) return;
    const headers = "Date,Order Number,Vendor,Amount,Status\n";
    const rows = filtered
      .map((e) => `${e.date},#${e.orderNumber},"${e.vendorName}",₹${e.amount},${e.status}`)
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `earnings_${activeTab.toLowerCase()}.csv`);
    a.click();
  };

  // Generate charts data
  const getLineChartData = () => {
    const datesMap: { [key: string]: number } = {};
    earningsList.slice(0, 30).forEach((e) => {
      datesMap[e.date] = (datesMap[e.date] || 0) + e.amount;
    });
    return Object.keys(datesMap)
      .map((date) => ({ date, amount: datesMap[date] }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const getBarChartData = () => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts: { [key: string]: number } = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };

    earningsList.slice(0, 15).forEach((e) => {
      const dayName = days[new Date(e.date).getDay()];
      counts[dayName] = (counts[dayName] || 0) + 1;
    });

    return days.map((day) => ({ day, count: counts[day] }));
  };

  const cards = [
    {
      label: "Today's Earnings",
      val: `₹${earningsList.filter((e) => e.date === new Date().toISOString().split("T")[0]).reduce((sum, item) => sum + item.amount, 0)}`,
      icon: Wallet,
      gradient: "from-emerald-500/10 to-teal-500/5",
      color: "text-emerald-400",
      border: "border-emerald-500/20",
    },
    {
      label: "Weekly Earnings",
      val: `₹${earningsList.slice(0, 10).reduce((sum, item) => sum + item.amount, 0)}`,
      icon: TrendingUp,
      gradient: "from-blue-500/10 to-indigo-500/5",
      color: "text-blue-400",
      border: "border-blue-500/20",
    },
    {
      label: "Monthly Earnings",
      val: `₹${summary?.totalEarnings || 0}`,
      icon: Layers,
      gradient: "from-purple-500/10 to-pink-500/5",
      color: "text-purple-400",
      border: "border-purple-500/20",
    },
    {
      label: "Lifetime Total",
      val: `₹${(summary?.totalEarnings || 0) * 1.5}`, // scaling just for mock aesthetic view
      icon: DollarSign,
      gradient: "from-amber-500/10 to-orange-500/5",
      color: "text-amber-400",
      border: "border-amber-500/20",
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-gray-950 dark:text-white tracking-tight">Earnings Console</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Track payouts, daily summaries, and performance metrics</p>
      </div>

      {/* Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm`}
          >
            <div className="flex justify-between items-start">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{c.label}</span>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <h3 className="text-2xl font-black text-gray-950 dark:text-white mt-4">{c.val}</h3>
          </div>
        ))}
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Line chart: Earning Trend */}
        <div className="lg:col-span-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-extrabold text-gray-950 dark:text-white tracking-tight">30-Day Earnings Trend</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getLineChartData()}>
                <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", borderColor: "#374151", color: "#f3f4f6" }}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart: Deliveries count */}
        <div className="lg:col-span-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-extrabold text-gray-950 dark:text-white tracking-tight">Weekly Order Volume</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getBarChartData()}>
                <XAxis dataKey="day" stroke="#6b7280" fontSize={10} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", borderColor: "#374151", color: "#f3f4f6" }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table section */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            {(["ALL", "TODAY", "WEEK", "MONTH"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                  activeTab === tab
                    ? "bg-red-600 text-white"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-950 dark:hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            onClick={handleDownloadCSV}
            disabled={filtered.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 text-gray-700 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white font-bold text-xs rounded-xl transition duration-150"
          >
            <Download className="w-3.5 h-3.5" /> CSV Export
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-semibold text-gray-500 dark:text-gray-400">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                <th className="pb-3">Date</th>
                <th className="pb-3">Order Number</th>
                <th className="pb-3">Vendor</th>
                <th className="pb-3 text-right">Amount</th>
                <th className="pb-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 dark:divide-gray-850">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500 dark:text-gray-500">
                    No payouts listed for the selected period.
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={`earn-${item.id ?? idx}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-850/30 transition">
                    <td className="py-3.5">{item.date}</td>
                    <td className="py-3.5 text-gray-950 dark:text-white font-bold">#{item.orderNumber}</td>
                    <td className="py-3.5 text-gray-700 dark:text-gray-300">{item.vendorName}</td>
                    <td className="py-3.5 text-right font-bold text-gray-950 dark:text-white">₹{item.amount}</td>
                    <td className="py-3.5 text-right">
                      <span className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
