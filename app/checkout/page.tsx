"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { loadRazorpayScript, openRazorpayCheckout } from "@/lib/razorpay";
import {
  MapPin,
  Plus,
  Check,
  ShoppingBag,
  CreditCard,
  Wallet,
  Truck,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Zap,
  QrCode,
} from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
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
  const [stateVal, setStateVal] = useState("");
  const [pincode, setPincode] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Payment modal state
  const [paymentModal, setPaymentModal] = useState<"idle" | "loading" | "processing" | "success" | "failed">("idle");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);

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
        state: stateVal,
        pincode,
        isDefault: addresses.length === 0,
      };
      const res = await api.post("/api/customer/addresses", payload);
      const newAddress = res.data?.data;
      if (newAddress) {
        setAddresses((prev) => [...prev, newAddress]);
        setSelectedAddressId(newAddress.id);
        setShowAddAddress(false);
        setHouseNumber("");
        setStreet("");
        setLandmark("");
        setCity("");
        setStateVal("");
        setPincode("");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Could not add address. Check the fields.");
    }
  };

  const initiateRazorpayPayment = async (orderId: number, totalAmount: number) => {
    setPaymentModal("loading");
    setPaymentMessage("Loading payment gateway...");

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setPaymentModal("failed");
      setPaymentMessage("Failed to load payment gateway. Please check your internet connection.");
      return;
    }

    try {
      setPaymentMessage("Creating payment order...");
      const initRes = await api.post("/api/customer/payments/initiate", { orderId });
      const { razorpayOrderId, amount, key } = initRes.data?.data || {};

      if (!razorpayOrderId || !key) {
        throw new Error("Payment initialization failed. Invalid response from server.");
      }

      setPaymentModal("processing");
      setPaymentMessage("Complete your payment in the Razorpay window...");

      openRazorpayCheckout({
        key,
        amount: Math.round(parseFloat(amount) * 100),
        currency: "INR",
        name: "Pro-Licious",
        description: `Order #${orderId} Payment`,
        order_id: razorpayOrderId,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        theme: {
          color: "#dc2626",
        },
        handler: async (response) => {
          try {
            setPaymentModal("loading");
            setPaymentMessage("Verifying payment...");
            await api.post("/api/customer/payments/verify", {
              orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setPaymentModal("success");
            setPaymentMessage("Payment successful! Your order is confirmed.");
            setTimeout(() => {
              router.push(`/orders/${orderId}`);
            }, 2500);
          } catch (verifyErr: any) {
            setPaymentModal("failed");
            setPaymentMessage(
              verifyErr.response?.data?.message || "Payment verification failed. Contact support."
            );
          }
        },
        modal: {
          ondismiss: () => {
            setPaymentModal("failed");
            setPaymentMessage("Payment was cancelled. Your order is placed but unpaid.");
          },
        },
      });
    } catch (err: any) {
      setPaymentModal("failed");
      setPaymentMessage(err.response?.data?.message || err.message || "Payment initiation failed.");
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

      if (!newOrder?.id) {
        setError("Order placed but ID not returned.");
        setSubmitting(false);
        return;
      }

      setCreatedOrderId(newOrder.id);

      // For UPI/CARD → launch Razorpay
      if (paymentMethod === "UPI" || paymentMethod === "CARD") {
        await initiateRazorpayPayment(newOrder.id, parseFloat(newOrder.totalAmount || grandTotal.toString()));
      } else {
        // COD → go directly to order page
        router.push(`/orders/${newOrder.id}`);
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

      {/* ——— Payment Status Overlay ——— */}
      {paymentModal !== "idle" && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Top gradient bar */}
            <div
              className={`h-2 w-full ${
                paymentModal === "success"
                  ? "bg-gradient-to-r from-emerald-400 to-green-500"
                  : paymentModal === "failed"
                  ? "bg-gradient-to-r from-red-500 to-rose-600"
                  : "bg-gradient-to-r from-red-500 via-orange-400 to-red-600 animate-pulse"
              }`}
            />

            <div className="p-8 flex flex-col items-center text-center gap-6">
              {/* Icon */}
              {paymentModal === "loading" || paymentModal === "processing" ? (
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 rounded-full bg-red-50 border-4 border-red-100 animate-ping opacity-50" />
                  <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-rose-600 shadow-xl shadow-red-200">
                    {paymentModal === "processing" ? (
                      <QrCode className="w-10 h-10 text-white" />
                    ) : (
                      <Loader2 className="w-10 h-10 text-white animate-spin" />
                    )}
                  </div>
                </div>
              ) : paymentModal === "success" ? (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-xl shadow-green-200 animate-bounce">
                  <CheckCircle2 className="w-12 h-12 text-white" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-xl shadow-red-200">
                  <AlertCircle className="w-12 h-12 text-white" />
                </div>
              )}

              {/* Title */}
              <div>
                <h3 className="text-xl font-black text-gray-900 mb-1">
                  {paymentModal === "loading" && "Preparing Payment"}
                  {paymentModal === "processing" && "Complete Your Payment"}
                  {paymentModal === "success" && "Payment Successful! 🎉"}
                  {paymentModal === "failed" && "Payment Status"}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">{paymentMessage}</p>
              </div>

              {/* Amount chip */}
              {(paymentModal === "processing" || paymentModal === "loading") && (
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-5 py-2.5 rounded-2xl">
                  <Zap className="w-4 h-4 text-red-600" />
                  <span className="font-black text-gray-900 text-lg">₹{grandTotal.toFixed(2)}</span>
                  <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">to pay</span>
                </div>
              )}

              {/* Powered by Razorpay badge */}
              {(paymentModal === "processing" || paymentModal === "loading") && (
                <div className="flex items-center gap-2 opacity-60">
                  <div className="w-4 h-4 bg-blue-600 rounded-sm flex items-center justify-center">
                    <span className="text-white font-black text-[8px]">R</span>
                  </div>
                  <span className="text-xs text-gray-400 font-medium">Powered by Razorpay</span>
                </div>
              )}

              {/* Actions */}
              {paymentModal === "success" && (
                <button
                  onClick={() => router.push(`/orders/${createdOrderId}`)}
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-3 rounded-xl shadow-md shadow-green-200 transition-all"
                >
                  View My Order →
                </button>
              )}

              {paymentModal === "failed" && (
                <div className="w-full flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setPaymentModal("idle");
                      if (createdOrderId) {
                        initiateRazorpayPayment(createdOrderId, grandTotal);
                      }
                    }}
                    className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold py-3 rounded-xl shadow-md shadow-red-200 transition-all"
                  >
                    Retry Payment
                  </button>
                  <button
                    onClick={() => router.push(`/orders/${createdOrderId}`)}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-all"
                  >
                    View Order (Pay Later)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="flex-grow py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Checkout</h1>
          <p className="text-gray-500 text-sm mb-8">Review your order and complete payment</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
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
                    <button
                      onClick={() => setShowAddAddress(true)}
                      className="flex items-center gap-1 text-sm font-bold text-red-600 hover:text-red-700"
                    >
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
                          value={stateVal}
                          onChange={(e) => setStateVal(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddAddress(false)}
                        className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-100"
                      >
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
                          {addr.landmark ? `${addr.landmark}, ` : ""}
                          {addr.city}, {addr.state} - {addr.pincode}
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
                    {
                      id: "COD",
                      label: "Cash on Delivery",
                      subtext: "Pay when your order arrives",
                      icon: Truck,
                      badge: null,
                    },
                    {
                      id: "UPI",
                      label: "UPI / Online Payment",
                      subtext: "GPay, PhonePe, Paytm & more",
                      icon: Wallet,
                      badge: "INSTANT",
                    },
                    {
                      id: "CARD",
                      label: "Credit / Debit Card",
                      subtext: "Visa, Mastercard, RuPay",
                      icon: CreditCard,
                      badge: "SECURE",
                    },
                  ].map((method) => {
                    const Icon = method.icon;
                    const isSelected = paymentMethod === method.id;
                    return (
                      <div
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        className={`relative p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? "border-red-600 bg-gradient-to-br from-red-50 to-rose-50 ring-2 ring-red-500 shadow-md shadow-red-100"
                            : "border-gray-200 bg-white hover:border-red-200 hover:bg-red-50/30"
                        }`}
                      >
                        {method.badge && (
                          <span className={`absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase ${isSelected ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                            {method.badge}
                          </span>
                        )}
                        <div className={`p-2.5 rounded-xl mb-3 w-fit ${isSelected ? "bg-red-600 text-white shadow-md shadow-red-300" : "bg-gray-100 text-gray-500"}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <p className="font-bold text-gray-900">{method.label}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{method.subtext}</p>
                        {isSelected && (
                          <div className="absolute top-2 left-2 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Razorpay info banner for UPI/CARD */}
                {(paymentMethod === "UPI" || paymentMethod === "CARD") && (
                  <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-black text-sm">R</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-blue-800">Secured by Razorpay</p>
                      <p className="text-xs text-blue-600 mt-0.5">
                        Your payment is encrypted and processed securely via Razorpay. A payment window will open after confirming your order.
                      </p>
                    </div>
                  </div>
                )}
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
                        <p className="text-gray-500 mt-0.5">
                          ₹{parseFloat(item.price).toFixed(0)} × {item.quantity}
                        </p>
                      </div>
                      <span className="font-bold text-gray-900">
                        ₹{(parseFloat(item.price) * item.quantity).toFixed(0)}
                      </span>
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
                  disabled={submitting || paymentModal !== "idle"}
                  className={`w-full text-white font-bold py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all mt-6 disabled:opacity-50 disabled:cursor-not-allowed ${
                    paymentMethod === "COD"
                      ? "bg-gray-900 hover:bg-gray-800 shadow-gray-900/20"
                      : "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-red-200"
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Placing Order...
                    </>
                  ) : paymentMethod === "COD" ? (
                    <>
                      <Truck className="w-4 h-4" />
                      Confirm & Place Order
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" />
                      Pay ₹{grandTotal.toFixed(0)} via {paymentMethod}
                    </>
                  )}
                </button>

                <p className="text-center text-[10px] text-gray-400">
                  {paymentMethod === "COD"
                    ? "You'll pay cash when the order arrives"
                    : "Secured payment powered by Razorpay"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
