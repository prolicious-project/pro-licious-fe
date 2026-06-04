"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { getSocket } from "@/lib/socket";
import { Navigation, Phone, CheckCircle, MapPin, AlertCircle, Package } from "lucide-react";

const STATUS_STEPS: Record<string, number> = {
  ASSIGNED: 0, ARRIVED_VENDOR: 1, PICKED_UP: 2, ARRIVED_CUSTOMER: 3, DELIVERED: 4,
};

export default function RiderDashboard() {
  const router = useRouter();
  const { isAuthenticated, user, token } = useSelector((state: RootState) => state.auth);
  const [isOnline, setIsOnline] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [earnings, setEarnings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.push("/login"); return; }

    // Fetch real rider data
    Promise.all([
      api.get("/api/rider/orders"),
      api.get("/api/rider/earnings/summary"),
    ])
      .then(([ordersRes, earningsRes]) => {
        const o = ordersRes.data?.data || [];
        setOrders(o);
        const active = o.find((ord: any) => !["DELIVERED", "CANCELLED", "REJECTED"].includes(ord.status));
        if (active) setActiveOrder(active);
        setEarnings(earningsRes.data?.data);
      })
      .catch(err => console.error("Rider dashboard error:", err))
      .finally(() => setLoading(false));

    // Init socket for live updates
    const socket = getSocket(token || undefined);
    socket.connect();
    socket.on("order_assigned", (data: any) => setActiveOrder(data));

    return () => { socket.off("order_assigned"); socket.disconnect(); };
  }, [isAuthenticated, router, token]);

  const toggleOnline = async () => {
    try {
      await api.patch("/api/rider/availability", { isOnline: !isOnline });
      setIsOnline(prev => !prev);
    } catch (e) { console.error(e); }
  };

  const updateOrderStatus = async (orderId: number, action: string) => {
    try {
      await api.patch(`/api/rider/orders/${orderId}/${action}`);
      setActiveOrder((prev: any) => prev ? { ...prev, status: action.toUpperCase().replace(/-/g, "_") } : prev);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="flex h-screen bg-gray-100 flex-col md:flex-row font-sans">
      {/* Side Panel */}
      <aside className="w-full md:w-80 bg-white border-r border-gray-200 flex flex-col shadow-xl z-20">
        <div className="p-6 bg-red-600 text-white flex justify-between items-center">
          <div>
            <h1 className="font-bold text-xl">Rider App</h1>
            <p className="text-xs text-red-200">{user?.name || "Rider"}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase">{isOnline ? "Online" : "Offline"}</span>
            <div className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${isOnline ? "bg-green-400" : "bg-gray-400"}`} onClick={toggleOnline}>
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${isOnline ? "translate-x-6" : "translate-x-0"}`}></div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-red-600 border-t-transparent"></div>
            </div>
          ) : !activeOrder ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-16">
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-gray-400"><Navigation className="w-10 h-10" /></div>
              <div>
                <h3 className="font-bold text-gray-900">{isOnline ? "Looking for orders..." : "You are offline"}</h3>
                <p className="text-sm text-gray-500">{isOnline ? "Stay online to receive delivery requests." : "Toggle online above to start receiving orders."}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900 uppercase text-xs tracking-wider">Active Assignment</h3>
              <div className="bg-white rounded-xl border border-red-100 shadow-md overflow-hidden">
                <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
                  <span className="font-bold text-red-600 text-sm">{activeOrder.orderNumber}</span>
                  <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded">{activeOrder.status}</span>
                </div>
                <div className="p-4 space-y-4 relative">
                  <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gray-200"></div>
                  <div className="flex gap-4 relative z-10">
                    <div className="w-4 h-4 rounded-full bg-white border-4 border-red-600 flex-shrink-0 mt-1"></div>
                    <div>
                      <p className="text-xs text-gray-500 font-bold uppercase">Pickup</p>
                      <p className="font-bold text-gray-900">{activeOrder.vendorName || "Vendor"}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 relative z-10">
                    <div className="w-4 h-4 rounded-full bg-white border-4 border-green-600 flex-shrink-0 mt-1"></div>
                    <div>
                      <p className="text-xs text-gray-500 font-bold uppercase">Drop-off</p>
                      <p className="font-bold text-gray-900">{activeOrder.customerName || "Customer"}</p>
                      <p className="text-xs text-gray-500">{activeOrder.deliveryAddress || activeOrder.address || "See map"}</p>
                    </div>
                  </div>
                </div>

                {/* Progress Steps */}
                <div className="px-4 pb-2">
                  <div className="flex justify-between mb-1">
                    {["Assigned", "At Vendor", "Picked Up", "At Customer", "Done"].map((step, i) => (
                      <div key={i} className={`text-[9px] font-bold text-center ${(STATUS_STEPS[activeOrder.status] ?? -1) >= i ? "text-red-600" : "text-gray-300"}`}>{step}</div>
                    ))}
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-600 rounded-full transition-all" style={{ width: `${(((STATUS_STEPS[activeOrder.status] ?? 0) + 1) / 5) * 100}%` }}></div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 flex gap-2">
                  <button className="flex-1 bg-white border border-gray-200 py-2 rounded-lg font-bold text-sm text-gray-700 flex items-center justify-center gap-2">
                    <Phone className="w-4 h-4" /> Call
                  </button>
                  {activeOrder.status === "ASSIGNED" && (
                    <button onClick={() => updateOrderStatus(activeOrder.id, "arrived-vendor")} className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded-lg font-bold text-sm text-white flex items-center justify-center gap-2">
                      <Package className="w-4 h-4" /> Arrived
                    </button>
                  )}
                  {activeOrder.status === "ARRIVED_VENDOR" && (
                    <button onClick={() => updateOrderStatus(activeOrder.id, "picked-up")} className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded-lg font-bold text-sm text-white flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Picked Up
                    </button>
                  )}
                  {activeOrder.status === "PICKED_UP" && (
                    <button onClick={() => updateOrderStatus(activeOrder.id, "arrived-customer")} className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded-lg font-bold text-sm text-white flex items-center justify-center gap-2">
                      <MapPin className="w-4 h-4" /> At Customer
                    </button>
                  )}
                </div>
              </div>

              {/* All Orders List */}
              {orders.length > 1 && (
                <div className="mt-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">All Orders ({orders.length})</h4>
                  {orders.map((o: any) => (
                    <div key={o.id} onClick={() => setActiveOrder(o)} className="bg-white p-3 rounded-lg border border-gray-100 mb-2 cursor-pointer hover:border-red-200 transition-colors">
                      <div className="flex justify-between">
                        <span className="font-bold text-sm text-gray-900">{o.orderNumber}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${["DELIVERED", "COMPLETED"].includes(o.status) ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>{o.status}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">₹{parseFloat(o.totalAmount || 0).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-white grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Today's Earnings</p>
            <p className="font-bold text-green-600 text-lg">₹{parseFloat(earnings?.todayEarnings || earnings?.total || 0).toFixed(0)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Deliveries</p>
            <p className="font-bold text-gray-900 text-lg">{earnings?.totalDeliveries || orders.filter(o => o.status === "DELIVERED").length}</p>
          </div>
        </div>
      </aside>

      {/* Map Area */}
      <main className="flex-1 relative bg-blue-50 overflow-hidden">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=2000&auto=format&fit=crop")', backgroundSize: "cover", backgroundPosition: "center" }}></div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          {activeOrder && (
            <>
              <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <path d="M 300,500 Q 500,200 800,400" fill="none" stroke="#dc2626" strokeWidth="6" strokeDasharray="10,10" className="opacity-70 animate-pulse" />
              </svg>
              <div className="absolute flex flex-col items-center" style={{ left: "45%", top: "45%" }}>
                <div className="bg-black text-white text-xs font-bold px-2 py-1 rounded-full mb-1">You</div>
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-red-600">
                  <Navigation className="w-6 h-6 text-red-600 fill-current" />
                </div>
              </div>
              <div className="absolute flex flex-col items-center" style={{ left: "60%", top: "30%" }}>
                <div className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded-full mb-1">Drop-off</div>
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-xl border-4 border-green-600">
                  <MapPin className="w-5 h-5 text-green-600 fill-current" />
                </div>
              </div>
            </>
          )}
          {!activeOrder && !loading && (
            <div className="bg-white/80 backdrop-blur-sm px-6 py-4 rounded-2xl shadow-lg text-center">
              <Navigation className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="font-bold text-gray-700">No active delivery</p>
              <p className="text-sm text-gray-500">Go online to get assigned orders</p>
            </div>
          )}
        </div>
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
          <button className="bg-white p-3 rounded-full shadow-lg border border-gray-100 hover:bg-gray-50"><Navigation className="w-5 h-5 text-gray-700" /></button>
          <button className="bg-white p-3 rounded-full shadow-lg border border-gray-100 hover:bg-gray-50"><AlertCircle className="w-5 h-5 text-red-600" /></button>
        </div>
      </main>
    </div>
  );
}
