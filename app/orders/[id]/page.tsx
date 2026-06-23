"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { loadRazorpayScript, openRazorpayCheckout } from "@/lib/razorpay";
import {
  ChevronLeft,
  Calendar,
  MapPin,
  Truck,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Wallet,
  CreditCard,
  Loader2,
  Zap,
  QrCode,
  ShieldCheck,
  Package,
} from "lucide-react";
import { getSocket } from "@/lib/socket";
import Link from "next/link";

function PaymentStatusBadge({ status }: { status: string }) {
  if (status === "SUCCESS" || status === "PAID") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5" /> Payment Successful
      </span>
    );
  }
  if (status === "FAILED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
        <XCircle className="w-3.5 h-3.5" /> Payment Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-50 text-yellow-700 border border-yellow-200">
      <Clock className="w-3.5 h-3.5" /> Payment Pending
    </span>
  );
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, token, user } = useSelector((state: RootState) => state.auth);
  const [order, setOrder] = useState<any>(null);
  const [tracking, setTracking] = useState<any[]>([]);
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  // Razorpay retry payment state
  const [payingNow, setPayingNow] = useState(false);
  const [payModal, setPayModal] = useState<"idle" | "loading" | "processing" | "success" | "failed">("idle");
  const [payMessage, setPayMessage] = useState("");

  const fetchOrderDetails = async () => {
    try {
      const id = params.id;
      const [orderRes, trackingRes] = await Promise.all([
        api.get(`/api/customer/orders/${id}`),
        api.get(`/api/customer/orders/${id}/tracking`),
      ]);
      const orderData = orderRes.data?.data;
      setOrder(orderData);
      setTracking(trackingRes.data?.data || []);

      // Fetch payment details if a non-COD order
      if (orderData?.paymentMethod && orderData.paymentMethod !== "COD") {
        try {
          const payRes = await api.get(`/api/customer/orders/${id}`);
          // Payment is usually embedded in order or we get it from separate endpoint
          // For now we check payment status from tracking/order data
        } catch {}
      }
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

    const socket = getSocket(token || undefined);
    socket.connect();
    socket.emit("join_order_room", { orderId: Number(params.id), userId: user?.id, role: "CUSTOMER" });

    const onStatus = () => {
      fetchOrderDetails();
    };
    socket.on("order_status_changed", onStatus);
    socket.on("rider_assigned", onStatus);

    return () => {
      socket.off("order_status_changed", onStatus);
      socket.off("rider_assigned");
      socket.disconnect();
    };
  }, [isAuthenticated, params.id, router]);

  const handleCancelOrder = async () => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    setError("");
    setCancelling(true);
    try {
      await api.post(`/api/customer/orders/${order.id}/cancel`);
      await fetchOrderDetails();
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to cancel order.");
    } finally {
      setCancelling(false);
    }
  };

  const handlePayNow = async () => {
    if (!order) return;
    setPayingNow(true);
    setPayModal("loading");
    setPayMessage("Loading payment gateway...");

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setPayModal("failed");
      setPayMessage("Failed to load payment gateway.");
      setPayingNow(false);
      return;
    }

    try {
      setPayMessage("Creating payment session...");
      const initRes = await api.post("/api/customer/payments/initiate", { orderId: order.id });
      const { razorpayOrderId, amount, key } = initRes.data?.data || {};

      setPayModal("processing");
      setPayMessage("Complete payment in the Razorpay window...");

      openRazorpayCheckout({
        key,
        amount: Math.round(parseFloat(amount) * 100),
        currency: "INR",
        name: "Pro-Licious",
        description: `Order #${order.orderNumber} Payment`,
        order_id: razorpayOrderId,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        theme: { color: "#dc2626" },
        handler: async (response) => {
          try {
            setPayModal("loading");
            setPayMessage("Verifying payment...");
            await api.post("/api/customer/payments/verify", {
              orderId: order.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setPayModal("success");
            setPayMessage("Payment verified! Your order is confirmed.");
            fetchOrderDetails();
          } catch (err: any) {
            setPayModal("failed");
            setPayMessage(err.response?.data?.message || "Payment verification failed.");
          } finally {
            setPayingNow(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPayModal("idle");
            setPayingNow(false);
          },
        },
      });
    } catch (err: any) {
      setPayModal("failed");
      setPayMessage(err.response?.data?.message || "Payment failed to start.");
      setPayingNow(false);
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

  const showCancelButton = ["PLACED", "ACCEPTED"].includes(order.status);
  const isUnpaidOnlineOrder =
    order.paymentMethod !== "COD" && !["PAID", "DELIVERED"].includes(order.status);

  // Determine payment status from tracking
  const paymentTracking = tracking.find((t: any) =>
    t.title?.toLowerCase().includes("payment") || t.status === "PAID"
  );
  const isPaid =
    order.status === "DELIVERED" ||
    order.paymentMethod === "COD" ||
    !!paymentTracking;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-sm">
      <Header />

      {/* Payment Modal Overlay */}
      {payModal !== "idle" && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div
              className={`h-1.5 w-full ${
                payModal === "success"
                  ? "bg-gradient-to-r from-emerald-400 to-green-500"
                  : payModal === "failed"
                  ? "bg-gradient-to-r from-red-500 to-rose-600"
                  : "bg-gradient-to-r from-red-500 via-orange-400 to-red-600 animate-pulse"
              }`}
            />
            <div className="p-8 flex flex-col items-center text-center gap-4">
              {payModal === "loading" || payModal === "processing" ? (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-xl shadow-red-200">
                  {payModal === "processing" ? (
                    <QrCode className="w-9 h-9 text-white" />
                  ) : (
                    <Loader2 className="w-9 h-9 text-white animate-spin" />
                  )}
                </div>
              ) : payModal === "success" ? (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-xl shadow-green-200">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-xl shadow-red-200">
                  <AlertCircle className="w-10 h-10 text-white" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-black text-gray-900 mb-1">
                  {payModal === "loading" && "Preparing..."}
                  {payModal === "processing" && "Complete Payment"}
                  {payModal === "success" && "Payment Successful! 🎉"}
                  {payModal === "failed" && "Payment Issue"}
                </h3>
                <p className="text-sm text-gray-500">{payMessage}</p>
              </div>
              {(payModal === "success" || payModal === "failed") && (
                <button
                  onClick={() => setPayModal("idle")}
                  className={`w-full font-bold py-3 rounded-xl transition-all ${
                    payModal === "success"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  }`}
                >
                  {payModal === "success" ? "Great!" : "Close"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Back button & Title */}
          <div className="flex justify-between items-center">
            <Link href="/orders" className="flex items-center text-sm font-medium text-gray-600 hover:text-red-600">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to My Orders
            </Link>
            {showCancelButton && (
              <button
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-bold transition-colors disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : "Cancel Order"}
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {/* ──── PAY NOW BANNER ──── */}
          {isUnpaidOnlineOrder && (
            <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-2xl p-6 text-white shadow-xl shadow-orange-200">
              {/* Background decorative circles */}
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
              <div className="absolute -right-2 -bottom-6 w-20 h-20 bg-white/10 rounded-full" />
              <div className="relative flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                    <Wallet className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-black text-lg">Payment Pending</p>
                    <p className="text-white/80 text-sm">
                      Complete payment of{" "}
                      <span className="font-black">₹{parseFloat(order.totalAmount || 0).toFixed(2)}</span>{" "}
                      via {order.paymentMethod}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handlePayNow}
                  disabled={payingNow}
                  className="flex items-center gap-2 bg-white text-orange-600 font-black px-6 py-3 rounded-xl shadow-md hover:bg-orange-50 transition-all disabled:opacity-60 flex-shrink-0"
                >
                  {payingNow ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  Pay Now
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Card Header */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
                <div className="flex justify-between items-start flex-wrap gap-4 border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-2xl font-extrabold text-gray-900">
                      Order #{order.orderNumber}
                    </h2>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Placed on {new Date(order.createdAt).toLocaleDateString()} at{" "}
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                {/* Items */}
                <div className="space-y-3">
                  <h3 className="font-bold text-gray-900 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-red-600" /> Items Ordered
                  </h3>
                  <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden">
                    {order.items?.map((item: any) => (
                      <div key={item.id} className="py-3 px-4 flex justify-between items-center hover:bg-gray-50">
                        <div>
                          <p className="font-bold text-gray-900">{item.itemName || item.name || "Item"}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            ₹{parseFloat(item.price).toFixed(0)} × {item.quantity}
                          </p>
                        </div>
                        <span className="font-extrabold text-gray-900">
                          ₹{parseFloat(item.total).toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-2.5 text-xs text-gray-600 font-medium bg-gray-50 rounded-xl p-4">
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
                    <span className="font-bold text-gray-900">₹{parseFloat(order.taxAmount).toFixed(2)}</span>
                  </div>
                  {parseFloat(order.platformFee || 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Platform Fee</span>
                      <span className="font-bold text-gray-900">₹{parseFloat(order.platformFee).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2.5 flex justify-between text-base font-extrabold text-gray-900">
                    <span>Grand Total</span>
                    <span className="text-red-600">₹{parseFloat(order.totalAmount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment & Logistics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Delivery Address */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                  <h3 className="font-bold text-gray-900 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-red-600" /> Delivery Address
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">
                    Address ID #{order.addressId}
                  </p>
                </div>

                {/* Payment Info */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                  <h3 className="font-bold text-gray-900 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-red-600" /> Payment Info
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Method</span>
                      <span className="font-bold text-gray-900 flex items-center gap-1">
                        {order.paymentMethod === "UPI" && <Wallet className="w-3 h-3" />}
                        {order.paymentMethod === "CARD" && <CreditCard className="w-3 h-3" />}
                        {order.paymentMethod === "COD" && <Truck className="w-3 h-3" />}
                        {order.paymentMethod || "COD"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 font-medium">Status</span>
                      <PaymentStatusBadge
                        status={
                          order.paymentMethod === "COD"
                            ? "COD"
                            : isPaid
                            ? "SUCCESS"
                            : "PENDING"
                        }
                      />
                    </div>
                    {order.riderId && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-medium">Rider</span>
                        <span className="font-bold text-gray-900 flex items-center gap-1">
                          <Truck className="w-3 h-3" /> Rider #{order.riderId}
                        </span>
                      </div>
                    )}
                  </div>

                  {order.paymentMethod === "COD" && (
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg font-medium border border-emerald-100">
                      <ShieldCheck className="w-3 h-3" /> Pay when delivered
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Live Tracking */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-md space-y-6 lg:sticky lg:top-28">
              <h3 className="font-bold text-gray-900 text-lg border-b border-gray-100 pb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-red-600" /> Live Tracking
              </h3>

              {tracking.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">Waiting for updates...</p>
                  <p className="text-xs mt-1">Tracking events will appear here</p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-6">
                  <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200"></div>

                  {tracking.map((event: any, i: number) => {
                    const isNewest = i === 0;
                    const isPayment =
                      event.title?.toLowerCase().includes("payment") ||
                      event.status === "PAID";
                    return (
                      <div key={event.id} className="relative z-10 flex gap-4">
                        <div
                          className={`absolute -left-[22px] top-1.5 w-3 h-3 rounded-full border-2 ${
                            isNewest
                              ? isPayment
                                ? "border-emerald-500 bg-emerald-500"
                                : "border-red-600 bg-red-600 ring-2 ring-red-100"
                              : "border-gray-400 bg-white"
                          }`}
                        ></div>

                        <div className="flex-1">
                          <p
                            className={`font-bold ${
                              isNewest ? "text-gray-900 text-sm" : "text-gray-500 text-xs"
                            }`}
                          >
                            {event.title}
                          </p>
                          {event.description && (
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                              {event.description}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-400 mt-1 font-mono">
                            {new Date(event.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
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
