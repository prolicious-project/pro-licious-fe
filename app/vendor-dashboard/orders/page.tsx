"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { X, ShoppingBag, MapPin, Calendar, Clock } from "lucide-react";
import VendorSidebar from "@/components/VendorSidebar";
import OrderStatusBadge from "@/components/OrderStatusBadge";

export default function VendorOrdersPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const STATUS_TABS = ["ALL", "PLACED", "ACCEPTED", "PREPARING", "READY", "DELIVERED", "CANCELLED"];

  const fetchOrders = async (status: string) => {
    try {
      setLoading(true);
      const params = status !== "ALL" ? { status } : {};
      const res = await api.get("/api/vendor/orders", { params });
      setOrders(res.data?.data || []);
    } catch (err) {
      console.error("Error fetching vendor orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) { router.push("/login"); return; }
    fetchOrders(selectedStatus);
  }, [isAuthenticated, selectedStatus, router]);

  const handleOrderAction = async (e: React.MouseEvent, orderId: number, action: string) => {
    e.stopPropagation(); // prevent modal trigger
    try {
      setLoading(true);
      await api.patch(`/api/vendor/orders/${orderId}/${action}`);
      await fetchOrders(selectedStatus);
      if (selectedOrder && selectedOrder.id === orderId) {
        // Refresh detail panel too if open
        await handleViewDetail(orderId);
      }
    } catch (err) {
      console.error(`Error performing action ${action}:`, err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (orderId: number) => {
    try {
      setDetailLoading(true);
      const res = await api.get(`/api/vendor/orders/${orderId}`);
      setSelectedOrder(res.data?.data);
    } catch (e) {
      console.error("Error fetching order details:", e);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-sm">
      {/* Sidebar */}
      <VendorSidebar />

      {/* Main */}
      <main className="flex-grow flex flex-col overflow-hidden bg-white">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-900">Manage Orders</h2>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-bold text-gray-900 text-sm">{user?.name || "Vendor"}</p>
              <p className="text-xs text-yellow-500 font-bold font-mono">VENDOR</p>
            </div>
            <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold shadow-sm">
              {user?.name?.[0] || "V"}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col p-8 space-y-6">
          {/* Status Tabs */}
          <div className="flex border-b border-gray-100 overflow-x-auto pb-px flex-shrink-0 gap-2">
            {STATUS_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setSelectedStatus(tab)}
                className={`px-4 py-3 font-bold border-b-2 transition-all text-xs tracking-wider uppercase whitespace-nowrap ${
                  selectedStatus === tab
                    ? "border-red-600 text-red-600"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Orders Table Container */}
          <div className="flex-grow overflow-y-auto border border-gray-100 rounded-2xl shadow-sm bg-white">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-20 text-gray-400 flex flex-col items-center justify-center">
                <ShoppingBag className="w-12 h-12 mb-3 text-gray-300" />
                <p className="text-sm font-medium">No orders found in this category.</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 bg-gray-50 uppercase font-bold border-b border-gray-100 sticky top-0">
                  <tr>
                    <th className="px-6 py-4">Order #</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Payment</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => handleViewDetail(order.id)}
                      className="border-b border-gray-50 hover:bg-gray-50/80 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 font-bold text-red-600">{order.orderNumber}</td>
                      <td className="px-6 py-4 font-bold text-gray-900">{order.customerName || "Customer"}</td>
                      <td className="px-6 py-4 font-bold text-gray-900">₹{parseFloat(order.totalAmount).toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-4 text-gray-500">{order.paymentMethod || "N/A"}</td>
                      <td className="px-6 py-4 flex gap-2">
                        {order.status === "PLACED" && (
                          <>
                            <button onClick={(e) => handleOrderAction(e, order.id, "accept")} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-xs shadow-sm">
                              Accept
                            </button>
                            <button onClick={(e) => handleOrderAction(e, order.id, "reject")} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs shadow-sm">
                              Reject
                            </button>
                          </>
                        )}
                        {order.status === "ACCEPTED" && (
                          <button onClick={(e) => handleOrderAction(e, order.id, "preparing")} className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded font-bold text-xs shadow-sm">
                            Start Cooking
                          </button>
                        )}
                        {order.status === "PREPARING" && (
                          <button onClick={(e) => handleOrderAction(e, order.id, "ready")} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded font-bold text-xs shadow-sm">
                            Mark Ready
                          </button>
                        )}
                        {!["PLACED", "ACCEPTED", "PREPARING"].includes(order.status) && (
                          <span className="text-gray-400 font-medium text-xs">No Action</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Order Detail Modal / Sidebar Panel */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slide-left p-6">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
              <div>
                <h3 className="font-extrabold text-xl text-gray-900">Order details</h3>
                <p className="text-xs font-bold text-red-600 mt-1">#{selectedOrder.orderNumber}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-600 border-t-transparent"></div>
              </div>
            ) : (
              <div className="flex-grow overflow-y-auto space-y-6 text-sm">
                
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Status</span>
                    <div className="mt-1"><OrderStatusBadge status={selectedOrder.status} /></div>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Payment Method</span>
                    <span className="font-bold text-gray-900 mt-1 block uppercase">{selectedOrder.paymentMethod || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Order Date</span>
                    <span className="font-bold text-gray-900 mt-1 block flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" /> {new Date(selectedOrder.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Rider ID</span>
                    <span className="font-bold text-gray-900 mt-1 block flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" /> {selectedOrder.riderId ? `#${selectedOrder.riderId}` : "None"}
                    </span>
                  </div>
                </div>

                {/* Address details */}
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-900">Delivery Address</h4>
                  <div className="flex gap-2 items-start text-xs text-gray-600 bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                    <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <p>Address ID: #{selectedOrder.addressId}</p>
                  </div>
                </div>

                {/* Items list */}
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-900">Items ({selectedOrder.items?.length || 0})</h4>
                  <div className="divide-y divide-gray-100 border-t border-b border-gray-100">
                    {selectedOrder.items?.map((item: any) => (
                      <div key={item.id} className="py-3 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-gray-900">{item.itemName || "Item"}</p>
                          <p className="text-gray-500 mt-0.5">₹{parseFloat(item.price).toFixed(0)} × {item.quantity}</p>
                        </div>
                        <span className="font-bold text-gray-900">₹{parseFloat(item.total).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="space-y-2 border-b border-gray-100 pb-4 text-xs text-gray-500 font-medium">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-bold text-gray-900">₹{parseFloat(selectedOrder.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span className="font-bold text-gray-900">₹{parseFloat(selectedOrder.deliveryFee).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GST (5%)</span>
                    <span className="font-bold text-gray-900">₹{parseFloat(selectedOrder.taxAmount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-extrabold text-gray-900 pt-2 border-t border-gray-100 border-dashed">
                    <span>Total Amount</span>
                    <span className="text-red-600">₹{parseFloat(selectedOrder.totalAmount).toFixed(2)}</span>
                  </div>
                </div>

                {/* Modal footer action */}
                <div className="pt-4 flex gap-3">
                  {selectedOrder.status === "PLACED" && (
                    <>
                      <button onClick={(e) => handleOrderAction(e, selectedOrder.id, "accept")} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors">
                        Accept Order
                      </button>
                      <button onClick={(e) => handleOrderAction(e, selectedOrder.id, "reject")} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors">
                        Reject Order
                      </button>
                    </>
                  )}
                  {selectedOrder.status === "ACCEPTED" && (
                    <button onClick={(e) => handleOrderAction(e, selectedOrder.id, "preparing")} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors">
                      Start Cooking
                    </button>
                  )}
                  {selectedOrder.status === "PREPARING" && (
                    <button onClick={(e) => handleOrderAction(e, selectedOrder.id, "ready")} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors">
                      Mark Ready
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
