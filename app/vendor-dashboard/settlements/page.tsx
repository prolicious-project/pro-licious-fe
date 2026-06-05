"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { TrendingUp, Wallet, Star, Calendar, FileText, ArrowUpRight } from "lucide-react";
import VendorSidebar from "@/components/VendorSidebar";

export default function VendorSettlementsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  
  const [performance, setPerformance] = useState<any>(null);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.push("/login"); return; }
    
    Promise.all([
      api.get("/api/vendor/performance"),
      api.get("/api/vendor/settlements"),
      api.get("/api/vendor/transactions"),
    ])
      .then(([perfRes, setlRes, txnRes]) => {
        setPerformance(perfRes.data?.data);
        setSettlements(setlRes.data?.data || []);
        setTransactions(txnRes.data?.data || []);
      })
      .catch(err => console.error("Error fetching settlements analytics:", err))
      .finally(() => setLoading(false));
  }, [isAuthenticated, router]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-sm">
      <VendorSidebar />

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-900">Settlements & Performance</h2>
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
              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase">Acceptance Rate</p>
                    <h3 className="text-2xl font-extrabold text-gray-900 mt-0.5">
                      {parseFloat(performance?.acceptanceRate || 0).toFixed(0)}%
                    </h3>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                    <Star className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase">SLA Score</p>
                    <h3 className="text-2xl font-extrabold text-gray-900 mt-0.5">
                      {parseFloat(performance?.slaScore || 0).toFixed(0)}%
                    </h3>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase">Average Preparation Time</p>
                    <h3 className="text-2xl font-extrabold text-gray-900 mt-0.5">
                      {performance?.averagePreparationTime || 0} mins
                    </h3>
                  </div>
                </div>
              </div>

              {/* Transactions and Settlements Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Settlements Table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-900 text-base flex items-center gap-1.5"><Calendar className="w-5 h-5 text-red-600" /> Payout Settlements</h3>
                    <span className="text-xs text-gray-500 font-bold font-mono">{settlements.length} total</span>
                  </div>
                  {settlements.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">No payout settlements recorded.</div>
                  ) : (
                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full text-xs text-left">
                        <thead className="text-[10px] text-gray-500 bg-gray-50 uppercase font-bold border-b border-gray-100 sticky top-0">
                          <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Amount</th>
                            <th className="px-4 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {settlements.map((s) => (
                            <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="px-4 py-3 text-gray-900 font-medium">{new Date(s.settlementDate || s.createdAt).toLocaleDateString()}</td>
                              <td className="px-4 py-3 font-bold text-gray-950">₹{parseFloat(s.settlementAmount).toFixed(2)}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  s.status === "COMPLETED" ? "bg-green-50 text-green-600" : "bg-yellow-50 text-yellow-600"
                                }`}>
                                  {s.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Transactions Table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-900 text-base flex items-center gap-1.5"><FileText className="w-5 h-5 text-red-600" /> Order Transactions</h3>
                    <span className="text-xs text-gray-500 font-bold font-mono">{transactions.length} total</span>
                  </div>
                  {transactions.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">No order transactions recorded.</div>
                  ) : (
                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full text-xs text-left">
                        <thead className="text-[10px] text-gray-500 bg-gray-50 uppercase font-bold border-b border-gray-100 sticky top-0">
                          <tr>
                            <th className="px-4 py-3">Ref ID</th>
                            <th className="px-4 py-3">Amount</th>
                            <th className="px-4 py-3">Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.map((t) => (
                            <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="px-4 py-3 text-red-600 font-bold">#{t.paymentReference || t.id}</td>
                              <td className="px-4 py-3 font-bold text-gray-950">₹{parseFloat(t.amount).toFixed(2)}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  t.status === "SUCCESS" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                                }`}>
                                  {t.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
