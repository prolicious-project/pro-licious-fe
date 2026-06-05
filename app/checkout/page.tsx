"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { MapPin, Plus, Check, ShoppingBag, CreditCard, Wallet, Truck } from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const vendorId = useSelector((state: RootState) => state.cart.vendorId);

  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("COD");
  
  // New address form state
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addressType, setAddressType] = useState("HOME");
  const [houseNumber, setHouseNumber] = useState("");
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      const addressRes = await api.get("/api/customer/addresses");
      const addrList = addressRes.data?.data || [];
      setAddresses(addrList);
      if (addrList.length > 0) {
        const defaultAddr = addrList.find((a: any) => a.isDefault);
        setSelectedAddressId(defaultAddr ? defaultAddr.id : addrList[0].id);
      }
    } catch (e) {
      console.error("Error fetching checkout data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (cartItems.length === 0) {
      router.push("/cart");
      return;
    }
    fetchData();
  }, [isAuthenticated, cartItems.length, router]);

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const payload = {
        addressType,
        houseNumber,
        street,
        landmark,
        city,
        state,
        pincode,
        isDefault: addresses.length === 0, // make default if it's the first address
      };
      const res = await api.post("/api/customer/addresses", payload);
      const newAddress = res.data?.data;
      if (newAddress) {
        setAddresses(prev => [...prev, newAddress]);
        setSelectedAddressId(newAddress.id);
        setShowAddAddress(false);
        // Reset form
        setHouseNumber("");
        setStreet("");
        setLandmark("");
        setCity("");
        setState("");
        setPincode("");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Could not add address. Check the fields.");
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      setError("Please select a delivery address.");
      return;
    }
    if (!vendorId) {
      setError("Vendor not found in cart.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        vendorId,
        addressId: selectedAddressId,
        paymentMethod,
      };
      const res = await api.post("/api/customer/orders", payload);
      const newOrder = res.data?.data;
      if (newOrder && newOrder.id) {
        router.push(`/orders/${newOrder.id}`);
      } else {
        setError("Order placed but ID not returned.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const subtotal = cartItems.reduce((acc, item) => acc + parseFloat(item.price) * item.quantity, 0);
  const deliveryFee = 40;
  const tax = subtotal * 0.05;
  const grandTotal = subtotal + deliveryFee + tax;

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
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Checkout</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left Column: Address and Payment */}
            <div className="lg:col-span-2 space-y-6">
              {/* Delivery Address Section */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-red-600" /> Delivery Address
                  </h3>
                  {!showAddAddress && (
                    <button onClick={() => setShowAddAddress(true)} className="flex items-center gap-1 text-sm font-bold text-red-600 hover:text-red-700">
                      <Plus className="w-4 h-4" /> Add New
                    </button>
                  )}
                </div>

                {showAddAddress ? (
                  <form onSubmit={handleAddAddress} className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address Type</label>
                        <select
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none font-medium"
                          value={addressType}
                          onChange={(e) => setAddressType(e.target.value)}
                        >
                          <option value="HOME">Home</option>
                          <option value="WORK">Work</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">House/Flat Number</label>
                        <input
                          type="text"
                          required
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none"
                          placeholder="e.g. Flat 4B"
                          value={houseNumber}
                          onChange={(e) => setHouseNumber(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Street / Locality</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none"
                        placeholder="e.g. Park Street"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Landmark (Optional)</label>
                        <input
                          type="text"
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none"
                          placeholder="e.g. Near City Mall"
                          value={landmark}
                          onChange={(e) => setLandmark(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pincode</label>
                        <input
                          type="text"
                          required
                          pattern="[0-9]{6}"
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none"
                          placeholder="6 digits"
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">City</label>
                        <input
                          type="text"
                          required
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none"
                          placeholder="City"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">State</label>
                        <input
                          type="text"
                          required
                          className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 outline-none"
                          placeholder="State"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button type="button" onClick={() => setShowAddAddress(false)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-100">
                        Cancel
                      </button>
                      <button type="submit" className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold">
                        Save Address
                      </button>
                    </div>
                  </form>
                ) : null}

                {/* Addresses List */}
                {addresses.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    No addresses saved yet. Please add a new address to proceed.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map((addr: any) => (
                      <div
                        key={addr.id}
                        onClick={() => setSelectedAddressId(addr.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all relative ${
                          selectedAddressId === addr.id
                            ? "border-red-600 bg-red-50/20 ring-1 ring-red-500"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded uppercase mb-2 block">
                            {addr.addressType}
                          </span>
                          {selectedAddressId === addr.id && (
                            <div className="w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-white">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                        <p className="font-bold text-gray-800 text-sm">
                          {addr.houseNumber || ""}, {addr.street}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {addr.landmark ? `${addr.landmark}, ` : ""}{addr.city}, {addr.state} - {addr.pincode}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Section */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
                <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-red-600" /> Payment Method
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { id: "COD", label: "Cash on Delivery", icon: Truck },
                    { id: "UPI", label: "UPI / QR Code", icon: Wallet },
                    { id: "CARD", label: "Credit/Debit Card", icon: CreditCard },
                  ].map((method) => {
                    const Icon = method.icon;
                    return (
                      <div
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                          paymentMethod === method.id
                            ? "border-red-600 bg-red-50/20 ring-1 ring-red-500"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${paymentMethod === method.id ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{method.label}</p>
                          <p className="text-[10px] text-gray-400 uppercase mt-0.5">{method.id}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-6 space-y-6 lg:sticky lg:top-28">
                <h3 className="font-bold text-gray-900 text-lg border-b border-gray-100 pb-4 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-red-600" /> Items Summary
                </h3>
                <div className="space-y-3.5 max-h-40 overflow-y-auto pr-1">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-gray-900 line-clamp-1">{item.name}</p>
                        <p className="text-gray-500 mt-0.5">₹{parseFloat(item.price).toFixed(0)} × {item.quantity}</p>
                      </div>
                      <span className="font-bold text-gray-900">₹{(parseFloat(item.price) * item.quantity).toFixed(0)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-3 text-xs">
                  <div className="flex justify-between text-gray-500 font-medium">
                    <span>Subtotal</span>
                    <span className="font-bold text-gray-900">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 font-medium">
                    <span>Delivery Fee</span>
                    <span className="font-bold text-gray-900">₹{deliveryFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 font-medium">
                    <span>GST (5%)</span>
                    <span className="font-bold text-gray-900">₹{tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-100 pt-4 flex justify-between text-base font-extrabold text-gray-900">
                    <span>Grand Total</span>
                    <span className="text-red-600">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handlePlaceOrder}
                  disabled={submitting}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors mt-6 disabled:opacity-50"
                >
                  {submitting ? "Placing Order..." : "Confirm & Place Order"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
