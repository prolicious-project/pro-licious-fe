"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { riderApi } from "@/services/api";
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
  AlertCircle,
  Loader,
  Package,
  DollarSign,
} from "lucide-react";

interface OrderDetail {
  id: number;
  orderNumber: string;
  status: string;
  totalAmount: number;
  subtotal?: number;
  taxAmount?: number;
  deliveryFee?: number;
  platformFee?: number;
  discountAmount?: number;
  items: Array<{
    id: number;
    name: string;
    quantity: number;
    price: number;
    specialInstructions?: string;
  }>;
  vendor?: {
    id: number;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    phone: string;
    image?: string;
  };
  customer?: {
    name: string;
    phone: string;
    email?: string;
  };

  address?: {
    streetAddress: string;
    city: string;
    latitude: number;
    longitude: number;
    zipCode?: string;
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
  const lastLocationSyncRef = useRef<number>(0);

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
      const orderId = Number(params.orderId);
      
      // Get all assignments and find this specific order to ensure compatibility
      const res = await riderApi.getOrderById(orderId);
      const current = res.data?.data;
      
      if (!current) {
        setError("Order not found or not assigned to you.");
        return;
      }
      setOrder(current);
    } catch (err: any) {
      console.error("Fetch order error:", err);
      const errorMsg = err.response?.data?.message || "Failed to fetch order details.";
      setError(errorMsg);
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
          
          // Sync location to backend (throttled to at most once every 15 seconds)
          const now = Date.now();
          if (now - lastLocationSyncRef.current >= 15000) {
            lastLocationSyncRef.current = now;
            riderApi.updateLocation({
              orderId: Number(params.orderId),
              latitude,
              longitude,
            }).catch((e) => {
              console.warn("Failed to update rider coordinates:", e);
            });
          }
          
          // Broadcast via socket
          const socket = getSocket(token || "");
          if (socket.connected) {
            socket.emit("rider_location_update", {
              orderId: Number(params.orderId),
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
  }, [isAuthenticated, params.orderId, token]);

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
      const id = Number(params.orderId);
      
      if (nextStatus === "ARRIVED_VENDOR") {
        await riderApi.arrivedVendor(id);
      } else if (nextStatus === "PICKED_UP") {
        await riderApi.pickedUp(id);
      } else if (nextStatus === "ARRIVED_CUSTOMER") {
        await riderApi.arrivedCustomer(id);
      } else if (nextStatus === "DELIVERED") {
        await riderApi.deliverOrder(id, otpInput);
      }
      
      // Await refresh so UI updates to show current status (e.g. Delivery Completed banner)
      await fetchOrderDetails();
      // Do NOT auto-navigate — rider sees the "Delivery Completed" state and taps Back when ready
    } catch (err: any) {
      console.error("Status update error:", err);
      const errorMsg = err.response?.data?.message || "Failed to update order status.";
      alert(errorMsg);
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
    { label: "Accepted", active: ["RIDER_ASSIGNED", "ACCEPTED", "ARRIVED_VENDOR", "PICKED_UP", "ARRIVED_CUSTOMER", "DELIVERED"].includes(order.status) },
    { label: "Arrived Vendor", active: ["ARRIVED_VENDOR", "PICKED_UP", "ARRIVED_CUSTOMER", "DELIVERED"].includes(order.status) },
    { label: "Picked Up", active: ["PICKED_UP", "ARRIVED_CUSTOMER", "DELIVERED"].includes(order.status) },
    { label: "Arrived Customer", active: ["ARRIVED_CUSTOMER", "DELIVERED"].includes(order.status) },
    { label: "Delivered", active: order.status === "DELIVERED" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 max-w-7xl mx-auto h-[calc(100vh-100px)] p-4">
      {/* Map Column - Left side, full height */}
      <div className="lg:col-span-7 h-full flex flex-col justify-between space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/rider-dashboard")}
            className="p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-950 dark:text-white">
              Delivery Tracking
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              Order #{order?.orderNumber}
            </p>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-lg relative">
          {order ? (
            <LeafletMap
              riderPosition={riderCoords}
              vendorPosition={
                order?.vendor?.latitude && order?.vendor?.longitude
                  ? [order.vendor.latitude, order.vendor.longitude]
                  : null
              }
              customerPosition={
                order?.address?.latitude && order?.address?.longitude
                  ? [order.address.latitude, order.address.longitude]
                  : null
              }
              className="w-full h-full absolute inset-0"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
              <div className="text-center space-y-3">
                <Loader className="w-10 h-10 text-gray-400 animate-spin mx-auto" />
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Loading order...
                </p>
              </div>
            </div>
          )}

          {/* Map Info Overlay */}
          <div className="absolute bottom-4 left-4 right-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-xl z-[1000]">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">
                  Target
                </p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                  {["RIDER_ASSIGNED", "ACCEPTED", "ARRIVED_VENDOR"].includes(order?.status || "")
                    ? "🏪 Vendor"
                    : "🏠 Customer"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">
                  Distance
                </p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {distance ? `${distance} km` : "---"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">
                  ETA
                </p>
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-1">
                  {eta ? `${eta} mins` : "---"}
                </p>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className="absolute top-4 left-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-lg z-[999]">
            <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">
              Status
            </p>
            <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
              {order?.status?.replace(/_/g, " ")}
            </p>
          </div>
        </div>
      </div>

      {/* Details Panel - Right side */}
      <div className="lg:col-span-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 h-full overflow-y-auto shadow-lg space-y-6">
        {/* Delivery Stages */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-gray-950 dark:text-white">
            Delivery Progress
          </h2>
          <div className="relative flex items-center justify-between">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-gray-200 dark:bg-gray-800 rounded-full z-0" />
            {[
              { label: "Accepted", status: "ACCEPTED" },
              { label: "At Vendor", status: "ARRIVED_VENDOR" },
              { label: "Picked Up", status: "PICKED_UP" },
              { label: "Arrived", status: "ARRIVED_CUSTOMER" },
              { label: "Delivered", status: "DELIVERED" },
            ].map((step, idx) => {
              const isActive = order
                ? ["RIDER_ASSIGNED", "ACCEPTED", "ARRIVED_VENDOR", "PICKED_UP", "ARRIVED_CUSTOMER", "DELIVERED"].includes(
                    order.status
                  )
                : false;
              // Map RIDER_ASSIGNED to index 1 (same as ACCEPTED)
              const normalizedStatus = order?.status === "RIDER_ASSIGNED" ? "ACCEPTED" : (order?.status || "");
              const stepIndex =
                ["ACCEPTED", "ARRIVED_VENDOR", "PICKED_UP", "ARRIVED_CUSTOMER", "DELIVERED"].indexOf(
                  normalizedStatus
                ) + 1;

              return (
                <div key={idx} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition ${
                      idx < stepIndex
                        ? "bg-red-600 border-red-500 text-white"
                        : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400 mt-1.5 text-center whitespace-nowrap">
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-800 pt-6" />

        {/* Vendor Info */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-950 dark:text-white flex items-center gap-2">
            <Store className="w-4 h-4 text-red-600" />
            Pickup Location
          </h3>
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg p-3 space-y-2">
            <p className="font-bold text-gray-900 dark:text-white text-sm">
              {order?.vendor?.name || "Restaurant"}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {order?.vendor?.address || "Vendor Address"}
            </p>
            {order?.vendor?.phone && (
              <a
                href={`tel:${order.vendor.phone}`}
                className="inline-flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400 hover:underline mt-2"
              >
                <Phone className="w-3.5 h-3.5" />
                {order.vendor.phone}
              </a>
            )}
          </div>
        </div>

        {/* Customer Info */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-950 dark:text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            Delivery Location
          </h3>
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-lg p-3 space-y-2">
            <p className="font-bold text-gray-900 dark:text-white text-sm">
              {order?.customer?.name || "Customer"}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {order?.address?.streetAddress || "Delivery Address"}
            </p>
            {order?.address?.city && (
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {order.address.city}
                {order?.address?.zipCode && `, ${order.address.zipCode}`}
              </p>
            )}
            {order?.customer?.phone && (
              <a
                href={`tel:${order.customer.phone}`}
                className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline mt-2"
              >
                <Phone className="w-3.5 h-3.5" />
                {order.customer.phone}
              </a>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-800 pt-6" />

        {/* Order Items */}
        {order?.items && order.items.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-950 dark:text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              Order Items
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {order.items.map((item, idx) => (
                <div key={idx} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-gray-600 dark:text-gray-400">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white ml-2">
                    ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Price Breakdown */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-950 dark:text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            Order Summary
          </h3>
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2 text-xs">
            {order?.subtotal && (
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Subtotal</span>
                <span>₹{order.subtotal.toLocaleString("en-IN")}</span>
              </div>
            )}
            {order?.taxAmount && order.taxAmount > 0 && (
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Tax</span>
                <span>₹{order.taxAmount.toLocaleString("en-IN")}</span>
              </div>
            )}
            {order?.deliveryFee && order.deliveryFee > 0 && (
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Delivery Fee</span>
                <span>₹{order.deliveryFee.toLocaleString("en-IN")}</span>
              </div>
            )}
            {order?.platformFee && order.platformFee > 0 && (
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>Platform Fee</span>
                <span>₹{order.platformFee.toLocaleString("en-IN")}</span>
              </div>
            )}
            {order?.discountAmount && order.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 dark:text-emerald-300 font-bold">
                <span>Discount</span>
                <span>-₹{order.discountAmount.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between font-bold text-gray-900 dark:text-white">
              <span>Total Amount</span>
              <span className="text-green-600 dark:text-green-400">
                ₹{order?.totalAmount?.toLocaleString("en-IN") || "0"}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-800 pt-6" />

        {/* Action Buttons */}
        <div className="space-y-3">
          {["RIDER_ASSIGNED", "ACCEPTED"].includes(order?.status || "") && (
            <button
              onClick={() => handleUpdateStatus("ARRIVED_VENDOR")}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-lg transition shadow-lg"
            >
              ✓ Arrived at Vendor
            </button>
          )}

          {order?.status === "ARRIVED_VENDOR" && (
            <button
              onClick={() => handleUpdateStatus("PICKED_UP")}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-bold text-sm rounded-lg transition shadow-lg"
            >
              ✓ Order Picked Up
            </button>
          )}

          {order?.status === "PICKED_UP" && (
            <button
              onClick={() => handleUpdateStatus("ARRIVED_CUSTOMER")}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold text-sm rounded-lg transition shadow-lg"
            >
              ✓ Arrived at Customer
            </button>
          )}

          {order?.status === "ARRIVED_CUSTOMER" && (
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter 4-digit OTP"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.slice(0, 4))}
                  maxLength={4}
                  className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white font-bold text-center py-3 rounded-lg placeholder-gray-500 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-lg tracking-widest"
                />
                <ShieldCheck className="w-5 h-5 text-emerald-600 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
              <button
                onClick={() => handleUpdateStatus("DELIVERED")}
                disabled={otpInput.length < 4}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white disabled:text-gray-600 dark:disabled:text-gray-400 font-bold text-sm rounded-lg transition shadow-lg"
              >
                ✓ Confirm Delivery
              </button>
            </div>
          )}

          {order?.status === "DELIVERED" && (
            <div className="w-full py-3 bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 font-bold text-sm rounded-lg text-center border border-green-300 dark:border-green-700">
              ✓ Delivery Completed
            </div>
          )}

          <button
            onClick={() => router.push("/rider-dashboard")}
            className="w-full py-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-sm rounded-lg transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
