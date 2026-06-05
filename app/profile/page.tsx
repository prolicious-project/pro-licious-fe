"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "@/store/slices/authSlice";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { User, MapPin, Bell, LogOut, Edit3, Save, Trash2, CheckCircle2, UserCircle } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [profile, setProfile] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  
  // Profile edit state
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editGender, setEditGender] = useState("");

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  const fetchProfileData = async () => {
    try {
      const [profileRes, addrRes, notifRes] = await Promise.all([
        api.get("/api/customer/profile"),
        api.get("/api/customer/addresses"),
        api.get("/api/customer/notifications"),
      ]);
      const prof = profileRes.data?.data;
      setProfile(prof);
      setEditName(prof?.name || "");
      setEditGender(prof?.gender || "OTHER");
      
      setAddresses(addrRes.data?.data || []);
      setNotifications(notifRes.data?.data || []);
    } catch (e) {
      console.error("Error fetching profile data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchProfileData();
  }, [isAuthenticated, router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setUpdating(true);
    try {
      await api.patch("/api/customer/profile", {
        name: editName,
        gender: editGender,
      });
      setEditMode(false);
      await fetchProfileData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteAddress = async (id: number) => {
    if (!confirm("Delete this address?")) return;
    try {
      await api.delete(`/api/customer/addresses/${id}`);
      await fetchProfileData();
    } catch (e) {
      console.error("Error deleting address:", e);
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await api.patch(`/api/customer/notifications/${id}/read`);
      await fetchProfileData();
    } catch (e) {
      console.error("Error marking notification read:", e);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-sm">
      <Header />
      <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Panel: Profile Detail */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4 border border-red-100 shadow-sm">
                <UserCircle className="w-16 h-16" />
              </div>
              <h2 className="text-xl font-extrabold text-gray-900">{profile?.name}</h2>
              <p className="text-xs font-mono font-bold text-yellow-600 mt-1 uppercase">Customer</p>
            </div>

            {error && <p className="text-xs text-red-600 font-bold bg-red-50 p-2.5 rounded-lg">{error}</p>}

            {editMode ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none font-medium"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gender</label>
                  <select
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none font-medium"
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value)}
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={updating} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 shadow-sm text-xs transition-colors">
                    <Save className="w-4 h-4" /> Save
                  </button>
                  <button type="button" onClick={() => setEditMode(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded-lg text-xs transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 border-t border-gray-100 pt-4 text-xs font-medium text-gray-600">
                <p><span className="font-bold text-gray-400 block uppercase mb-0.5">Phone</span> <span className="font-bold text-gray-900 text-sm">{profile?.phone || "N/A"}</span></p>
                <p><span className="font-bold text-gray-400 block uppercase mb-0.5">Email</span> <span className="font-bold text-gray-900 text-sm">{profile?.email || "N/A"}</span></p>
                <p><span className="font-bold text-gray-400 block uppercase mb-0.5">Gender</span> <span className="font-bold text-gray-900 text-sm">{profile?.gender || "OTHER"}</span></p>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setEditMode(true)} className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold py-2 rounded-lg border border-gray-200 flex items-center justify-center gap-1.5 transition-colors">
                    <Edit3 className="w-3.5 h-3.5" /> Edit Profile
                  </button>
                  <button onClick={handleLogout} className="flex-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2 rounded-lg border border-red-100 flex items-center justify-center gap-1.5 transition-colors">
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Panels: Addresses & Notifications */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Addresses management */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-1.5"><MapPin className="w-5 h-5 text-red-600" /> Saved Addresses</h3>
              {addresses.length === 0 ? (
                <p className="text-gray-400 py-4">No saved addresses yet. You can add them during checkout.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((addr: any) => (
                    <div key={addr.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 flex justify-between items-start gap-4">
                      <div>
                        <span className="font-bold text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded uppercase mb-2 inline-block">
                          {addr.addressType} {addr.isDefault && "• DEFAULT"}
                        </span>
                        <p className="font-bold text-gray-800 text-xs">{addr.houseNumber || ""}, {addr.street}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{addr.city}, {addr.state} - {addr.pincode}</p>
                      </div>
                      <button onClick={() => handleDeleteAddress(addr.id)} className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-1.5"><Bell className="w-5 h-5 text-red-600" /> Recent Notifications</h3>
              {notifications.length === 0 ? (
                <p className="text-gray-400 py-4">No notifications yet.</p>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {notifications.map((n: any) => (
                    <div key={n.id} className={`p-4 rounded-xl border flex justify-between items-start gap-4 transition-all ${
                      n.isRead ? 'border-gray-100 bg-white opacity-60' : 'border-red-100 bg-red-50/10'
                    }`}>
                      <div>
                        <h4 className="font-bold text-gray-900 text-xs">{n.title}</h4>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                        <span className="text-[9px] text-gray-400 mt-2 block font-mono">
                          {new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {!n.isRead && (
                        <button onClick={() => handleMarkRead(n.id)} className="text-red-600 hover:text-red-700 font-bold text-xs flex items-center gap-1 flex-shrink-0">
                          <CheckCircle2 className="w-4 h-4" /> Mark Read
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
