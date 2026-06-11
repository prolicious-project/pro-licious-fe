"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { Plus, X, Eye, FileText, CheckCircle, ShieldAlert, AlertCircle, Building } from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import OrderStatusBadge from "@/components/OrderStatusBadge";

export default function AdminVendorsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create vendor modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [newVendorPhone, setNewVendorPhone] = useState("");
  const [newVendorEmail, setNewVendorEmail] = useState("");
  const [newVendorPassword, setNewVendorPassword] = useState("");

  // Documents modal state
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  const fetchVendors = async () => {
    try {
      const res = await api.get("/api/admin/vendors");
      setVendors(res.data?.data || []);
    } catch (e) {
      console.error("Error fetching vendors:", e);
      setError("Failed to load vendors list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) { router.push("/login"); return; }
    fetchVendors();

    const interval = setInterval(() => {
      api.get("/api/admin/vendors")
        .then((res) => setVendors(res.data?.data || []))
        .catch((e) => console.error("Error polling vendors:", e));
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, router]);

  const handleUpdateStatus = async (vendorId: number, status: string) => {
    try {
      setLoading(true);
      await api.patch(`/api/admin/vendors/${vendorId}/status`, { status });
      await fetchVendors();
    } catch (e: any) {
      setError(e.response?.data?.message || "Could not update status.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/api/admin/vendors", {
        name: newVendorName,
        phone: newVendorPhone,
        email: newVendorEmail,
        password: newVendorPassword,
      });
      setShowCreateModal(false);
      // Reset form
      setNewVendorName("");
      setNewVendorPhone("");
      setNewVendorEmail("");
      setNewVendorPassword("");
      await fetchVendors();
    } catch (err: any) {
      setError(err.response?.data?.message || "Could not create vendor account.");
    }
  };

  const handleViewDocuments = async (vendor: any) => {
    setSelectedVendor(vendor);
    setDocsLoading(true);
    setDocuments([]);
    try {
      const res = await api.get(`/api/admin/vendors/${vendor.id}/documents`);
      setDocuments(res.data?.data || []);
    } catch (e) {
      console.error("Error fetching vendor documents:", e);
    } finally {
      setDocsLoading(false);
    }
  };

  const handleVerifyDocument = async (docId: number, status: string) => {
    try {
      await api.patch(`/api/admin/vendors/${selectedVendor.id}/documents/${docId}`, { status });
      // Refresh docs
      if (selectedVendor) {
        handleViewDocuments(selectedVendor);
      }
    } catch (e) {
      console.error("Error verifying document:", e);
    }
  };

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden text-sm">
      <AdminSidebar />

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Building className="w-5 h-5 text-red-600" /> Platform Vendors
          </h2>
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs shadow-sm transition-colors">
            <Plus className="w-4 h-4" /> Add Vendor
          </button>
        </header>

        <div className="flex-grow overflow-hidden flex flex-col p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Vendors Table */}
          <div className="flex-grow overflow-y-auto border border-gray-100 rounded-2xl shadow-sm bg-white">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
              </div>
            ) : vendors.length === 0 ? (
              <div className="text-center py-20 text-gray-400">No vendors on boarded yet.</div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 bg-zinc-50 uppercase font-bold border-b border-gray-100 sticky top-0">
                  <tr>
                    <th className="px-6 py-4">Vendor ID</th>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Documents</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((vendor) => (
                    <tr key={vendor.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-bold text-gray-900">#VD-{vendor.id}</td>
                      <td className="px-6 py-4 font-bold text-gray-950">{vendor.name}</td>
                      <td className="px-6 py-4 text-xs text-gray-600">
                        <p>{vendor.email || "No Email"}</p>
                        <p className="mt-0.5 text-[10px] text-gray-400 font-bold">{vendor.phone || "No Phone"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <OrderStatusBadge status={vendor.status} />
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => handleViewDocuments(vendor)} className="flex items-center gap-1 text-red-600 hover:text-red-700 font-bold text-xs">
                          <Eye className="w-3.5 h-3.5" /> View Docs
                        </button>
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        {vendor.status !== "APPROVED" && (
                          <button onClick={() => handleUpdateStatus(vendor.id, "APPROVED")} className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-xs shadow-sm">
                            Approve
                          </button>
                        )}
                        {vendor.status !== "REJECTED" && vendor.status === "PENDING" && (
                          <button onClick={() => handleUpdateStatus(vendor.id, "REJECTED")} className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs shadow-sm">
                            Reject
                          </button>
                        )}
                        {vendor.status === "APPROVED" && (
                          <button onClick={() => handleUpdateStatus(vendor.id, "SUSPENDED")} className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-900 text-white rounded font-bold text-xs shadow-sm">
                            Suspend
                          </button>
                        )}
                        {vendor.status === "SUSPENDED" && (
                          <button onClick={() => handleUpdateStatus(vendor.id, "APPROVED")} className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-xs shadow-sm">
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

      {/* CREATE VENDOR MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <h3 className="font-extrabold text-lg text-gray-900">Add New Vendor</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVendor} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vendor Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meat Shoppe"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none"
                  value={newVendorName}
                  onChange={(e) => setNewVendorName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="10 digit phone number"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none"
                  value={newVendorPhone}
                  onChange={(e) => setNewVendorPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="vendor@prolicious.com"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none"
                  value={newVendorEmail}
                  onChange={(e) => setNewVendorEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none"
                  value={newVendorPassword}
                  onChange={(e) => setNewVendorPassword(e.target.value)}
                />
              </div>

              <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors mt-6 uppercase text-xs tracking-wider">
                Create Vendor Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DOCUMENTS MODAL */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div>
                <h3 className="font-extrabold text-lg text-gray-900">Verification Documents</h3>
                <p className="text-xs text-gray-400 mt-0.5">Vendor: {selectedVendor.name}</p>
              </div>
              <button onClick={() => setSelectedVendor(null)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
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
