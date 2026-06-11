"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { 
  FileText, 
  Calendar, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Download 
} from "lucide-react";
import VendorSidebar from "@/components/VendorSidebar";

interface PaymentItem {
  id: number;
  orderId: number;
  gateway: string;
  paymentReference: string;
  amount: string;
  status: string;
  paymentMode: string;
  createdAt: string;
}

interface SettlementItem {
  id: number;
  vendorId: number;
  settlementAmount: string;
  settlementDate: string;
  status: string;
}

export default function VendorTransactionsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  
  const [transactions, setTransactions] = useState<PaymentItem[]>([]);
  const [settlements, setSettlements] = useState<SettlementItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation & filtering state
  const [activeTab, setActiveTab] = useState<"orders" | "settlements">("orders");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchTransactionsData = async () => {
    try {
      const [txnRes, setlRes] = await Promise.all([
        api.get("/api/vendor/transactions"),
        api.get("/api/vendor/settlements"),
      ]);
      setTransactions(txnRes.data?.data || []);
      setSettlements(setlRes.data?.data || []);
    } catch (err) {
      console.error("Error fetching transactions/settlements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchTransactionsData();
  }, [isAuthenticated, router]);

  // Statistics
  const totalProcessed = transactions
    .filter(t => t.status === "SUCCESS")
    .reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0);

  const totalSettled = settlements
    .filter(s => s.status === "COMPLETED")
    .reduce((sum, s) => sum + parseFloat(s.settlementAmount || "0"), 0);

  const pendingSettlement = settlements
    .filter(s => s.status === "PENDING" || s.status === "PROCESSING")
    .reduce((sum, s) => sum + parseFloat(s.settlementAmount || "0"), 0);

  // Filters applying to Transactions
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.paymentReference?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.orderId.toString().includes(searchTerm) || 
      (t.paymentMode || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Filters applying to Settlements
  const filteredSettlements = settlements.filter(s => {
    const matchesSearch = 
      new Date(s.settlementDate).toLocaleDateString().includes(searchTerm) ||
      s.id.toString().includes(searchTerm);
      
    const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const exportCSV = () => {
    if (activeTab === "orders") {
      if (filteredTransactions.length === 0) return;
      const headers = ["Transaction ID", "Order ID", "Reference ID", "Payment Mode", "Gateway", "Amount (INR)", "Status", "Date"];
      const rows = filteredTransactions.map(t => [
        t.id,
        t.orderId,
        t.paymentReference || "N/A",
        t.paymentMode || "N/A",
        t.gateway,
        parseFloat(t.amount).toFixed(2),
        t.status,
        new Date(t.createdAt).toLocaleString()
      ]);
      triggerCSVDownload(headers, rows, "order_transactions");
    } else {
      if (filteredSettlements.length === 0) return;
      const headers = ["Settlement ID", "Settlement Date", "Amount (INR)", "Status"];
      const rows = filteredSettlements.map(s => [
        s.id,
        s.settlementDate,
        parseFloat(s.settlementAmount).toFixed(2),
        s.status
      ]);
      triggerCSVDownload(headers, rows, "payout_settlements");
    }
  };

  const triggerCSVDownload = (headers: string[], rows: any[][], fileNamePrefix: string) => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${fileNamePrefix}_${new Date().toISOString().split("T")[0]}.csv`);
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
            <h2 className="text-xl font-bold text-gray-900">Transactions & Payouts</h2>
            <p className="text-xs text-gray-500 mt-0.5">Manage payouts, client payments, and cashflows</p>
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
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Processed Payments */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between relative overflow-hidden group">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payments Processed</p>
                    <h3 className="text-3xl font-extrabold text-gray-950">₹{totalProcessed.toFixed(2)}</h3>
                    <div className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Successful client orders</span>
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 text-green-600 rounded-2xl">
                    <ArrowUpRight className="w-6 h-6" />
                  </div>
                </div>

                {/* Total Settled Payouts */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between relative overflow-hidden group">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Settled to Bank</p>
                    <h3 className="text-3xl font-extrabold text-gray-950">₹{totalSettled.toFixed(2)}</h3>
                    <div className="flex items-center gap-1 text-xs text-blue-600 font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Transferred to your bank account</span>
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                    <ArrowDownRight className="w-6 h-6" />
                  </div>
                </div>

                {/* Unsettled/Pending Payouts */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between relative overflow-hidden group">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Unsettled Balance</p>
                    <h3 className="text-3xl font-extrabold text-gray-950">₹{pendingSettlement.toFixed(2)}</h3>
                    <div className="flex items-center gap-1 text-xs text-amber-600 font-semibold">
                      <Clock className="w-4 h-4 animate-pulse" />
                      <span>Pending transfer/processing</span>
                    </div>
                  </div>
                  <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
                    <Clock className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Tabs and Filtering Control */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
                  {/* Segment controller */}
                  <div className="inline-flex bg-gray-100 p-1 rounded-xl w-fit">
                    <button 
                      onClick={() => {
                        setActiveTab("orders");
                        setSearchTerm("");
                        setStatusFilter("ALL");
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        activeTab === "orders" 
                          ? "bg-white text-red-600 shadow-sm" 
                          : "text-gray-500 hover:text-gray-950"
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      Order Transactions
                    </button>
                    <button 
                      onClick={() => {
                        setActiveTab("settlements");
                        setSearchTerm("");
                        setStatusFilter("ALL");
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        activeTab === "settlements" 
                          ? "bg-white text-red-600 shadow-sm" 
                          : "text-gray-500 hover:text-gray-950"
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                      Payout Settlements
                    </button>
                  </div>

                  {/* Filters & Export */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <input 
                        type="text"
                        placeholder={activeTab === "orders" ? "Search by ref / order ID..." : "Search by date..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-red-500 w-48 transition-all"
                      />
                    </div>

                    <div className="relative flex items-center">
                      <Filter className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
                      <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="pl-9 pr-6 py-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-red-500 appearance-none cursor-pointer transition-all"
                      >
                        <option value="ALL">All Statuses</option>
                        {activeTab === "orders" ? (
                          <>
                            <option value="SUCCESS">Success</option>
                            <option value="PENDING">Pending</option>
                            <option value="FAILED">Failed</option>
                          </>
                        ) : (
                          <>
                            <option value="COMPLETED">Completed</option>
                            <option value="PENDING">Pending</option>
                            <option value="PROCESSING">Processing</option>
                          </>
                        )}
                      </select>
                    </div>

                    <button 
                      onClick={exportCSV}
                      disabled={activeTab === "orders" ? filteredTransactions.length === 0 : filteredSettlements.length === 0}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 hover:text-gray-950 hover:bg-gray-50 rounded-xl font-bold text-xs shadow-sm transition-all disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export Table
                    </button>
                  </div>
                </div>

                {/* Table Content */}
                {activeTab === "orders" ? (
                  /* Order Transactions Table */
                  filteredTransactions.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 text-gray-300" />
                      <span>No transactions match the selected filter.</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="text-[10px] text-gray-500 bg-gray-50 uppercase font-bold border-b border-gray-100">
                          <tr>
                            <th className="px-6 py-4">Transaction ID</th>
                            <th className="px-6 py-4">Order #</th>
                            <th className="px-6 py-4">Payment Reference</th>
                            <th className="px-6 py-4">Payment Mode</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">Gateway</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Date & Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTransactions.map((t) => (
                            <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="px-6 py-4 text-gray-500 font-mono">#{t.id}</td>
                              <td className="px-6 py-4 font-bold text-red-600">Order #{t.orderId}</td>
                              <td className="px-6 py-4 text-gray-900 font-semibold font-mono">{t.paymentReference || "N/A"}</td>
                              <td className="px-6 py-4 font-semibold text-gray-600">{t.paymentMode || "N/A"}</td>
                              <td className="px-6 py-4 font-bold text-gray-950">₹{parseFloat(t.amount).toFixed(2)}</td>
                              <td className="px-6 py-4 text-gray-500 uppercase font-medium">{t.gateway}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  t.status === "SUCCESS" 
                                    ? "bg-green-50 text-green-600" 
                                    : t.status === "PENDING"
                                      ? "bg-yellow-50 text-yellow-600"
                                      : "bg-red-50 text-red-600"
                                }`}>
                                  {t.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-gray-500">
                                {new Date(t.createdAt).toLocaleString("en-IN", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : (
                  /* Payout Settlements Table */
                  filteredSettlements.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 text-gray-300" />
                      <span>No settlements match the selected filter.</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="text-[10px] text-gray-500 bg-gray-50 uppercase font-bold border-b border-gray-100">
                          <tr>
                            <th className="px-6 py-4">Settlement ID</th>
                            <th className="px-6 py-4">Settlement Date</th>
                            <th className="px-6 py-4">Settlement Amount</th>
                            <th className="px-6 py-4">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSettlements.map((s) => (
                            <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="px-6 py-4 text-gray-500 font-mono">#{s.id}</td>
                              <td className="px-6 py-4 text-gray-900 font-semibold">
                                {new Date(s.settlementDate).toLocaleDateString("en-IN", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                  weekday: "short"
                                })}
                              </td>
                              <td className="px-6 py-4 font-bold text-gray-950 text-base">₹{parseFloat(s.settlementAmount).toFixed(2)}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  s.status === "COMPLETED" 
                                    ? "bg-green-50 text-green-600 font-bold" 
                                    : s.status === "PROCESSING" 
                                      ? "bg-blue-50 text-blue-600 font-bold"
                                      : "bg-yellow-50 text-yellow-600 font-bold"
                                }`}>
                                  {s.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
