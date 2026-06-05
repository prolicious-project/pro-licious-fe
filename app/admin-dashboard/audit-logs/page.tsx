"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { Activity, ShieldAlert, FileText, AlertTriangle, ShieldCheck, Calendar, User } from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminAuditLogsPage() {
  const router = useRouter();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [logs, setLogs] = useState<any[]>([]);
  const [fraudFlags, setFraudFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.push("/login"); return; }
    
    Promise.all([
      api.get("/api/admin/audit-logs"),
      api.get("/api/admin/fraud-flags"),
    ])
      .then(([logsRes, flagsRes]) => {
        setLogs(logsRes.data?.data || []);
        setFraudFlags(flagsRes.data?.data || []);
      })
      .catch(err => console.error("Error fetching admin metrics:", err))
      .finally(() => setLoading(false));
  }, [isAuthenticated, router]);

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden text-sm">
      <AdminSidebar />

      {/* Main */}
      <main className="flex-grow flex flex-col overflow-hidden bg-white">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-red-600" /> Platform Security & Auditing
          </h2>
        </header>

        <div className="flex-1 overflow-y-auto p-8 max-w-7xl w-full mx-auto space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              
              {/* Audit Logs: Left/Center Column */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h3 className="font-bold text-gray-900 text-base flex items-center gap-1.5"><FileText className="w-5 h-5 text-red-600" /> Audit Log Trail</h3>
                  <span className="text-xs text-gray-500 font-bold font-mono">{logs.length} entries</span>
                </div>
                {logs.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">No audit logs recorded in system.</div>
                ) : (
                  <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-xs text-left">
                      <thead className="text-[10px] text-gray-500 bg-gray-50 uppercase font-bold border-b border-gray-100 sticky top-0">
                        <tr>
                          <th className="px-4 py-3">Admin ID</th>
                          <th className="px-4 py-3">Action</th>
                          <th className="px-4 py-3">Target Entity</th>
                          <th className="px-4 py-3">Notes</th>
                          <th className="px-4 py-3">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-900 font-bold flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-gray-400" /> #{log.adminId}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-zinc-100 text-zinc-800 uppercase border border-zinc-200">
                                {log.actionType}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-700">
                              {log.entityType} #{log.entityId}
                            </td>
                            <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{log.notes || "-"}</td>
                            <td className="px-4 py-3 text-gray-400 font-mono text-[10px]">
                              {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Fraud Flags: Right Column */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-6 space-y-6">
                <h3 className="font-bold text-gray-900 text-lg border-b border-gray-100 pb-4 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-600" /> Fraud flags
                </h3>

                {fraudFlags.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 flex flex-col items-center justify-center">
                    <ShieldCheck className="w-10 h-10 text-green-500 mb-2" />
                    <p className="text-xs font-medium">No accounts flagged for fraud.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                    {fraudFlags.map((flag) => (
                      <div key={flag.id} className="p-4 rounded-xl border border-red-100 bg-red-50/10 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-xs text-red-600">
                            {flag.entityType} #{flag.entityId}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            flag.severity === "HIGH" ? "bg-red-600 text-white" : "bg-orange-100 text-orange-700"
                          }`}>
                            {flag.severity} RISK
                          </span>
                        </div>
                        <p className="text-xs text-gray-700 font-medium leading-relaxed">
                          {flag.reason}
                        </p>
                        <div className="flex justify-between items-center text-[10px] text-gray-400 pt-1">
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(flag.createdAt).toLocaleDateString()}</span>
                          <span className="font-bold uppercase">{flag.status}</span>
                        </div>
                      </div>
                    ))}
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
