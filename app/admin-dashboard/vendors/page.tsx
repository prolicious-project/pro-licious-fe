"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { Plus, X, Eye, FileText, CheckCircle, ShieldAlert, AlertCircle, Building, Trash2 } from "lucide-react";
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
  const [ownerName, setOwnerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [newVendorPhone, setNewVendorPhone] = useState("");
  const [newVendorEmail, setNewVendorEmail] = useState("");
  const [newVendorPassword, setNewVendorPassword] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [fssaiLicense, setFssaiLicense] = useState("");
  const [gstDocumentUrl, setGstDocumentUrl] = useState("");
  const [panDocumentUrl, setPanDocumentUrl] = useState("");
  const [fssaiDocumentUrl, setFssaiDocumentUrl] = useState("");
  const [otherTaxDocuments, setOtherTaxDocuments] = useState("");

  // Documents modal state
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState<any>(null);

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

  const handleDeleteVendor = async () => {
    if (!vendorToDelete) return;

    try {
      setLoading(true);
      setError("");
      await api.delete(`/api/admin/vendors/${vendorToDelete.id}`);
      setVendorToDelete(null);
      await fetchVendors();
    } catch (e: any) {
      setError(e.response?.data?.message || "Could not delete vendor.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const documents = [
      gstDocumentUrl ? { documentType: "GST_DOCUMENT", fileUrl: gstDocumentUrl } : null,
      panDocumentUrl ? { documentType: "PAN_CARD", fileUrl: panDocumentUrl } : null,
      fssaiDocumentUrl ? { documentType: "FSSAI_LICENSE", fileUrl: fssaiDocumentUrl } : null,
      ...otherTaxDocuments
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((fileUrl) => ({ documentType: "OTHER_TAX_DOCUMENT", fileUrl })),
    ].filter(Boolean) as { documentType: string; fileUrl: string }[];

    try {
      await api.post("/api/admin/vendors", {
        name: businessName,
        ownerName,
        businessAddress,
        phone: newVendorPhone,
        email: newVendorEmail,
        password: newVendorPassword,
        gstNumber,
        panNumber,
        fssaiLicense,
        documents,
      });
      setShowCreateModal(false);
      setOwnerName("");
      setBusinessName("");
      setBusinessAddress("");
      setNewVendorPhone("");
      setNewVendorEmail("");
      setNewVendorPassword("");
      setGstNumber("");
      setPanNumber("");
      setFssaiLicense("");
      setGstDocumentUrl("");
      setPanDocumentUrl("");
      setFssaiDocumentUrl("");
      setOtherTaxDocuments("");
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
                        <button
                          onClick={() => setVendorToDelete(vendor)}
                          className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-xs shadow-sm flex items-center gap-1"
                          title="Delete vendor"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {vendorToDelete && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-rose-500 font-bold">Confirm deletion</p>
                <h3 className="mt-2 text-xl font-extrabold text-gray-900">Delete this vendor?</h3>
                <p className="mt-2 text-sm text-gray-500">This will remove the vendor account from the platform. This action cannot be undone.</p>
              </div>
              <button onClick={() => setVendorToDelete(null)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
              <p className="font-semibold">Vendor to remove:</p>
              <p className="mt-1">{vendorToDelete.name} ({vendorToDelete.email || "No email"})</p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setVendorToDelete(null)} className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 font-semibold text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handleDeleteVendor} className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm shadow-sm flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete Vendor</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE VENDOR MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <h3 className="font-extrabold text-lg text-gray-900">Add New Vendor</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVendor} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Owner Name</label>
                  <input type="text" required placeholder="Owner full name" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Business Name</label>
                  <input type="text" required placeholder="Business / shop name" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Business Address</label>
                <textarea required rows={3} placeholder="Complete business address" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
                  <input type="text" required placeholder="10 digit phone number" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none" value={newVendorPhone} onChange={(e) => setNewVendorPhone(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                  <input type="email" required placeholder="vendor@prolicious.com" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none" value={newVendorEmail} onChange={(e) => setNewVendorEmail(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
                <input type="password" required placeholder="Minimum 6 characters" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none" value={newVendorPassword} onChange={(e) => setNewVendorPassword(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">GST Number</label>
                  <input type="text" placeholder="GST number" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">PAN Number</label>
                  <input type="text" placeholder="PAN number" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none" value={panNumber} onChange={(e) => setPanNumber(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">FSSAI License Number</label>
                <input type="text" placeholder="FSSAI license number" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none" value={fssaiLicense} onChange={(e) => setFssaiLicense(e.target.value)} />
              </div>

              <div className="rounded-xl border border-red-100 bg-red-50/60 p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-red-700">Document URLs / references</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input type="url" placeholder="GST document URL" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none" value={gstDocumentUrl} onChange={(e) => setGstDocumentUrl(e.target.value)} />
                  <input type="url" placeholder="PAN card URL" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none" value={panDocumentUrl} onChange={(e) => setPanDocumentUrl(e.target.value)} />
                  <input type="url" placeholder="FSSAI license URL" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none" value={fssaiDocumentUrl} onChange={(e) => setFssaiDocumentUrl(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Other Tax Documents (one URL per line)</label>
                  <textarea rows={4} placeholder="Paste other tax / compliance document URLs, one per line" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none" value={otherTaxDocuments} onChange={(e) => setOtherTaxDocuments(e.target.value)} />
                </div>
              </div>

              <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors mt-6 uppercase text-xs tracking-wider">Create Vendor Account</button>
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
