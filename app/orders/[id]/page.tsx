"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { ChevronLeft, Calendar, MapPin, Truck, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [order, setOrder] = useState<any>(null);
  const [tracking, setTracking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-sm">
      <Header />
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Column: Order details, payment, delivery info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Card Header */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex justify-between items-start flex-wrap gap-4 border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-2xl font-extrabold text-gray-900">Order #{order.orderNumber}</h2>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Placed on {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </div>

                {/* Items */}
                <div className="space-y-4">
                  <h3 className="font-bold text-gray-900">Items Ordered</h3>
                  <div className="divide-y divide-gray-100 border-t border-b border-gray-100">
                    {order.items?.map((item: any) => (
                      <div key={item.id} className="py-4 flex justify-between items-center">
                        <div>
                          <p className="font-bold text-gray-900">{item.itemName || "Item"}</p>
                          <p className="text-xs text-gray-500 mt-0.5">₹{parseFloat(item.price).toFixed(0)} × {item.quantity}</p>
                        </div>
                        <span className="font-extrabold text-gray-900">₹{parseFloat(item.total).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-2.5 text-xs text-gray-600 font-medium">
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
                  <div className="flex justify-between">
                    <span>Platform Fee</span>
                    <span className="font-bold text-gray-900">₹{parseFloat(order.platformFee || 0).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-100 pt-3 flex justify-between text-base font-extrabold text-gray-900">
                    <span>Total Amount Paid</span>
                    <span className="text-red-600">₹{parseFloat(order.totalAmount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Delivery and Payment Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <h3 className="font-bold text-gray-900 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-red-600" /> Delivery Address</h3>
                  <p className="text-xs text-gray-600 font-medium leading-relaxed">
                    Customer Address Details (ID: #{order.addressId})<br />
                    Select address from profile or checkout.
                  </p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <h3 className="font-bold text-gray-900 flex items-center gap-1.5"><Truck className="w-4 h-4 text-red-600" /> Payment & Logistics</h3>
                  <div className="space-y-1.5 text-xs text-gray-600">
                    <p><span className="font-bold text-gray-500">Method:</span> <span className="font-bold text-gray-900">{order.paymentMethod || "COD"}</span></p>
                    <p><span className="font-bold text-gray-500">Rider Assigned:</span> <span className="font-bold text-gray-900">{order.riderId ? `Rider #${order.riderId}` : "Not Assigned"}</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Tracking Timeline */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-md space-y-6">
              <h3 className="font-bold text-gray-900 text-lg border-b border-gray-100 pb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-red-600" /> Live Tracking
              </h3>

              {tracking.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  No tracking events recorded yet.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6">
                  {/* Timeline bar */}
                  <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200"></div>

                  {tracking.map((event: any, i: number) => {
                    const isNewest = i === 0;
                    return (
                      <div key={event.id} className="relative z-10 flex gap-4">
                        {/* Dot indicator */}
                        <div className={`absolute -left-[22px] top-1.5 w-3 h-3 rounded-full border-2 bg-white ${
                          isNewest ? 'border-red-600 ring-2 ring-red-100 bg-red-600' : 'border-gray-400'
                        }`}></div>

                        <div className="flex-1">
                          <p className={`font-bold ${isNewest ? 'text-gray-900 text-sm' : 'text-gray-500 text-xs'}`}>
                            {event.title}
                          </p>
                          {event.description && (
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                              {event.description}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-400 mt-1 font-mono">
                            {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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
