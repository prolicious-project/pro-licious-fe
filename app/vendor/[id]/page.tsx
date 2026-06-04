"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ChevronLeft, Star, Clock, MapPin, Plus, Minus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addItem, updateQuantity } from "@/store/slices/cartSlice";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";

export default function VendorMenuPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const cartItems = useSelector((state: RootState) => state.cart.items);

  const [vendor, setVendor] = useState<any>(null);
  const [menu, setMenu] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("");

  useEffect(() => {
    if (!isAuthenticated) { router.push("/login"); return; }
    const id = params.id;
    Promise.all([
      api.get(`/api/customer/vendors/${id}`),
      api.get(`/api/customer/vendors/${id}/menu`),
    ])
      .then(([vendorRes, menuRes]) => {
        setVendor(vendorRes.data?.data);
        const items = menuRes.data?.data || [];
        setMenu(items);
        if (items.length > 0 && items[0].categoryName) setActiveTab(items[0].categoryName);
      })
      .catch(err => console.error("Error fetching vendor data:", err))
      .finally(() => setLoading(false));
  }, [isAuthenticated, params.id, router]);

  const getQty = (itemId: number) => cartItems.find(i => i.id === itemId)?.quantity || 0;
  const cartTotal = cartItems.reduce((acc, i) => acc + parseFloat(i.price) * i.quantity, 0);

  const categories = [...new Set(menu.map((i: any) => i.categoryName || "Menu"))];

  if (loading) return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
      </div>
    </div>
  );

  if (!vendor) return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center text-gray-500">Vendor not found.</div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow pb-20">
        <div className="bg-white px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-100">
          <div className="max-w-7xl mx-auto">
            <Link href="/" className="flex items-center text-sm font-medium text-gray-600 hover:text-red-600">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to Home
            </Link>
          </div>
        </div>

        {/* Vendor Banner */}
        <div className="w-full relative h-[250px] bg-black">
          <img src="https://images.unsplash.com/photo-1607006411061-0b5c1fb981f4?q=80&w=1200&auto=format&fit=crop" alt={vendor.name} className="absolute inset-0 w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full p-8 max-w-7xl mx-auto inset-x-0">
            <span className={`text-xs font-bold px-2 py-1 rounded mb-3 inline-block ${vendor.status === 'ACTIVE' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
              {vendor.status === 'ACTIVE' ? 'OPEN NOW' : 'CLOSED'}
            </span>
            <h1 className="text-4xl font-extrabold text-white mb-2">{vendor.name}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-gray-200 font-medium items-center">
              <span className="flex items-center gap-1"><Star className="w-4 h-4 text-yellow-400 fill-current" /> 4.8</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> 25-40 min</span>
              {vendor.phone && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {vendor.phone}</span>}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 flex flex-col lg:flex-row gap-8 items-start">
          {/* Menu */}
          <div className="flex-1 w-full">
            {categories.length > 0 && (
              <div className="flex border-b border-gray-200 mb-8 overflow-x-auto sticky top-20 bg-gray-50 z-10 pt-4">
                {categories.map(cat => (
                  <button key={cat} onClick={() => setActiveTab(cat)}
                    className={`px-6 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === cat ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                    {cat}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-6">
              {menu.filter(item => !activeTab || (item.categoryName || "Menu") === activeTab).map((item: any) => {
                const qty = getQty(item.id);
                return (
                  <div key={item.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex gap-6 hover:shadow-md transition-shadow">
                    <div className="flex-1">
                      {!item.isAvailable && <span className="text-xs font-bold text-gray-400 mb-2 block">OUT OF STOCK</span>}
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{item.name}</h3>
                      {item.description && <p className="text-gray-500 text-sm mb-3 line-clamp-2">{item.description}</p>}
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-900 text-lg">₹{parseFloat(item.price).toFixed(0)}</span>
                        {item.isVeg !== undefined && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${item.isVeg ? 'border-green-500 text-green-700 bg-green-50' : 'border-red-500 text-red-700 bg-red-50'}`}>
                            {item.isVeg ? '🟢 VEG' : '🔴 NON-VEG'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-end w-28">
                      <div className="w-24 h-20 rounded-xl overflow-hidden mb-[-16px] shadow-sm z-0 bg-gray-100">
                        <img src="https://images.unsplash.com/photo-1604503468506-a8da13d82791?q=80&w=200&auto=format&fit=crop" alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="relative z-10 w-24 bg-white border border-red-200 rounded-lg shadow-md overflow-hidden">
                        {qty === 0 ? (
                          <button disabled={!item.isAvailable}
                            onClick={() => dispatch(addItem({ id: item.id, name: item.name, price: item.price, quantity: 1, vendorId: vendor.id, imageUrl: "" }))}
                            className="w-full py-2 text-red-600 font-bold hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                            ADD +
                          </button>
                        ) : (
                          <div className="flex items-center justify-between px-2 py-1.5 bg-red-50 text-red-600 font-bold">
                            <button onClick={() => dispatch(updateQuantity({ id: item.id, quantity: qty - 1 }))} className="p-1 hover:bg-red-100 rounded"><Minus className="w-4 h-4" /></button>
                            <span>{qty}</span>
                            <button onClick={() => dispatch(updateQuantity({ id: item.id, quantity: qty + 1 }))} className="p-1 hover:bg-red-100 rounded"><Plus className="w-4 h-4" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {menu.length === 0 && !loading && (
                <div className="text-center py-20 text-gray-400">
                  <p className="text-lg font-medium">No menu items available yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Cart Sidebar */}
          <div className="w-full lg:w-80 lg:sticky lg:top-28">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-900">My Cart</h3>
                <span className="text-xs font-medium text-gray-500">{cartItems.reduce((a, i) => a + i.quantity, 0)} items</span>
              </div>
              <div className="p-6 min-h-[200px] max-h-[400px] overflow-y-auto">
                {cartItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 py-10">
                    <p className="font-medium">Your cart is empty</p>
                    <p className="text-xs mt-1">Add items from the menu.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cartItems.map(item => (
                      <div key={item.id} className="flex justify-between items-start text-sm">
                        <div className="flex-1 pr-2">
                          <p className="font-medium text-gray-900 line-clamp-1">{item.name}</p>
                          <p className="text-gray-500">₹{parseFloat(item.price).toFixed(0)}</p>
                        </div>
                        <div className="flex items-center justify-between w-20 border border-gray-200 rounded text-red-600 font-medium">
                          <button onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity - 1 }))} className="p-1 hover:bg-red-50 rounded"><Minus className="w-3 h-3" /></button>
                          <span className="text-xs">{item.quantity}</span>
                          <button onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity + 1 }))} className="p-1 hover:bg-red-50 rounded"><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {cartItems.length > 0 && (
                <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-4">
                  <div className="flex justify-between text-sm font-bold text-gray-900">
                    <span>Subtotal</span>
                    <span>₹{cartTotal.toFixed(2)}</span>
                  </div>
                  <Link href="/checkout" className="block w-full bg-red-600 hover:bg-red-700 text-white text-center py-3 rounded-xl font-bold shadow-md transition-colors">
                    Checkout →
                  </Link>
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
