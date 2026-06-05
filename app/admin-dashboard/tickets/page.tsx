"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { CheckCircle2, MessageSquare, AlertCircle, Send, X, Calendar } from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import OrderStatusBadge from "@/components/OrderStatusBadge";

export default function AdminTicketsPage() {
  const router = useRouter();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [activeTab, setActiveTab] = useState<"TICKETS" | "COMPLAINTS">("TICKETS");
  const [tickets, setTickets] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Response form modal state
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [responseText, setResponseText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ticketsRes, complaintsRes] = await Promise.all([
        api.get("/api/admin/tickets"),
        api.get("/api/admin/complaints"),
      ]);
      setTickets(ticketsRes.data?.data || []);
      setComplaints(complaintsRes.data?.data || []);
    } catch (e) {
      console.error("Error fetching admin support logs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) { router.push("/login"); return; }
    fetchData();
  }, [isAuthenticated, router]);

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!respondingId || !responseText.trim()) return;
    setError("");
    setSubmitting(true);
    try {
      if (activeTab === "TICKETS") {
        await api.post(`/api/admin/tickets/${respondingId}/respond`, { response: responseText });
      } else {
        await api.post(`/api/admin/complaints/${respondingId}/respond`, { response: responseText });
      }
      setRespondingId(null);
      setResponseText("");
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to submit response.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden text-sm">
      <AdminSidebar />

      {/* Main */}
      <main className="flex-grow flex flex-col overflow-hidden bg-white">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-red-600" /> Tickets & Complaints
          </h2>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col p-8 space-y-6">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 pb-px gap-4 flex-shrink-0">
            <button
              onClick={() => setActiveTab("TICKETS")}
              className={`px-4 py-3 font-bold border-b-2 text-xs tracking-wider uppercase transition-all ${
                activeTab === "TICKETS" ? "border-red-600 text-red-600" : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              Support Tickets
            </button>
            <button
              onClick={() => setActiveTab("COMPLAINTS")}
              className={`px-4 py-3 font-bold border-b-2 text-xs tracking-wider uppercase transition-all ${
                activeTab === "COMPLAINTS" ? "border-red-600 text-red-600" : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              Customer Complaints
            </button>
          </div>

          {/* List Area */}
          <div className="flex-grow overflow-y-auto border border-gray-100 rounded-2xl shadow-sm bg-white">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
              </div>
            ) : activeTab === "TICKETS" ? (
              /* TICKETS TAB */
              tickets.length === 0 ? (
                <div className="text-center py-20 text-gray-400 flex flex-col items-center justify-center">
                  <MessageSquare className="w-12 h-12 mb-3 text-gray-300" />
                  <p className="text-sm font-medium">No support tickets active.</p>
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 bg-zinc-50 uppercase font-bold border-b border-gray-100 sticky top-0">
                    <tr>
                      <th className="px-6 py-4">Ticket ID</th>
                      <th className="px-6 py-4">Customer ID</th>
                      <th className="px-6 py-4">Subject</th>
                      <th className="px-6 py-4">Priority</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => (
                      <tr key={ticket.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-6 py-4 font-bold text-gray-900">#TK-{ticket.id}</td>
                        <td className="px-6 py-4 font-medium text-gray-700">Customer #{ticket.customerId}</td>
                        <td className="px-6 py-4 font-bold text-gray-950">{ticket.subject}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ticket.priority === "HIGH" ? "bg-red-50 text-red-600" :
                            ticket.priority === "MEDIUM" ? "bg-yellow-50 text-yellow-700" : "bg-blue-50 text-blue-600"
                          }`}>
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <OrderStatusBadge status={ticket.status} />
                        </td>
                        <td className="px-6 py-4">
                          {ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" ? (
                            <button onClick={() => { setRespondingId(ticket.id); setError(""); }} className="text-red-600 hover:text-red-700 font-bold text-xs flex items-center gap-1">
                              Respond
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs flex items-center gap-1 font-medium"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Resolved</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              /* COMPLAINTS TAB */
              complaints.length === 0 ? (
                <div className="text-center py-20 text-gray-400 flex flex-col items-center justify-center">
                  <AlertCircle className="w-12 h-12 mb-3 text-gray-300" />
                  <p className="text-sm font-medium">No customer complaints active.</p>
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 bg-zinc-50 uppercase font-bold border-b border-gray-100 sticky top-0">
                    <tr>
                      <th className="px-6 py-4">Complaint ID</th>
                      <th className="px-6 py-4">Customer ID</th>
                      <th className="px-6 py-4">Order ID</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map((comp) => (
                      <tr key={comp.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-6 py-4 font-bold text-gray-900">#CP-{comp.id}</td>
                        <td className="px-6 py-4 font-medium text-gray-700">Customer #{comp.customerId}</td>
                        <td className="px-6 py-4 text-red-600 font-bold">#{comp.orderId || "N/A"}</td>
                        <td className="px-6 py-4 font-bold text-gray-950 uppercase text-xs">{comp.category}</td>
                        <td className="px-6 py-4 text-gray-500 max-w-xs truncate">{comp.description}</td>
                        <td className="px-6 py-4">
                          <OrderStatusBadge status={comp.status} />
                        </td>
                        <td className="px-6 py-4">
                          {comp.status !== "RESOLVED" && comp.status !== "CLOSED" ? (
                            <button onClick={() => { setRespondingId(comp.id); setError(""); }} className="text-red-600 hover:text-red-700 font-bold text-xs flex items-center gap-1">
                              Respond
                            </button>
                          ) : (
                            <span className="text-gray-400 text-xs flex items-center gap-1 font-medium"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Resolved</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        </div>
      </main>

      {/* RESPONSE MODAL */}
      {respondingId !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <h3 className="font-extrabold text-lg text-gray-900">Submit Support Response</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Responding to {activeTab === "TICKETS" ? "Ticket" : "Complaint"} #{respondingId}
                </p>
              </div>
              <button onClick={() => setRespondingId(null)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && <p className="text-xs text-red-600 font-bold bg-red-50 p-2.5 rounded-lg">{error}</p>}

            <form onSubmit={handleSubmitResponse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Message Text</label>
                <textarea
                  required
                  placeholder="Type your resolution steps or feedback here..."
                  rows={4}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none resize-none font-medium"
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 text-xs uppercase tracking-wider disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> {submitting ? "Sending..." : "Send Response"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
