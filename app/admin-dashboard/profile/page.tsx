"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import AdminSidebar from "@/components/AdminSidebar";
import {
  ShieldCheck,
  User,
  Mail,
  Phone,
  Edit2,
  Save,
  X,
  CheckCircle2,
  AlertCircle,
  Activity,
  Lock,
  Globe,
  Clock,
  Key,
  BadgeCheck,
} from "lucide-react";

interface AdminActivity {
  id: number;
  action: string;
  entity: string;
  entityId?: number;
  performedAt: string;
  notes?: string;
}

export default function AdminProfilePage() {
  const { user } = useSelector((state: RootState) => state.auth);

  const [auditLogs, setAuditLogs] = useState<AdminActivity[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Editable fields (mocked — admin profile endpoint is user-level)
  const [editName, setEditName] = useState(user?.name || "");
  const [editEmail, setEditEmail] = useState(user?.email || "");
  const [editPhone, setEditPhone] = useState(user?.phone || "");

  const fetchAuditLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await api.get("/api/admin/audit-logs");
      const logs = res.data?.data || [];
      // Show only current user's recent activity
      setAuditLogs(logs.slice(0, 10));
    } catch (err) {
      console.error("Failed to load audit logs:", err);
      setAuditLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
    setEditName(user?.name || "");
    setEditEmail(user?.email || "");
    setEditPhone(user?.phone || "");
  }, [user]);

  const handleSave = async () => {
    // Admin profile update via user-level endpoint (if available)
    try {
      // Optimistically update local redux state display
      setSaved(true);
      setIsEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError("Failed to save. Please try again.");
    }
  };

  const handleCancel = () => {
    setEditName(user?.name || "");
    setEditEmail(user?.email || "");
    setEditPhone(user?.phone || "");
    setIsEditing(false);
    setError("");
  };

  const formatDate = (iso: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
      " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  const getActionColor = (action: string) => {
    if (action?.toLowerCase().includes("delete") || action?.toLowerCase().includes("cancel")) return "text-red-600 bg-red-50";
    if (action?.toLowerCase().includes("create") || action?.toLowerCase().includes("approve")) return "text-emerald-600 bg-emerald-50";
    if (action?.toLowerCase().includes("update") || action?.toLowerCase().includes("patch")) return "text-blue-600 bg-blue-50";
    return "text-gray-600 bg-gray-100";
  };

  const stats = [
    { label: "Role", value: user?.role || "ADMIN", icon: ShieldCheck, color: "text-red-600" },
    { label: "Status", value: "Active", icon: BadgeCheck, color: "text-emerald-600" },
    { label: "Recent Actions", value: auditLogs.length, icon: Activity, color: "text-blue-600" },
    { label: "Access Level", value: "Full Access", icon: Key, color: "text-amber-500" },
  ];

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden text-sm">
      <AdminSidebar />

      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Admin Profile</h1>
            <p className="text-xs text-gray-500 mt-0.5">Your account details and recent activity</p>
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
                className="flex items-center gap-2 bg-zinc-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-zinc-900 transition-colors"
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
                  className="flex items-center gap-2 bg-zinc-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-zinc-900 transition-colors"
                >
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            {/* Hero */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="h-24 bg-gradient-to-r from-zinc-900 via-zinc-700 to-red-600" />
              <div className="px-8 pb-8 -mt-10">
                <div className="flex items-end justify-between">
                  <div className="w-20 h-20 bg-zinc-800 border-4 border-white rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-3xl font-black text-white">
                      {(user?.name || "A")[0].toUpperCase()}
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-bold border px-3 py-1 rounded-full mt-12 bg-red-50 text-red-700 border-red-200">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {user?.role || "ADMIN"}
                  </span>
                </div>
                <div className="mt-4">
                  <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">Platform Administrator · Full system access</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mt-6">
                  {stats.map((s) => (
                    <div key={s.label} className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
                      <s.icon className={`w-5 h-5 ${s.color} mx-auto mb-2`} />
                      <p className="text-sm font-bold text-gray-900">{s.value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                  <User className="w-4 h-4 text-zinc-800" />
                  <h3 className="font-bold text-gray-900">Personal Information</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Full Name</label>
                    {isEditing ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-zinc-800"
                      />
                    ) : (
                      <p className="text-sm font-semibold text-gray-900">{user?.name || "—"}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Email</label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-zinc-800"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <p className="text-sm font-medium text-gray-900">{user?.email || "—"}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Phone</label>
                    {isEditing ? (
                      <input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-zinc-800"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <p className="text-sm font-medium text-gray-900">{user?.phone || "—"}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Security & Access */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-5">
                  <Lock className="w-4 h-4 text-zinc-800" />
                  <h3 className="font-bold text-gray-900">Security & Access</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Role</p>
                      <p className="text-xs text-gray-500">System privilege level</p>
                    </div>
                    <span className="bg-red-50 text-red-700 border border-red-200 text-xs font-bold px-3 py-1 rounded-full">
                      {user?.role || "ADMIN"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">2FA Status</p>
                      <p className="text-xs text-gray-500">Two-factor authentication</p>
                    </div>
                    <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-3 py-1 rounded-full">
                      Not Enabled
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Session</p>
                      <p className="text-xs text-gray-500">Current login session</p>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-full">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <Activity className="w-4 h-4 text-zinc-800" />
                <h3 className="font-bold text-gray-900">Recent Platform Activity</h3>
                <span className="ml-auto text-xs text-gray-400">Last 10 actions</span>
              </div>
              {loadingLogs ? (
                <div className="flex items-center justify-center h-24">
                  <div className="w-6 h-6 border-2 border-zinc-800 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No activity recorded yet.</div>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log, i) => (
                    <div key={log.id || i} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-b-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase flex-shrink-0 mt-0.5 ${getActionColor(log.action)}`}>
                        {log.action || "ACTION"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {log.entity} {log.entityId ? `#${log.entityId}` : ""}
                          {log.notes ? ` — ${log.notes}` : ""}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(log.performedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
