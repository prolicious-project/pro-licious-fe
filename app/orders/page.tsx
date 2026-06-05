"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { FileText, Calendar, ArrowRight, ShoppingBag } from "lucide-react";
import Link from "next/link";

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    api.get("/api/customer/orders")
      .then(res => {
        setOrders(res.data?.data || []);
      })
      .catch(err => {
        console.error("Error fetching customer orders:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isAuthenticated, router]);

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
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-8">My Orders</h1>

          {orders.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm flex flex-col items-center">
              <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-6">
                <FileText className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">No orders placed yet</h2>
              <p className="text-gray-500 mb-8 max-w-sm">You haven't placed any orders with Pro-Licious. Buy fresh meat from standard vendors now!</p>
              <Link href="/" className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition-colors">
                Explore Vendors
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-extrabold text-red-600 text-base">#{order.orderNumber}</span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <ShoppingBag className="w-3.5 h-3.5" /> Vendor #{order.vendorId}
                      </span>
                      <span>•</span>
                      <span className="font-bold text-gray-900">Total: ₹{parseFloat(order.totalAmount).toFixed(0)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Link href={`/orders/${order.id}`} className="px-5 py-2.5 bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-700 rounded-xl font-bold border border-gray-100 hover:border-red-100 transition-colors flex items-center gap-1">
                      Track Order <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
