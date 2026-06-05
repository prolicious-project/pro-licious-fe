"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { setCart } from "@/store/slices/cartSlice";
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag } from "lucide-react";
import Link from "next/link";

export default function CartPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const vendorId = useSelector((state: RootState) => state.cart.vendorId);
  const [loading, setLoading] = useState(true);

  const fetchCart = async () => {
    try {
      const res = await api.get("/api/customer/cart");
      const activeCarts = res.data?.data || [];
      if (activeCarts.length > 0) {
        // Use the first active cart
        const cart = activeCarts[0];
        const items = cart.items.map((item: any) => ({
          id: item.menuItemId,
          cartItemId: item.id,
          name: item.menuItemName || item.name || `Item #${item.menuItemId}`,
          price: item.price,
          quantity: item.quantity,
          vendorId: cart.vendorId,
        }));
        dispatch(setCart({ items, vendorId: cart.vendorId }));
      } else {
        dispatch(setCart({ items: [], vendorId: null }));
      }
    } catch (e) {
      console.error("Error fetching cart:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchCart();
  }, [isAuthenticated, router]);

  const handleUpdateQty = async (cartItemId: number, newQty: number) => {
    try {
      if (newQty <= 0) {
        await api.delete(`/api/customer/cart/items/${cartItemId}`);
      } else {
        await api.patch(`/api/customer/cart/items/${cartItemId}`, { quantity: newQty });
      }
      await fetchCart();
    } catch (e) {
      console.error("Error updating cart item:", e);
    }
  };

  const handleRemoveItem = async (cartItemId: number) => {
    try {
      await api.delete(`/api/customer/cart/items/${cartItemId}`);
      await fetchCart();
    } catch (e) {
      console.error("Error removing cart item:", e);
    }
  };

  const handleClearCart = async () => {
    try {
      await api.delete("/api/customer/cart", { params: vendorId ? { vendorId } : {} });
      await fetchCart();
    } catch (e) {
      console.error("Error clearing cart:", e);
    }
  };

  const subtotal = cartItems.reduce((acc, item) => acc + parseFloat(item.price) * item.quantity, 0);
  const deliveryFee = 40;
  const tax = subtotal * 0.05;
  const grandTotal = subtotal > 0 ? subtotal + deliveryFee + tax : 0;

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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Shopping Cart</h1>

          {cartItems.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm flex flex-col items-center">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6">
                <ShoppingBag className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
              <p className="text-gray-500 mb-8 max-w-sm">Looks like you haven't added anything to your cart yet. Explore fresh meat options nearby.</p>
              <Link href="/" className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition-colors">
                Go to Shop
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* Items List */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-900">Items from Vendor #{vendorId}</h3>
                    <button onClick={handleClearCart} className="text-sm font-bold text-red-600 hover:text-red-700 transition-colors">
                      Clear Cart
                    </button>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {cartItems.map((item) => (
                      <div key={item.id} className="p-6 flex items-center gap-6">
                        <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 shadow-sm border border-gray-100">
                          <img src="https://images.unsplash.com/photo-1604503468506-a8da13d82791?q=80&w=200&auto=format&fit=crop" alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-grow">
                          <h4 className="font-bold text-gray-900 text-base">{item.name}</h4>
                          <p className="font-extrabold text-red-600 text-sm mt-1">₹{parseFloat(item.price).toFixed(0)}</p>
                        </div>
                        {/* Quantity controls */}
                        <div className="flex items-center gap-3 bg-red-50 text-red-600 font-bold rounded-lg px-2.5 py-1.5 border border-red-100">
                          <button onClick={() => handleUpdateQty(item.cartItemId!, item.quantity - 1)} className="hover:bg-red-100 p-0.5 rounded">
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-5 text-center text-sm">{item.quantity}</span>
                          <button onClick={() => handleUpdateQty(item.cartItemId!, item.quantity + 1)} className="hover:bg-red-100 p-0.5 rounded">
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        {/* Remove button */}
                        <button onClick={() => handleRemoveItem(item.cartItemId!)} className="text-gray-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-6 space-y-6 lg:sticky lg:top-28">
                <h3 className="font-bold text-gray-900 text-lg border-b border-gray-100 pb-4">Order Summary</h3>
                <div className="space-y-3.5 text-sm">
                  <div className="flex justify-between text-gray-600 font-medium">
                    <span>Subtotal</span>
                    <span className="font-bold text-gray-900">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 font-medium">
                    <span>Delivery Fee</span>
                    <span className="font-bold text-gray-900">₹{deliveryFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600 font-medium">
                    <span>GST (5%)</span>
                    <span className="font-bold text-gray-900">₹{tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-100 pt-4 flex justify-between text-base font-extrabold text-gray-900">
                    <span>Grand Total</span>
                    <span className="text-red-600">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
                <Link href="/checkout" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors mt-6">
                  Proceed to Checkout <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
