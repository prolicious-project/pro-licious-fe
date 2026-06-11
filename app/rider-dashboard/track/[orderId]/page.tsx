"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { getSocket } from "@/lib/socket";
import LeafletMap from "@/components/LeafletMap";
import {
  MapPin,
  Store,
  Clock,
  Phone,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

interface OrderDetail {
  id: number;
  orderNumber: string;
  status: string;
  totalAmount: number;
  items: any[];
  vendor?: {
    id: number;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    phone: string;
  };
  customer?: {
    name: string;
    phone: string;
  };
  address?: {
    streetAddress: string;
    city: string;
    latitude: number;
    longitude: number;
  };
}

export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = params?.orderId as string;
  const router = useRouter();
  const { isAuthenticated, token } = useSelector((state: RootState) => state.auth);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [riderCoords, setRiderCoords] = useState<[number, number] | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [eta, setEta] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  const watchIdRef = useRef<number | null>(null);

  // Haversine formula to compute distance in km
  const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth radius
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError("");
      // Get all assignments and find this specific order to be safe & compatible
      const res = await api.get("/api/rider/orders");
      const orders: OrderDetail[] = res.data?.data || [];
      const current = orders.find((o) => o.id === Number(orderId));
      if (!current) {
        setError("Order not found or not assigned to you.");
        return;
      }
      setOrder(current);
    } catch (err) {
      console.error("Fetch order error:", err);
      setError("Failed to fetch order details.");
    } finally {
      setLoading(false);
    }
  };

  // Setup live geolocation tracking
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchOrderDetails();

    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setRiderCoords([latitude, longitude]);
          // Sync location to backend
          api.post("/api/rider/location", { latitude, longitude }).catch((e) => {
            console.warn("Failed to update rider coordinates:", e);
          });
          // Broadcast via socket
          const socket = getSocket(token || "");
          if (socket.connected) {
            socket.emit("rider_location_update", {
              orderId: Number(orderId),
              latitude,
              longitude,
            });
          }
        },
        (err) => {
          console.error("GPS Watch error:", err);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isAuthenticated, orderId]);

  // Compute distance and ETA
  useEffect(() => {
    if (!riderCoords || !order) return;

    let targetLat = 0;
    let targetLng = 0;

    // If rider status is before pickup, target is vendor. After pickup, target is customer.
    if (["ACCEPTED", "RIDER_ASSIGNED", "ARRIVED_VENDOR"].includes(order.status)) {
      targetLat = order.vendor?.latitude || 0;
      targetLng = order.vendor?.longitude || 0;
    } else {
      targetLat = order.address?.latitude || 0;
      targetLng = order.address?.longitude || 0;
    }

    if (targetLat && targetLng) {
      const dist = getHaversineDistance(riderCoords[0], riderCoords[1], targetLat, targetLng);
      setDistance(Number(dist.toFixed(2)));
      // Assume 25 km/h avg speed => minutes = (dist / 25) * 60
      const minutes = Math.max(Math.round((dist / 25) * 60), 2);
      setEta(minutes);
    }
  }, [riderCoords, order]);

  // Join Socket order room
  useEffect(() => {
    if (!isAuthenticated || !token || !orderId) return;
    const socket = getSocket(token);
    socket.connect();

    socket.emit("join_order_room", { orderId: Number(orderId) });

    socket.on("order_status_changed", (payload) => {
      if (payload.orderId === Number(orderId)) {
        setOrder((prev) => (prev ? { ...prev, status: payload.status } : null));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, token, orderId]);

  const handleUpdateStatus = async (nextStatus: string) => {
    try {
      if (nextStatus === "ARRIVED_VENDOR") {
        await api.patch(`/api/rider/orders/${orderId}/arrived-vendor`);
      } else if (nextStatus === "PICKED_UP") {
        await api.patch(`/api/rider/orders/${orderId}/picked-up`);
      } else if (nextStatus === "ARRIVED_CUSTOMER") {
        await api.patch(`/api/rider/orders/${orderId}/arrived-customer`);
      } else if (nextStatus === "DELIVERED") {
        await api.post(`/api/rider/orders/${orderId}/deliver`, { otp: otpInput });
      }
      fetchOrderDetails();
      if (nextStatus === "DELIVERED") {
        router.push("/rider-dashboard");
      }
    } catch (err: any) {
      console.error("Status update error:", err);
      alert(err.response?.data?.message || "Failed to update order status.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-10 h-10 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto py-12 px-6 bg-gray-900 border border-gray-800 rounded-2xl text-center space-y-4">
        <p className="text-sm text-red-400 font-semibold">{error || "Something went wrong"}</p>
        <button
          onClick={() => router.push("/rider-dashboard")}
          className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-bold transition"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const steps = [
    { label: "Accepted", active: ["ACCEPTED", "ARRIVED_VENDOR", "PICKED_UP", "ARRIVED_CUSTOMER", "DELIVERED"].includes(order.status) },
    { label: "Arrived Vendor", active: ["ARRIVED_VENDOR", "PICKED_UP", "ARRIVED_CUSTOMER", "DELIVERED"].includes(order.status) },
    { label: "Picked Up", active: ["PICKED_UP", "ARRIVED_CUSTOMER", "DELIVERED"].includes(order.status) },
    { label: "Arrived Customer", active: ["ARRIVED_CUSTOMER", "DELIVERED"].includes(order.status) },
    { label: "Delivered", active: order.status === "DELIVERED" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto h-[calc(100vh-140px)]">
      {/* Map Column */}
      <div className="lg:col-span-7 h-full flex flex-col justify-between space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/rider-dashboard")}
            className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-950 dark:text-white tracking-tight">Active Delivery Map</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Real-time status updates every 5s</p>
          </div>
        </div>

        <div className="flex-1 min-h-[300px] relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-2xl">
          <LeafletMap
            riderPosition={riderCoords}
            vendorPosition={
              order.vendor?.latitude ? [order.vendor.latitude, order.vendor.longitude] : null
            }
            customerPosition={
              order.address?.latitude ? [order.address.latitude, order.address.longitude] : null
            }
            className="w-full h-full absolute inset-0"
          />

          {/* Floating overlays */}
          <div className="absolute bottom-4 left-4 right-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-gray-200 dark:border-gray-800 p-4 rounded-xl flex items-center justify-between shadow-xl z-[1000]">
            <div>
              <p className="text-[10px] text-gray-550 dark:text-gray-450 font-bold uppercase tracking-widest">Next Target</p>
              <p className="text-sm font-extrabold text-gray-955 dark:text-white">
                {["ACCEPTED", "RIDER_ASSIGNED", "ARRIVED_VENDOR"].includes(order.status)
                  ? "🏪 Vendor Store"
                  : "🏠 Customer Address"}
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] text-gray-550 dark:text-gray-450 font-bold uppercase tracking-widest">Distance</p>
                <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{distance ? `${distance} km` : "--"}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-550 dark:text-gray-450 font-bold uppercase tracking-widest">ETA</p>
                <p className="text-sm font-extrabold text-amber-600 dark:text-amber-400">{eta ? `${eta} mins` : "--"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Panel */}
      <div className="lg:col-span-5 flex flex-col justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 h-full overflow-y-auto space-y-6 shadow-sm">
        {/* Step Visualizer */}
        <div className="space-y-4">
          <h2 className="text-base font-extrabold text-gray-955 dark:text-white tracking-tight">Delivery Stages</h2>
          <div className="relative flex items-center justify-between">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 bg-gray-100 dark:bg-gray-805 h-1 z-0" />
            {steps.map((step, idx) => (
              <div key={idx} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition ${
                    step.active
                      ? "bg-red-600 border-red-500 text-white"
                      : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-600"
                  }`}
                >
                  {idx + 1}
                </div>
                <span className="text-[8px] font-bold mt-1.5 uppercase text-gray-500 dark:text-gray-400 tracking-wide text-center">
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Vendor & Customer cards */}
        <div className="space-y-4 flex-1 pt-4 border-t border-gray-100 dark:border-gray-800/80">
          {/* Vendor */}
          <div className="flex gap-3 items-start animate-fade-in">
            <div className="p-2 bg-red-50 dark:bg-red-955/30 border border-red-200 dark:border-red-900/30 rounded-xl text-red-500">
              <Store className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400">Vendor</p>
              <h3 className="text-sm font-black text-gray-955 dark:text-white">{order.vendor?.name}</h3>
              <p className="text-xs text-gray-550 dark:text-gray-400 line-clamp-1">{order.vendor?.address}</p>
              {order.vendor?.phone && (
                <a
                  href={`tel:${order.vendor.phone}`}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 mt-1 hover:underline"
                >
                  <Phone className="w-3 h-3" /> Call Store
                </a>
              )}
            </div>
          </div>

          {/* Customer */}
          <div className="flex gap-3 items-start pt-3 border-t border-gray-100 dark:border-gray-850 animate-fade-in">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-955/30 border border-emerald-200 dark:border-emerald-900/30 rounded-xl text-emerald-500">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400">Customer Details</p>
              <h3 className="text-sm font-black text-gray-955 dark:text-white">{order.customer?.name || "Customer"}</h3>
              <p className="text-xs text-gray-550 dark:text-gray-400 line-clamp-1">{order.address?.streetAddress || "Deliver Location"}</p>
              {order.customer?.phone && (
                <a
                  href={`tel:${order.customer.phone}`}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 mt-1 hover:underline"
                >
                  <Phone className="w-3 h-3" /> Call Customer
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Action Button Section */}
        <div className="pt-5 border-t border-gray-100 dark:border-gray-800 space-y-3">
          {order.status === "ACCEPTED" && (
            <button
              onClick={() => handleUpdateStatus("ARRIVED_VENDOR")}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider transition"
            >
              Confirm: Arrived at Vendor
            </button>
          )}

          {order.status === "ARRIVED_VENDOR" && (
            <button
              onClick={() => handleUpdateStatus("PICKED_UP")}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider transition"
            >
              Confirm: Picked Up Order
            </button>
          )}

          {order.status === "PICKED_UP" && (
            <button
              onClick={() => handleUpdateStatus("ARRIVED_CUSTOMER")}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider transition"
            >
              Confirm: Arrived at Customer
            </button>
          )}

          {order.status === "ARRIVED_CUSTOMER" && (
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter 4-digit Delivery OTP"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-955 border border-gray-200 dark:border-gray-800 text-gray-955 dark:text-white font-bold text-center py-2.5 rounded-xl placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-emerald-500 text-sm tracking-widest"
                />
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <button
                onClick={() => handleUpdateStatus("DELIVERED")}
                disabled={otpInput.length < 4}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider transition shadow-lg shadow-emerald-950/20"
              >
                Confirm Delivery
              </button>
            </div>
          )}

          {order.status === "DELIVERED" && (
            <div className="w-full py-3 bg-gray-50 dark:bg-gray-850 text-gray-500 font-extrabold text-xs rounded-xl text-center uppercase tracking-wider border border-gray-150 dark:border-gray-800">
              Delivery Completed ✓
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
