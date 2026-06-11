"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { X, Eye, FileText, CheckCircle, ShieldAlert, AlertCircle, Truck } from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import OrderStatusBadge from "@/components/OrderStatusBadge";

export default function AdminRidersPage() {
  const router = useRouter();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Documents modal state
  const [selectedRider, setSelectedRider] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  const fetchRiders = async () => {
    try {
      const res = await api.get("/api/admin/riders");
      setRiders(res.data?.data || []);
    } catch (e) {
      console.error("Error fetching riders:", e);
      setError("Failed to load riders list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) { router.push("/login"); return; }
    fetchRiders();

    const interval = setInterval(() => {
      api.get("/api/admin/riders")
        .then((res) => setRiders(res.data?.data || []))
        .catch((e) => console.error("Error polling riders:", e));
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, router]);

  const handleUpdateStatus = async (riderId: number, status: string) => {
    try {
      setLoading(true);
      await api.patch(`/api/admin/riders/${riderId}/status`, { status });
      await fetchRiders();
    } catch (e: any) {
      setError(e.response?.data?.message || "Could not update rider status.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocuments = async (rider: any) => {
    setSelectedRider(rider);
    setDocsLoading(true);
    setDocuments([]);
    try {
      const res = await api.get(`/api/admin/riders/${rider.id}/documents`);
      setDocuments(res.data?.data || []);
    } catch (e) {
      console.error("Error fetching rider documents:", e);
    } finally {
      setDocsLoading(false);
    }
  };

  const handleVerifyDocument = async (docId: number, status: string) => {
    try {
      await api.patch(`/api/admin/riders/${selectedRider.id}/documents/${docId}`, { status });
      if (selectedRider) {
        handleViewDocuments(selectedRider);
      }
    } catch (e) {
      console.error("Error verifying rider document:", e);
    }
  };

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden text-sm">
      <AdminSidebar />

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-red-600" /> Platform Riders
          </h2>
        </header>

        <div className="flex-grow overflow-hidden flex flex-col p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Riders Table */}
          <div className="flex-grow overflow-y-auto border border-gray-100 rounded-2xl shadow-sm bg-white">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
              </div>
            ) : riders.length === 0 ? (
              <div className="text-center py-20 text-gray-400">No riders registered yet.</div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 bg-zinc-50 uppercase font-bold border-b border-gray-100 sticky top-0">
                  <tr>
                    <th className="px-6 py-4">Rider ID</th>
                    <th className="px-6 py-4">Vehicle Details</th>
                    <th className="px-6 py-4">License Number</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Documents</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {riders.map((rider) => (
                    <tr key={rider.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-bold text-gray-900">#RD-{rider.id}</td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-950">{rider.vehicleType || "N/A"}</p>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{rider.vehicleNumber || "No number"}</p>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-gray-600">
                        {rider.licenseNumber || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <OrderStatusBadge status={rider.status} />
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => handleViewDocuments(rider)} className="flex items-center gap-1 text-red-600 hover:text-red-700 font-bold text-xs">
                          <Eye className="w-3.5 h-3.5" /> View Docs
                        </button>
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        {rider.status !== "APPROVED" && (
                          <button onClick={() => handleUpdateStatus(rider.id, "APPROVED")} className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-xs shadow-sm">
                            Approve
                          </button>
                        )}
                        {rider.status !== "REJECTED" && rider.status === "PENDING" && (
                          <button onClick={() => handleUpdateStatus(rider.id, "REJECTED")} className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs shadow-sm">
                            Reject
                          </button>
                        )}
                        {rider.status === "APPROVED" && (
                          <button onClick={() => handleUpdateStatus(rider.id, "SUSPENDED")} className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-900 text-white rounded font-bold text-xs shadow-sm">
                            Suspend
                          </button>
                        )}
                        {rider.status === "SUSPENDED" && (
                          <button onClick={() => handleUpdateStatus(rider.id, "APPROVED")} className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-xs shadow-sm">
                            Re-Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* VIEW DOCUMENTS MODAL */}
      {selectedRider && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <h3 className="font-extrabold text-lg text-gray-900">Verification Documents</h3>
                <p className="text-xs text-gray-400 mt-0.5">Rider ID: #RD-{selectedRider.id}</p>
              </div>
              <button onClick={() => setSelectedRider(null)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {docsLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-600 border-t-transparent"></div>
              </div>
            ) : documents.length === 0 ? (
              <p className="text-center py-10 text-gray-400 font-medium">No verification documents uploaded yet.</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {documents.map((doc: any) => (
                  <div key={doc.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex gap-3 items-start">
                      <div className="p-2 bg-red-50 text-red-600 rounded-lg"><FileText className="w-6 h-6" /></div>
                      <div>
                        <h4 className="font-bold text-gray-900 uppercase text-xs">{doc.documentType}</h4>
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block truncate max-w-xs">
                          {doc.fileUrl}
                        </a>
                        <div className="mt-2"><OrderStatusBadge status={doc.verificationStatus} /></div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {doc.verificationStatus !== "APPROVED" && (
                        <button onClick={() => handleVerifyDocument(doc.id, "APPROVED")} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-xs shadow-sm flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </button>
                      )}
                      {doc.verificationStatus !== "REJECTED" && (
                        <button onClick={() => handleVerifyDocument(doc.id, "REJECTED")} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs shadow-sm flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" /> Reject
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
