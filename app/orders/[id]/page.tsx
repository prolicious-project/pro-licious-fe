"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { getSocket } from "@/lib/socket";
import dynamic from "next/dynamic";
import {
  ChevronLeft,
  Calendar,
  MapPin,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Phone,
  MessageCircle,
  X,
  Send,
  Package,
  Utensils,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";

const TrackingMap = dynamic(() => import("@/components/TrackingMap"), { ssr: false });

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, user, token } = useSelector((state: RootState) => state.auth);
  const [order, setOrder] = useState<any>(null);
  const [tracking, setTracking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [liveRiderCoords, setLiveRiderCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Real-time Chat states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchOrderDetails = async () => {
    try {
      const id = params.id;
      const [orderRes, trackingRes] = await Promise.all([
        api.get(`/api/customer/orders/${id}`),
        api.get(`/api/customer/orders/${id}/tracking`),
      ]);
      setOrder(orderRes.data?.data);
      setTracking(trackingRes.data?.data || []);
    } catch (e) {
      console.error("Error fetching order details:", e);
      setError("Could not load order details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchOrderDetails();
  }, [isAuthenticated, params.id, router]);

  // Synchronize WebSocket for tracking, status, and messaging
  useEffect(() => {
    if (!isAuthenticated || !order) return;

    const socket = getSocket(token || undefined);
    socket.connect();
    
    // Join the order room
    socket.emit("join_order_room", {
      orderId: order.id,
      userId: order.customerId,
      role: "CUSTOMER"
    });

    // Listen for coordinate updates from the rider
    socket.on("rider_location", (data: { riderId: number; latitude: number; longitude: number }) => {
      setLiveRiderCoords({ lat: data.latitude, lng: data.longitude });
    });

    // Listen for order status updates
    socket.on("order_status_changed", () => {
      fetchOrderDetails();
    });

    // Listen for new chat messages
    socket.on("new_message", (data: any) => {
      setChatMessages((prev) => {
        if (prev.find((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
    });

    return () => {
      socket.off("rider_location");
      socket.off("order_status_changed");
      socket.off("new_message");
    };
  }, [isAuthenticated, order, token]);

  // Scroll chat to bottom
  useEffect(() => {
    if (isChatOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatOpen]);

  const handleCancelOrder = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    setError("");
    setCancelling(true);
    try {
      await api.post(`/api/customer/orders/${order.id}/cancel`);
      await fetchOrderDetails();
    } catch (e: any) {
      console.error("Error cancelling order:", e);
      setError(e.response?.data?.message || "Failed to cancel order.");
    } finally {
      setCancelling(false);
    }
  };

  const openChat = async () => {
    if (!order) return;
    try {
      const res = await api.get(`/api/customer/orders/${order.id}/messages`);
      setChatMessages(res.data?.data || []);
      setIsChatOpen(true);
    } catch (e) {
      console.error("Error loading chat messages:", e);
    }
  };

  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !order) return;
    try {
      const socket = getSocket(token || undefined);
      socket.emit("send_message", {
        orderId: order.id,
        senderId: user?.id || 1,
        message: chatInput.trim()
      });
      setChatInput("");
    } catch (err) {
      console.error("Error sending chat:", err);
    }
  };

  // Helper mappings for active order stages
  const getStepIndex = (status: string) => {
    switch (status) {
      case "PLACED":
      case "PAID":
      case "ACCEPTED":
        return 0;
      case "PREPARING":
      case "READY":
        return 1;
      case "RIDER_ASSIGNED":
      case "ARRIVED_VENDOR":
      case "PICKED_UP":
      case "ARRIVED_CUSTOMER":
        return 2;
      case "DELIVERED":
        return 3;
      default:
        return 0;
    }
  };

  const getEstimatedTime = (status: string) => {
    switch (status) {
      case "PLACED":
      case "PAID":
      case "ACCEPTED":
        return "35-45 mins";
      case "PREPARING":
      case "READY":
        return "25-30 mins";
      case "RIDER_ASSIGNED":
      case "ARRIVED_VENDOR":
        return "15-20 mins";
      case "PICKED_UP":
        return "10-15 mins";
      case "ARRIVED_CUSTOMER":
        return "Arriving now! 🛵";
      default:
        return "--";
    }
  };

  const getStatusSubtitle = (status: string) => {
    switch (status) {
      case "PLACED":
      case "PAID":
        return "Waiting for store confirmation...";
      case "ACCEPTED":
        return "Store accepted your order! Kitchen preparation starting.";
      case "PREPARING":
        return "The vendor is preparing your fresh meal.";
      case "READY":
        return "Your food is ready and packed! Assigning courier.";
      case "RIDER_ASSIGNED":
        return "Rider partner accepted your order! Driving to store.";
      case "ARRIVED_VENDOR":
        return "Rider partner is collecting your order from the store.";
      case "PICKED_UP":
        return "Out for delivery! Rider is heading to your address.";
      case "ARRIVED_CUSTOMER":
        return "Rider partner has arrived outside! Share your delivery OTP.";
      default:
        return "Processing your order...";
    }
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

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex-grow flex flex-col items-center justify-center py-20">
          <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h2>
          <Link href="/orders" className="text-red-600 font-bold hover:underline">
            Go back to My Orders
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const isOrderActive = !["DELIVERED", "CANCELLED"].includes(order.status);
  const showCancelButton = ["PLACED", "ACCEPTED"].includes(order.status);
  const currentStep = getStepIndex(order.status);
  const hasRider = !!order.riderId;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-sm font-sans">
      <Header />
      <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Back button & Action Row */}
          <div className="flex justify-between items-center">
            <Link href="/orders" className="flex items-center text-sm font-bold text-gray-650 hover:text-red-600">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to My Orders
            </Link>
            {showCancelButton && (
              <button
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-650 border border-red-200 rounded-lg font-bold transition-all disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : "Cancel Order"}
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl font-semibold">
              {error}
            </div>
          )}

          {/* Grid Layout: Invoice Left, Live Tracking Right */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Left Column: Invoice & Billing Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Main Order Details Card */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex justify-between items-start flex-wrap gap-4 border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Order #{order.orderNumber}</h2>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1 font-semibold">
                      <Calendar className="w-3.5 h-3.5" /> Placed on {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                {/* Items List */}
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900 text-sm">Items Ordered</h3>
                  <div className="divide-y divide-gray-100 border-t border-b border-gray-100">
                    {order.items?.map((item: any) => (
                      <div key={item.id} className="py-4 flex justify-between items-center font-medium">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{item.itemName || "Item"}</p>
                          <p className="text-xs text-gray-500 mt-0.5">₹{parseFloat(item.price).toFixed(0)} × {item.quantity}</p>
                        </div>
                        <span className="font-extrabold text-gray-900">₹{parseFloat(item.total).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Billing Summary Totals */}
                <div className="space-y-2.5 text-xs text-gray-600 font-semibold">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-bold text-gray-900">₹{parseFloat(order.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span className="font-bold text-gray-900">₹{parseFloat(order.deliveryFee).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (5%)</span>
                    <span className="font-bold text-gray-950">₹{parseFloat(order.taxAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform Fee</span>
                    <span className="font-bold text-gray-950">₹{parseFloat(order.platformFee || 0).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-100 pt-3 flex justify-between text-base font-black text-gray-950">
                    <span>Total Amount Paid</span>
                    <span className="text-red-600 font-extrabold">₹{parseFloat(order.totalAmount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Delivery and Payment details row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-gray-950 flex items-center gap-1.5 text-sm"><MapPin className="w-4 h-4 text-red-600" /> Delivery Address</h3>
                  <p className="text-xs text-gray-600 font-semibold leading-relaxed">
                    {order.address
                      ? `${order.address.houseNumber || ""}, ${order.address.street || ""}, ${order.address.city || ""}, ${order.address.pincode || ""}`
                      : "No address specified."}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                  <h3 className="font-bold text-gray-955 flex items-center gap-1.5 text-sm"><Truck className="w-4 h-4 text-red-600" /> Payment & Logistics</h3>
                  <div className="space-y-1.5 text-xs text-gray-650 font-semibold">
                    <p><span className="font-bold text-gray-400">Method:</span> <span className="text-gray-900">{order.paymentMethod || "COD"}</span></p>
                    <p><span className="font-bold text-gray-400">Rider:</span> <span className="text-gray-900">{order.rider?.name ? `${order.rider.name} (${order.rider.phone})` : "Not Assigned"}</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Zomato-style Real-time Tracking Box (Short Map View) */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-md space-y-5 flex flex-col">
              
              <h3 className="font-extrabold text-gray-900 text-base border-b border-gray-100 pb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-600" /> Live Delivery Tracking
              </h3>

              {isOrderActive ? (
                <>
                  {/* Short Map Container */}
                  {(() => {
                    const startLat = order.branch?.latitude ? parseFloat(order.branch.latitude) : 17.4483;
                    const startLng = order.branch?.longitude ? parseFloat(order.branch.longitude) : 78.3488;
                    const endLat = order.address?.latitude ? parseFloat(order.address.latitude) : 17.4325;
                    const endLng = order.address?.longitude ? parseFloat(order.address.longitude) : 78.4071;

                    const riderCurrentLat = liveRiderCoords?.lat ?? startLat;
                    const riderCurrentLng = liveRiderCoords?.lng ?? startLng;

                    const mapNode = {
                      orderId: order.id,
                      orderNumber: order.orderNumber,
                      riderName: order.rider?.name || "Rider Partner",
                      riderPhone: order.rider?.phone || "N/A",
                      vendorName: order.branch?.branchName || "Store Merchant",
                      customerName: "You",
                      status: order.status,
                      progress: (currentStep + 1) * 25,
                      start: { lat: startLat, lng: startLng },
                      end: { lat: endLat, lng: endLng },
                      current: { lat: riderCurrentLat, lng: riderCurrentLng }
                    };

                    return (
                      <div className="w-full h-[320px] rounded-2xl overflow-hidden shadow-inner border border-gray-200 relative z-0 flex-shrink-0">
                        <TrackingMap nodes={[mapNode]} trackedOrderId={order.id} />
                      </div>
                    );
                  })()}

                  {/* Real-time Tracking Info */}
                  <div className="space-y-4">
                    {/* ETA Block */}
                    <div className="bg-gradient-to-r from-red-50 to-pink-50/20 p-4 rounded-xl border border-red-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[9px] uppercase font-bold tracking-wider text-red-500">Estimated Arrival</span>
                          <h4 className="text-2xl font-black text-gray-900 tracking-tight mt-0.5">{getEstimatedTime(order.status)}</h4>
                        </div>
                        <span className="text-xl animate-pulse">🛵</span>
                      </div>
                      <p className="text-xs font-bold text-gray-700 mt-2 flex items-center gap-1.5 leading-normal">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-650 animate-ping"></span>
                        {getStatusSubtitle(order.status)}
                      </p>
                    </div>

                    {/* Progress Stepper (Horizontal Compact) */}
                    <div className="relative py-2.5 px-1 bg-gray-50/40 rounded-xl border border-gray-100">
                      <div className="flex justify-between items-center relative">
                        {/* Connecting Line Background */}
                        <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-1 bg-gray-200/60 z-0"></div>
                        {/* Active Progress Line */}
                        <div 
                          className="absolute left-4 top-1/2 -translate-y-1/2 h-1 bg-green-500 transition-all duration-700 ease-out z-0"
                          style={{ 
                            width: `${currentStep === 0 ? "0%" : currentStep === 1 ? "33%" : currentStep === 2 ? "66%" : "100%"}`,
                            right: "auto"
                          }}
                        ></div>

                        {[
                          { label: "Placed", icon: Package },
                          { label: "Preparing", icon: Utensils },
                          { label: "Delivery", icon: Truck },
                          { label: "Delivered", icon: CheckCircle2 }
                        ].map((step, idx) => {
                          const StepIcon = step.icon;
                          const isCompleted = idx < currentStep;
                          const isActive = idx === currentStep;

                          return (
                            <div key={idx} className="flex flex-col items-center relative z-10">
                              <div 
                                className={`w-8 h-8 rounded-full flex items-center justify-center shadow-xs border transition-all duration-350 ${
                                  isCompleted ? "bg-green-500 border-green-500 text-white" :
                                  isActive ? "bg-red-600 border-red-650 text-white ring-4 ring-red-100" :
                                  "bg-white border-gray-200 text-gray-400"
                                }`}
                              >
                                <StepIcon className="w-3.5 h-3.5" />
                              </div>
                              <span className={`text-[9px] font-extrabold mt-1.5 ${
                                isCompleted ? "text-green-600" :
                                isActive ? "text-red-600" :
                                "text-gray-400"
                              }`}>
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Delivery OTP Security display */}
                    {order.deliveryOtp && order.status === "ARRIVED_CUSTOMER" && (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 flex items-center gap-3 shadow-xs">
                        <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        <div>
                          <span className="text-[9px] uppercase font-bold text-emerald-600 tracking-wider">Delivery Verification OTP</span>
                          <h4 className="text-lg font-black text-emerald-800 tracking-widest mt-0.5">{order.deliveryOtp}</h4>
                          <p className="text-[9px] text-emerald-600 mt-0.5">Please share this OTP with the rider upon arrival.</p>
                        </div>
                      </div>
                    )}

                    {/* Rider Information Panel */}
                    <div className="bg-white border border-gray-200 shadow-xs p-3.5 rounded-xl flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">🛵</span>
                          <div>
                            <h5 className="font-extrabold text-gray-900 text-xs">{order.rider?.name || "Assigning Rider..."}</h5>
                            <p className="text-[10px] text-gray-500 font-medium">
                              {hasRider ? "Zomato Partner" : "Locating delivery partner in Hyderabad"}
                            </p>
                          </div>
                        </div>
                        {hasRider && (
                          <span className="bg-red-50 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-lg border border-red-100">
                            ⭐ 4.8
                          </span>
                        )}
                      </div>

                      {hasRider && (
                        <div className="flex gap-2">
                          <a 
                            href={`tel:${order.rider?.phone || "9999999999"}`}
                            className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg font-bold text-[11px] text-gray-800 flex items-center justify-center gap-1 shadow-sm transition-all"
                          >
                            <Phone className="w-3 h-3" /> Call Rider
                          </a>
                          <button 
                            onClick={openChat}
                            className="flex-1 py-2 bg-red-650 hover:bg-red-700 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 shadow-md transition-all"
                          >
                            <MessageCircle className="w-3 h-3 animate-pulse" /> Chat with Rider
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                </>
              ) : (
                <div className="bg-zinc-50 border border-zinc-200 py-10 rounded-xl text-center text-gray-400 font-medium flex flex-col items-center justify-center gap-1 text-xs">
                  <span>🗺️</span>
                  <p className="text-zinc-700 font-bold">No Active Tracking</p>
                  <p className="text-[10px] text-zinc-400 max-w-[200px]">Live maps and couriers are displayed only for active deliveries.</p>
                </div>
              )}

              {/* Event Timeline Logs list (Always displayed at bottom of tracking column) */}
              <div className="space-y-4 pt-2">
                <h4 className="font-bold text-gray-900 text-xs flex items-center gap-1.5 border-t border-gray-100 pt-4">
                  📋 Status History Timeline
                </h4>
                {tracking.length === 0 ? (
                  <p className="text-gray-400 italic text-[11px]">No status logs.</p>
                ) : (
                  <div className="relative pl-4 space-y-4">
                    <div className="absolute left-1.5 top-1 bottom-1 w-0.5 bg-gray-200"></div>
                    {tracking.map((event: any, i: number) => (
                      <div key={event.id} className="relative z-10 flex gap-2">
                        <div className={`absolute -left-[18px] top-1.5 w-2 h-2 rounded-full border bg-white ${
                          i === 0 ? 'border-red-500 bg-red-500 scale-110' : 'border-gray-400'
                        }`}></div>
                        <div className="flex-grow">
                          <p className={`font-bold text-xs ${i === 0 ? 'text-gray-900' : 'text-gray-500'}`}>{event.title}</p>
                          {event.description && <p className="text-[10px] text-gray-400 mt-0.5 leading-normal">{event.description}</p>}
                          <p className="text-[9px] text-gray-400 font-mono mt-0.5">
                            {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      </main>
      <Footer />

      {/* Real-time Customer-Rider Chat Overlay Modal */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end md:items-center md:justify-center p-0 md:p-4">
          <div className="bg-white w-full md:max-w-md h-[80vh] md:h-[600px] rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="p-5 bg-red-600 text-white flex justify-between items-center flex-shrink-0 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">🛵</div>
                <div>
                  <h4 className="font-extrabold text-sm">{order.rider?.name || "Rider Partner"}</h4>
                  <p className="text-[10px] text-red-200 font-bold uppercase tracking-wider mt-0.5">Active Delivery Chat</p>
                </div>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-full text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Message list */}
            <div className="flex-grow p-4 overflow-y-auto bg-zinc-50 flex flex-col gap-3">
              {chatMessages.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-xs flex flex-col items-center justify-center gap-2 my-auto">
                  <span className="text-3xl">💬</span>
                  <p className="font-extrabold text-zinc-700">No messages yet</p>
                  <p className="text-[10px] text-zinc-400 max-w-[220px]">Send a message to coordinate the delivery location or directions!</p>
                </div>
              ) : (
                chatMessages.map((msg: any) => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div 
                      key={msg.id}
                      className={`flex flex-col max-w-[75%] ${isMe ? "self-end items-end" : "self-start items-start"}`}
                    >
                      <div className={`px-4 py-2.5 rounded-2xl text-xs font-semibold leading-relaxed shadow-xs ${
                        isMe 
                          ? "bg-red-650 text-white rounded-tr-none" 
                          : "bg-white text-zinc-800 border border-zinc-200 rounded-tl-none"
                      }`}>
                        {msg.message}
                      </div>
                      <span className="text-[8px] text-gray-400 mt-1 font-mono">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Field */}
            <form onSubmit={sendChatMessage} className="p-4 bg-white border-t border-gray-150 flex gap-2.5 items-center flex-shrink-0">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type directions, landmarks or hello..."
                className="flex-grow bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all font-medium"
              />
              <button 
                type="submit"
                disabled={!chatInput.trim()}
                className="bg-red-650 hover:bg-red-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex-shrink-0 flex items-center gap-1"
              >
                Send <Send className="w-3 h-3" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
