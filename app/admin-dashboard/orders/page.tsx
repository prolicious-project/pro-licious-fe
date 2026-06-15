"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { X, Calendar, ShoppingBag, MapPin, Search } from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import OrderStatusBadge from "@/components/OrderStatusBadge";

export default function AdminOrdersPage() {
  const router = useRouter();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const STATUS_TABS = ["ALL", "PLACED", "ACCEPTED", "PREPARING", "READY", "DELIVERED", "CANCELLED"];

  const fetchOrders = async (status: string) => {
    try {
      setLoading(true);
      const params = status !== "ALL" ? { status } : {};
      const res = await api.get("/api/admin/orders", { params });
      setOrders(res.data?.data || []);
    } catch (e) {
      console.error("Error fetching admin orders list:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) { router.push("/login"); return; }
    fetchOrders(selectedStatus);
  }, [isAuthenticated, selectedStatus, router]);

  const handleViewDetail = async (orderId: number) => {
    try {
      setDetailLoading(true);
      const res = await api.get(`/api/admin/orders/${orderId}`);
      setSelectedOrder(res.data?.data);
    } catch (e) {
      console.error("Error fetching admin order details:", e);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!confirm("Force cancel this order?")) return;
    try {
      setLoading(true);
      await api.patch(`/api/vendor/orders/${orderId}/reject`); // use standard reject/cancel trigger
      await fetchOrders(selectedStatus);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(null);
      }
    } catch (e) {
      console.error("Error force cancelling order:", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => 
    o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(o.customerId).includes(searchQuery) ||
    String(o.vendorId).includes(searchQuery) ||
    (o.riderId && String(o.riderId).includes(searchQuery))
  );

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden text-sm">
      <AdminSidebar />

      {/* Main */}
      <main className="flex-grow flex flex-col overflow-hidden bg-white">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-red-600" /> Platform Orders
          </h2>
          <div className="flex items-center border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50/50">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search Order # or ID..."
              className="bg-transparent border-none outline-none text-xs w-48 text-gray-700"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
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

          {/* Table Container */}
          <div className="flex-grow overflow-y-auto border border-gray-100 rounded-2xl shadow-sm bg-white">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-20 text-gray-400 flex flex-col items-center justify-center">
                <ShoppingBag className="w-12 h-12 mb-3 text-gray-300" />
                <p className="text-sm font-medium">No platform orders found.</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 bg-zinc-50 uppercase font-bold border-b border-gray-100 sticky top-0">
                  <tr>
                    <th className="px-6 py-4">Order #</th>
                    <th className="px-6 py-4">Customer ID</th>
                    <th className="px-6 py-4">Vendor ID</th>
                    <th className="px-6 py-4">Rider ID</th>
                    <th className="px-6 py-4">Total Amount</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => handleViewDetail(order.id)}
                      className="border-b border-gray-50 hover:bg-gray-50/80 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 font-bold text-red-600">{order.orderNumber}</td>
                      <td className="px-6 py-4 text-gray-900 font-bold">#CU-{order.customerId}</td>
                      <td className="px-6 py-4 text-gray-900 font-bold">#VD-{order.vendorId}</td>
                      <td className="px-6 py-4 text-gray-900 font-bold">
                        {order.riderId ? `#RD-${order.riderId}` : "Unassigned"}
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900">₹{parseFloat(order.totalAmount).toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slide-left p-6">
            
            <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
              <div>
                <h3 className="font-extrabold text-xl text-gray-900">Platform Order Details</h3>
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
                
                {/* Meta Cards */}
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Status</span>
                    <div className="mt-1"><OrderStatusBadge status={selectedOrder.status} /></div>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Payment Method</span>
                    <span className="font-bold text-gray-900 mt-1 block uppercase">{selectedOrder.paymentMethod || "COD"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Customer Details</span>
                    <span className="font-bold text-gray-900 mt-1 block">Customer #{selectedOrder.customerId}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase block">Rider Assigned</span>
                    <span className="font-bold text-gray-900 mt-1 block">Rider {selectedOrder.riderId ? `#${selectedOrder.riderId}` : "None"}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-3">
                  <h4 className="font-bold text-gray-900">Items Ordered ({selectedOrder.items?.length || 0})</h4>
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

                {/* Force Cancel */}
                {!["DELIVERED", "CANCELLED", "REJECTED"].includes(selectedOrder.status) && (
                  <div className="pt-4">
                    <button onClick={() => handleCancelOrder(selectedOrder.id)} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center shadow-sm transition-colors text-xs uppercase tracking-wider">
                      Force Cancel Order
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
