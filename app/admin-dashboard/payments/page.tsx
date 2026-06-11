"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { getSocket } from "@/lib/socket";
import { 
  Search, IndianRupee, Clock, ArrowUpRight, 
  CheckCircle, AlertCircle, ShieldAlert, Sparkles, Filter
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminPaymentsPage() {
  const router = useRouter();
  const { isAuthenticated, token } = useSelector((state: RootState) => state.auth);
  
  // Datasets
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SUCCESS" | "PENDING" | "FAILED">("ALL");

  // Track recently updated/added payments for micro-flash animations
  const [highlightedIds, setHighlightedIds] = useState<Record<number, "success" | "pending" | "failed">>({});
  
  // Socket status
  const [isConnected, setIsConnected] = useState(false);

  // Initial redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // Fetch initial payment data
  const fetchPayments = async () => {
    try {
      const res = await api.get("/api/admin/dashboard/realtime");
      setPayments(res.data?.data?.payments || []);
    } catch (err) {
      console.error("Error fetching admin payments snapshot:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    fetchPayments();

    // Setup socket subscription
    const socket = getSocket(token || undefined);
    socket.connect();

    setIsConnected(socket.connected);

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    // Real-time payment notifications
    socket.on("payment_status", (updatedPayment: any) => {
      if (!updatedPayment || !updatedPayment.id) return;

      setPayments((prevList) => {
        const index = prevList.findIndex((p) => p.id === updatedPayment.id);
        let newList = [...prevList];

        if (index > -1) {
          // Update existing payment status
          newList[index] = {
            ...newList[index],
            status: updatedPayment.status,
            paymentReference: updatedPayment.paymentReference,
            paymentMode: updatedPayment.paymentMode || newList[index].paymentMode
          };
        } else {
          // Prepend new payment
          newList = [updatedPayment, ...newList];
        }

        // Trigger highlight flash animation based on status
        const stateKey = updatedPayment.status.toLowerCase() as "success" | "pending" | "failed";
        setHighlightedIds((prev) => ({
          ...prev,
          [updatedPayment.id]: stateKey
        }));

        // Remove highlight after 2.5 seconds
        setTimeout(() => {
          setHighlightedIds((prev) => {
            const next = { ...prev };
            delete next[updatedPayment.id];
            return next;
          });
        }, 2500);

        return newList;
      });
    });

    // Periodic sync backup (every 10 seconds)
    const interval = setInterval(fetchPayments, 10000);

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("payment_status");
      socket.disconnect();
      clearInterval(interval);
    };
  }, [isAuthenticated, token]);

  // --- STATS OVERVIEW ---
  
  const stats = useMemo(() => {
    const totalCount = payments.length;
    const successfulCount = payments.filter((p: any) => p.status === "SUCCESS").length;
    const pendingCount = payments.filter((p: any) => p.status === "PENDING").length;
    const totalVolume = payments
      .filter((p: any) => p.status === "SUCCESS")
      .reduce((acc: number, p: any) => acc + parseFloat(p.amount || 0), 0);

    return {
      totalCount,
      successfulCount,
      pendingCount,
      totalVolume: totalVolume.toLocaleString("en-IN", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
      })
    };
  }, [payments]);

  // --- FILTERING AND SEARCH ---

  const filteredPayments = useMemo(() => {
    return payments
      .filter((pay: any) => {
        // Status filter
        if (statusFilter !== "ALL" && pay.status !== statusFilter) return false;
        
        // Search query filter
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          String(pay.id).includes(q) ||
          (pay.paymentReference && pay.paymentReference.toLowerCase().includes(q)) ||
          (pay.paymentMode && pay.paymentMode.toLowerCase().includes(q)) ||
          String(pay.amount).includes(q)
        );
      });
  }, [payments, searchQuery, statusFilter]);

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden text-sm">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Viewport */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        
        {/* Real-time Header */}
        <header className="bg-white border-b border-gray-100 px-8 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-red-600" />
                Payments Hub
              </h2>
              <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border shadow-sm transition-colors ${
                isConnected 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                  : "bg-amber-50 text-amber-700 border-amber-100"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`}></span>
                {isConnected ? "Live Connection" : "Polling Mode"}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">Monitoring checkout payments, Razorpay references, and settlement lifecycles.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {/* Status Filter Tab */}
            <div className="flex border border-gray-200 rounded-xl overflow-hidden bg-gray-50 p-0.5 text-xs font-bold">
              {(["ALL", "SUCCESS", "PENDING"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    statusFilter === status 
                      ? "bg-white text-gray-950 shadow-sm" 
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Live Search Box */}
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Ref ID, Mode, Amt..."
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
          </div>
        </header>

        {/* Content Workspace */}
        <div className="flex-1 overflow-y-auto p-8 bg-zinc-50/20">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent shadow-sm"></div>
              <p className="text-gray-400 font-bold text-sm">Opening transaction channels...</p>
            </div>
          ) : (
            <div className="space-y-6 max-w-7xl mx-auto">
              
              {/* Payment KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Gross Settled Revenue", value: `₹${stats.totalVolume}`, icon: IndianRupee, desc: "Successful checkouts total", color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
                  { label: "Successful Transactions", value: stats.successfulCount, icon: CheckCircle, desc: "Paid orders count", color: "text-emerald-500 bg-emerald-50/50 border-emerald-100/50" },
                  { label: "Pending Verifications", value: stats.pendingCount, icon: Clock, desc: "Initiated await signatures", color: "text-amber-500 bg-amber-50 border-amber-100" },
                  { label: "Total Payment Records", value: stats.totalCount, icon: Sparkles, desc: "Platform checkout logs", color: "text-red-500 bg-red-50 border-red-100" },
                ].map((card, i) => (
                  <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-gray-400 font-bold text-[10px] uppercase tracking-wider">{card.label}</p>
                        <h3 className="text-xl font-black text-gray-900 mt-1">{card.value}</h3>
                      </div>
                      <div className={`p-3 rounded-2xl border ${card.color}`}><card.icon className="w-4 h-4" /></div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-4 font-medium">{card.desc}</p>
                  </div>
                ))}
              </div>

              {/* Transactions Table Log */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-black text-gray-900 text-base">Transactions Stream Log</h3>
                    <p className="text-gray-400 text-xs mt-0.5">Showing logs matching state criteria, sorted by timestamp</p>
                  </div>
                </div>

                {filteredPayments.length === 0 ? (
                  <div className="text-center py-20 text-gray-400 text-xs flex flex-col items-center justify-center gap-2">
                    <ShieldAlert className="w-8 h-8 text-gray-300" />
                    <p>No transaction logs matched your query.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-gray-100">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="text-[10px] font-bold uppercase text-gray-400 border-b border-gray-100 bg-gray-50/70">
                          <th className="px-6 py-4">Transaction ID / Ref</th>
                          <th className="px-6 py-4">Order ID</th>
                          <th className="px-6 py-4">Amount</th>
                          <th className="px-6 py-4">Gateway</th>
                          <th className="px-6 py-4">Payment Mode</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredPayments.map((pay: any) => {
                          const highlightType = highlightedIds[pay.id];
                          const highlightClass = 
                            highlightType === "success" ? "bg-emerald-50 border-y border-emerald-100 animate-pulse transition-all" :
                            highlightType === "pending" ? "bg-amber-50 border-y border-amber-100 animate-pulse transition-all" :
                            highlightType === "failed" ? "bg-red-50 border-y border-red-100 animate-pulse transition-all" : 
                            "hover:bg-gray-50/30 transition-all";

                          return (
                            <tr key={pay.id} className={highlightClass}>
                              <td className="px-6 py-4 font-mono font-bold text-gray-700 flex items-center gap-1.5">
                                {pay.paymentReference || "pay_mock_init"}
                                {highlightType && (
                                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-600 animate-ping"></span>
                                )}
                              </td>
                              <td className="px-6 py-4 font-bold text-gray-900">Order #{pay.orderId}</td>
                              <td className="px-6 py-4 font-black text-gray-900">₹{parseFloat(pay.amount).toFixed(2)}</td>
                              <td className="px-6 py-4 text-gray-500 font-bold">{pay.gateway}</td>
                              <td className="px-6 py-4 text-gray-600 font-medium">{pay.paymentMode || "UPI"}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                                  pay.status === "SUCCESS"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                    : pay.status === "PENDING"
                                    ? "bg-amber-50 text-amber-700 border-amber-100"
                                    : "bg-red-50 text-red-700 border-red-100"
                                }`}>
                                  {pay.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-gray-400 font-mono">
                                {new Date(pay.createdAt).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
