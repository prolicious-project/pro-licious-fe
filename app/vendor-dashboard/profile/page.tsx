"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import VendorSidebar from "@/components/VendorSidebar";
import {
  Store,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  Edit2,
  Save,
  X,
  CheckCircle2,
  Clock,
  TrendingUp,
  Package,
  Star,
  BadgeCheck,
  AlertCircle,
  Building2,
} from "lucide-react";

interface VendorProfile {
  id: number;
  name: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  status: string;
  rating?: number;
  totalOrders?: number;
}

export default function VendorProfilePage() {
  const { user } = useSelector((state: RootState) => state.auth);

  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Editable fields
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editGst, setEditGst] = useState("");

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/vendor/profile");
      const data = res.data?.data || res.data;
      setProfile(data);
      setEditName(data.name || "");
      setEditDescription(data.description || "");
      setEditPhone(data.phone || "");
      setEditEmail(data.email || "");
      setEditGst(data.gstNumber || "");
    } catch (err) {
      console.error("Failed to fetch vendor profile:", err);
      setError("Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await api.patch("/api/vendor/profile", {
        name: editName,
        description: editDescription,
        phone: editPhone,
        email: editEmail,
        gstNumber: editGst,
      });
      setSaved(true);
      setIsEditing(false);
      await fetchProfile();
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setEditName(profile.name || "");
      setEditDescription(profile.description || "");
      setEditPhone(profile.phone || "");
      setEditEmail(profile.email || "");
      setEditGst(profile.gstNumber || "");
    }
    setIsEditing(false);
    setError("");
  };

  const statusColor =
    profile?.status === "ACTIVE"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : profile?.status === "SUSPENDED"
      ? "bg-red-100 text-red-700 border-red-200"
      : "bg-amber-100 text-amber-700 border-amber-200";

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-sm">
      <VendorSidebar />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Vendor Profile</h1>
            <p className="text-xs text-gray-500 mt-0.5">Manage your store information and details</p>
          </div>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" /> Saved!
              </span>
            )}
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
              >
                <Edit2 className="w-4 h-4" /> Edit Profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors"
                >
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-60 transition-colors"
                >
                  <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 flex items-center gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Profile Hero Card */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="h-24 bg-gradient-to-r from-red-600 via-red-500 to-orange-400" />
                <div className="px-8 pb-8 -mt-10">
                  <div className="flex items-end justify-between">
                    <div className="w-20 h-20 bg-white border-4 border-white rounded-2xl flex items-center justify-center shadow-lg">
                      <Store className="w-9 h-9 text-red-600" />
                    </div>
                    <span className={`text-xs font-bold border px-3 py-1 rounded-full mt-12 ${statusColor}`}>
                      {profile?.status || "ACTIVE"}
                    </span>
                  </div>
                  <div className="mt-4">
                    <h2 className="text-2xl font-bold text-gray-900">{profile?.name}</h2>
                    <p className="text-sm text-gray-500 mt-1">{profile?.description || "No description provided."}</p>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    {[
                      { label: "Total Orders", value: profile?.totalOrders ?? "—", icon: Package, color: "text-blue-600" },
                      { label: "Avg Rating", value: profile?.rating ? `${profile.rating}/5` : "—", icon: Star, color: "text-amber-500" },
                      { label: "Account Status", value: profile?.status || "ACTIVE", icon: BadgeCheck, color: "text-emerald-600" },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
                        <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-2`} />
                        <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Store Information */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center gap-2 mb-5">
                    <Store className="w-4 h-4 text-red-600" />
                    <h3 className="font-bold text-gray-900">Store Information</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                        Store Name
                      </label>
                      {isEditing ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      ) : (
                        <p className="text-sm font-medium text-gray-900">{profile?.name || "—"}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                        Description
                      </label>
                      {isEditing ? (
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={3}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                        />
                      ) : (
                        <p className="text-sm font-medium text-gray-900">{profile?.description || "—"}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                        GST Number
                      </label>
                      {isEditing ? (
                        <input
                          value={editGst}
                          onChange={(e) => setEditGst(e.target.value)}
                          placeholder="GSTIN"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      ) : (
                        <p className="text-sm font-mono font-medium text-gray-900">{profile?.gstNumber || "—"}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                        Address
                      </label>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm font-medium text-gray-900">{profile?.address || "—"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact & Owner */}
                <div className="space-y-5">
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-5">
                      <Phone className="w-4 h-4 text-red-600" />
                      <h3 className="font-bold text-gray-900">Store Contact</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                          Phone
                        </label>
                        {isEditing ? (
                          <input
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <p className="text-sm font-medium text-gray-900">{profile?.phone || "—"}</p>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">
                          Email
                        </label>
                        {isEditing ? (
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <p className="text-sm font-medium text-gray-900">{profile?.email || "—"}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-5">
                      <User className="w-4 h-4 text-red-600" />
                      <h3 className="font-bold text-gray-900">Owner Details</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-red-50 rounded-full flex items-center justify-center font-bold text-red-600">
                          {(profile?.ownerName || user?.name || "V")[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{profile?.ownerName || user?.name || "—"}</p>
                          <p className="text-xs text-gray-500">Account Owner</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <p className="text-sm font-medium text-gray-900">{profile?.ownerEmail || user?.email || "—"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <p className="text-sm font-medium text-gray-900">{profile?.ownerPhone || user?.phone || "—"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-800">Need to update your address or business category?</p>
                  <p className="text-xs text-amber-700 mt-0.5">Please contact the admin team for address or category changes as they require document verification.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
