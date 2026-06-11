"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { getSocket } from "@/lib/socket";
import dynamic from "next/dynamic";
import { 
  Search, Navigation, Clock, Truck, MapPin, 
  Activity, Radio, Link2, ShieldAlert, X, Phone
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";

const TrackingMap = dynamic(() => import("@/components/TrackingMap"), { ssr: false });

export default function AdminRiderTrackingPage() {
  const router = useRouter();
  const { isAuthenticated, user, token } = useSelector((state: RootState) => state.auth);
  
  // Realtime datasets
  const [realtimeData, setRealtimeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [trackedOrderId, setTrackedOrderId] = useState<number | null>(null);
  
  // Socket Connection status
  const [isConnected, setIsConnected] = useState(false);

  // Telemetry client-side simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState(0);

  // Initial redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // Fetch initial dashboard state
  const fetchSnapshot = async () => {
    try {
      const res = await api.get("/api/admin/dashboard/realtime");
      setRealtimeData(res.data?.data);
    } catch (err) {
      console.error("Error fetching admin snapshot:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    fetchSnapshot();

    // Establish WebSocket Connection
    const socket = getSocket(token || undefined);
    socket.connect();

    setIsConnected(socket.connected);

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    // Listen to real-time rider location updates
    socket.on("admin_rider_location", (data: any) => {
      setRealtimeData((prev: any) => {
        if (!prev) return prev;
        
        // Construct the tracking event format to match DB schema
        const newEvent = {
          id: Date.now(), // temporary client-side ID
          orderId: data.orderId,
          riderId: data.riderId,
          eventType: "LOCATION_UPDATE",
          latitude: String(data.latitude),
          longitude: String(data.longitude),
          eventTime: data.timestamp || new Date().toISOString()
        };

        return {
          ...prev,
          trackingEvents: [newEvent, ...(prev.trackingEvents || [])]
        };
      });
    });

    // Listen to rider online/offline changes
    socket.on("rider_online", (data: { riderId: number }) => {
      setRealtimeData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          riderAvailability: (prev.riderAvailability || []).map((a: any) =>
            a.riderId === data.riderId ? { ...a, isOnline: true, lastSeen: new Date().toISOString() } : a
          )
        };
      });
    });

    socket.on("rider_offline", (data: { riderId: number }) => {
      setRealtimeData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          riderAvailability: (prev.riderAvailability || []).map((a: any) =>
            a.riderId === data.riderId ? { ...a, isOnline: false, lastSeen: new Date().toISOString() } : a
          )
        };
      });
    });

    // Periodic snapshot fallback to keep everything fully synced (every 10 seconds)
    const interval = setInterval(fetchSnapshot, 10000);

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("admin_rider_location");
      socket.off("rider_online");
      socket.off("rider_offline");
      socket.disconnect();
      clearInterval(interval);
      if ((window as any)._telemetryInterval) {
        clearInterval((window as any)._telemetryInterval);
        (window as any)._telemetryInterval = null;
      }
    };
  }, [isAuthenticated, token]);

  const startSimulation = (
    orderId: number,
    riderId: number,
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
  ) => {
    if (isSimulating) {
      if ((window as any)._telemetryInterval) {
        clearInterval((window as any)._telemetryInterval);
        (window as any)._telemetryInterval = null;
      }
      setIsSimulating(false);
      return;
    }

    setIsSimulating(true);
    setSimStep(0);

    const socket = getSocket(token || undefined);
    if (!socket.connected) {
      socket.connect();
    }

    let lat = startLat;
    let lng = startLng;
    let step = 0;

    socket.emit("rider_location_update", {
      orderId,
      riderId,
      latitude: lat,
      longitude: lng
    });

    const interval = setInterval(() => {
      step++;
      lat += (endLat - startLat) / 10;
      lng += (endLng - startLng) / 10;

      socket.emit("rider_location_update", {
        orderId,
        riderId,
        latitude: lat,
        longitude: lng
      });

      setSimStep(step);

      if (step >= 10) {
        clearInterval(interval);
        (window as any)._telemetryInterval = null;
        setIsSimulating(false);
      }
    }, 1500);

    (window as any)._telemetryInterval = interval;
  };

  // --- DATA MAPPINGS ---
  
  const mappedOrders = useMemo(() => {
    if (!realtimeData) return [];
    const { orders = [], users = [], vendors = [], customerProfiles = [], riders = [], payments = [] } = realtimeData;
    
    return orders.map((order: any) => {
      const profile = customerProfiles.find((cp: any) => cp.id === order.customerId);
      const customer = profile ? users.find((u: any) => u.id === profile.userId) : null;
      const vendor = vendors.find((v: any) => v.id === order.vendorId);
      const riderObj = riders.find((r: any) => r.id === order.riderId);
      const riderUser = riderObj ? users.find((u: any) => u.id === riderObj.userId) : null;
      const payment = payments.find((p: any) => p.orderId === order.id);

      return {
        ...order,
        customerName: customer ? customer.name : "Customer",
        customerPhone: customer ? customer.phone : "N/A",
        vendorName: vendor ? vendor.name : "Unknown Vendor",
        riderName: riderUser ? riderUser.name : "Unassigned",
        riderPhone: riderUser ? riderUser.phone : "N/A",
        paymentStatus: payment ? payment.status : "SUCCESS",
        paymentMethod: payment ? payment.paymentMode : "UPI"
      };
    });
  }, [realtimeData]);

  const liveRiderMapNodes = useMemo(() => {
    if (!realtimeData) return [];
    const { trackingEvents = [] } = realtimeData;

    // Filter active delivery orders + delivered orders
    const activeDeliveries = mappedOrders.filter((o: any) => ["PREPARING", "READY", "PICKED_UP", "DELIVERED"].includes(o.status));
    
    return activeDeliveries.map((order: any) => {
      const latestGPS = trackingEvents.find((evt: any) => evt.orderId === order.id && evt.eventType === "LOCATION_UPDATE");
      
      // Get coordinates dynamically from API collections, falling back to default Hyderabad suburbs
      const branchObj = order.branchId && realtimeData.vendorBranches
        ? realtimeData.vendorBranches.find((b: any) => b.id === order.branchId)
        : null;
      const addressObj = order.addressId && realtimeData.customerAddresses
        ? realtimeData.customerAddresses.find((a: any) => a.id === order.addressId)
        : null;

      const branchLat = branchObj?.latitude ? parseFloat(branchObj.latitude) : 17.4483;
      const branchLng = branchObj?.longitude ? parseFloat(branchObj.longitude) : 78.3488;
      const custLat = addressObj?.latitude ? parseFloat(addressObj.latitude) : 17.4325;
      const custLng = addressObj?.longitude ? parseFloat(addressObj.longitude) : 78.4071;

      let ratio = 0;
      
      // If client-side simulation is active, use its step
      if (isSimulating && trackedOrderId === order.id) {
        ratio = simStep / 10;
      } else {
        const createdTime = new Date(order.createdAt).getTime();
        const timeElapsed = (Date.now() - createdTime) / 1000;
        const deliveryDuration = 180;
        ratio = Math.min(1, Math.max(0, timeElapsed / deliveryDuration));
        
        // If order status is DELIVERED, force ratio to 1
        if (order.status === "DELIVERED") {
          ratio = 1;
        }
      }

      let currentLat = branchLat;
      let currentLng = branchLng;

      if (latestGPS?.latitude && latestGPS?.longitude) {
        currentLat = parseFloat(latestGPS.latitude);
        currentLng = parseFloat(latestGPS.longitude);
      } else {
        currentLat = branchLat + (custLat - branchLat) * ratio;
        currentLng = branchLng + (custLng - branchLng) * ratio;
      }

      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        riderName: order.riderName,
        riderPhone: order.riderPhone,
        vendorName: order.vendorName,
        customerName: order.customerName,
        status: isSimulating && trackedOrderId === order.id
          ? simStep < 3 
            ? "PREPARING" 
            : simStep < 8 
              ? "PICKED_UP" 
              : "READY" 
          : order.status,
        progress: Math.round(ratio * 100),
        start: { lat: branchLat, lng: branchLng },
        end: { lat: custLat, lng: custLng },
        current: { lat: currentLat, lng: currentLng }
      };
    });
  }, [realtimeData, mappedOrders, isSimulating, simStep, trackedOrderId]);

  const currentlyTrackedRider = useMemo(() => {
    if (!trackedOrderId) return null;
    return liveRiderMapNodes.find((n: any) => n.orderId === trackedOrderId) || null;
  }, [liveRiderMapNodes, trackedOrderId]);

  // Filtering tracking records
  const filteredRiders = useMemo(() => {
    if (!searchQuery) return liveRiderMapNodes;
    const q = searchQuery.toLowerCase();
    return liveRiderMapNodes.filter((node: any) => 
      node.riderName.toLowerCase().includes(q) || 
      node.orderNumber.toLowerCase().includes(q) ||
      node.vendorName.toLowerCase().includes(q) ||
      node.customerName.toLowerCase().includes(q)
    );
  }, [liveRiderMapNodes, searchQuery]);

  const getTrackingOverlay = (rider: any) => {
    if (!rider) return null;
    const { eta, desc } = getEtaAndDescription(rider.status, rider.progress);
    
    return (
      <div className="absolute bottom-4 right-4 z-10 w-[350px] bg-white/95 backdrop-blur-md rounded-3xl border border-gray-100 shadow-2xl p-5 flex flex-col gap-4 transition-all duration-300 animate-slide-up">
        <div className="flex justify-between items-start pb-3 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse"></span>
              <span className="text-[9px] font-black text-red-600 uppercase tracking-widest">Live Delivery Status</span>
            </div>
            <h4 className="font-black text-zinc-900 text-base mt-1 tracking-tight">{eta}</h4>
            <p className="text-[10px] text-zinc-400 font-medium mt-0.5 leading-tight">{desc}</p>
          </div>
          <button 
            onClick={() => setTrackedOrderId(null)}
            className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-colors shadow-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper tracker bar */}
        <div className="py-1">
          {renderZomatoStepper(rider.status)}
        </div>

        {/* Delivery Locations */}
        <div className="space-y-2.5 text-[11px] bg-zinc-50/60 border border-zinc-100/50 p-3 rounded-2xl">
          <div className="flex gap-2.5">
            <span className="text-sm">🏪</span>
            <div>
              <p className="text-[8px] font-extrabold text-gray-400 uppercase tracking-wider">Store / Merchant</p>
              <p className="font-black text-zinc-800">{rider.vendorName}</p>
              <p className="text-[9px] text-zinc-400">Gachibowli Hub, Hyderabad</p>
            </div>
          </div>
          <div className="flex gap-2.5 border-t border-zinc-100/70 pt-2.5">
            <span className="text-sm">🏠</span>
            <div>
              <p className="text-[8px] font-extrabold text-gray-400 uppercase tracking-wider">Deliver To</p>
              <p className="font-black text-zinc-800">{rider.customerName}</p>
              <p className="text-[9px] text-zinc-400">Jubilee Hills, Hyderabad</p>
            </div>
          </div>
        </div>

        {/* Rider Details Panel */}
        <div className="flex items-center justify-between p-3 bg-red-50/10 border border-red-100/30 rounded-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-xl font-bold shadow-inner">
              🛵
                        </div>
                        <div>
                          <span className="text-[8px] font-extrabold text-red-500 uppercase tracking-wider">Rider Partner</span>
                          <h5 className="font-black text-zinc-900 text-xs mt-0.5">{rider.riderName}</h5>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-amber-500 font-extrabold">★ 4.9</span>
                            <span className="text-[9px] text-zinc-400 font-medium">(250+ Orders)</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {rider.riderPhone && rider.riderPhone !== "N/A" && (
                          <a 
                            href={`tel:${rider.riderPhone}`}
                            className="w-8 h-8 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 flex items-center justify-center text-emerald-600 transition-colors shadow-sm"
                            title="Call Rider"
                          >
                            <Phone className="w-3.5 h-3.5 fill-current" />
                          </a>
                        )}
                        <button
                          onClick={() => startSimulation(rider.orderId, 1, rider.start.lat, rider.start.lng, rider.end.lat, rider.end.lng)}
                          className={`px-3 py-2 rounded-xl text-[9px] font-black tracking-wider uppercase transition-all shadow-sm border ${
                            isSimulating
                              ? "bg-zinc-950 text-white border-zinc-950 hover:bg-zinc-850"
                              : "bg-red-600 text-white border-red-700 hover:bg-red-700 animate-pulse"
                          }`}
                        >
                          {isSimulating ? `Stop (${simStep * 10}%)` : "Simulate Live"}
                        </button>
                      </div>
                    </div>
                  </div>
    );
  };

  const getEtaAndDescription = (status: string, progress: number) => {
    const etaMinutes = Math.max(1, Math.round((1 - progress / 100) * 20));
    
    if (status === "DELIVERED") {
      return {
        eta: "Delivered!",
        desc: "Order delivered successfully. Thank you!"
      };
    }
    if (status === "PICKED_UP") {
      return {
        eta: `Arriving in ${etaMinutes} mins`,
        desc: "Rider is heading to the customer location."
      };
    }
    if (status === "READY") {
      return {
        eta: `Arriving in ${etaMinutes} mins`,
        desc: "Rider has arrived at the store and is picking up."
      };
    }
    return {
      eta: `Arriving in ${etaMinutes} mins`,
      desc: "Vendor is preparing your fresh order."
    };
  };

  const renderZomatoStepper = (status: string) => {
    const steps = [
      { label: "Placed", active: ["PLACED", "ACCEPTED", "PREPARING", "READY", "PICKED_UP", "DELIVERED"].includes(status) },
      { label: "Preparing", active: ["PREPARING", "READY", "PICKED_UP", "DELIVERED"].includes(status) },
      { label: "Picked Up", active: ["PICKED_UP", "DELIVERED"].includes(status) },
      { label: "Delivered", active: ["DELIVERED"].includes(status) }
    ];

    return (
      <div className="flex items-center justify-between w-full mt-2 px-1 relative">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          const isCurrent = (idx === 0 && ["PLACED", "ACCEPTED"].includes(status)) ||
                            (idx === 1 && ["PREPARING", "READY"].includes(status)) ||
                            (idx === 2 && status === "PICKED_UP") ||
                            (idx === 3 && status === "DELIVERED");

          return (
            <div key={idx} className="flex-1 flex items-center relative">
              <div className="flex flex-col items-center z-10 w-full">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border text-[9px] font-black transition-all ${
                  step.active 
                    ? isCurrent 
                      ? "bg-red-600 text-white border-red-600 ring-4 ring-red-100 animate-pulse" 
                      : "bg-red-500 text-white border-red-500 shadow-sm" 
                    : "bg-gray-100 text-gray-400 border-gray-200"
                }`}>
                  {step.active && !isCurrent ? "✓" : idx + 1}
                </div>
                <span className={`text-[8px] font-black mt-1.5 whitespace-nowrap tracking-tight uppercase ${
                  isCurrent ? "text-red-600 font-extrabold" : "text-gray-400"
                }`}>{step.label}</span>
              </div>
              {!isLast && (
                <div className="absolute left-[50%] right-[-50%] top-3 h-[2px] -z-0 bg-gray-200">
                  <div className={`h-full transition-all duration-500 ${
                    steps[idx + 1].active ? "bg-red-500" : "bg-transparent"
                  }`} style={{ width: steps[idx + 1].active ? "100%" : "0%" }}></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden text-sm">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Viewport */}
      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        
        {/* Real-time Header */}
        <header className="bg-white border-b border-gray-100 px-8 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <Navigation className="w-5 h-5 text-red-600 rotate-45 fill-current" />
                Rider Live Telemetry
              </h2>
              <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border shadow-sm transition-colors ${
                isConnected 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                  : "bg-amber-50 text-amber-700 border-amber-100"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`}></span>
                {isConnected ? "Live Socket Connected" : "Polling Active"}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">Tracking active riders dynamically with real-time coordinate streams.</p>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search active deliveries..."
                className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 text-xs transition-all shadow-sm"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 font-bold text-xs"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Map Container Viewport */}
        <div className="flex-grow relative w-full h-[calc(100vh-80px)] overflow-hidden bg-gray-50">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/50 backdrop-blur-xs z-30">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent shadow-sm"></div>
              <p className="text-gray-400 font-bold text-sm">Opening telemetry streams...</p>
            </div>
          ) : (
            <>
              {/* Full Viewport Map */}
              <div className="w-full h-full z-0">
                <TrackingMap nodes={liveRiderMapNodes} trackedOrderId={trackedOrderId} />
              </div>

              {/* Floating Left Panel: Search & Shipment List */}
              <div className="absolute top-4 left-4 z-10 w-80 bg-white/95 backdrop-blur-md rounded-2xl border border-gray-100 shadow-xl max-h-[calc(100vh-160px)] flex flex-col overflow-hidden transition-all duration-300">
                <div className="p-4 border-b border-gray-100 flex-shrink-0">
                  <div className="flex items-center gap-2 mb-3">
                    <Truck className="w-4 h-4 text-red-600" />
                    <h3 className="font-black text-gray-900 text-sm">
                      Active Shipments ({filteredRiders.length})
                    </h3>
                  </div>
                  
                  {/* Floating Panel Search Box */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-3.5 w-3.5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search active orders..."
                      className="block w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 text-[11px] transition-all"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2 top-1.5 text-gray-400 hover:text-gray-600 font-bold text-[10px]"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Listing of shipments inside left floating card */}
                <div className="flex-grow overflow-y-auto p-3 space-y-2.5 max-h-[400px]">
                  {filteredRiders.map((node: any) => {
                    const isTracked = trackedOrderId === node.orderId;
                    return (
                      <div 
                        key={node.orderId}
                        onClick={() => setTrackedOrderId(node.orderId)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2.5 ${
                          isTracked 
                            ? "bg-red-50/35 border-red-200 ring-2 ring-red-50/50 shadow-md shadow-red-50/20" 
                            : "bg-gray-50/60 border-gray-100 hover:bg-gray-50 hover:border-gray-200"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Order #{node.orderNumber}</span>
                            <h4 className="font-extrabold text-zinc-900 text-[11px] mt-0.5">{node.riderName}</h4>
                          </div>
                          <span className={`font-extrabold text-[8px] px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            node.status === "DELIVERED"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-red-100 text-red-700 border border-red-200 animate-pulse"
                          }`}>
                            {node.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex-grow bg-gray-200 rounded-full h-1 overflow-hidden">
                            <div className={`h-full transition-all duration-1000 ${
                              node.status === "DELIVERED" ? "bg-emerald-500" : "bg-red-600"
                            }`} style={{ width: `${node.progress}%` }}></div>
                          </div>
                          <span className="text-[8px] font-black text-gray-500">{node.progress}%</span>
                        </div>
                      </div>
                    );
                  })}

                  {filteredRiders.length === 0 && (
                    <div className="text-center py-10 text-gray-400 text-[11px] flex flex-col items-center justify-center gap-1">
                      <ShieldAlert className="w-6 h-6 text-gray-300" />
                      <p>No active shipments found.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Zomato-style Floating Order Detail Overlay */}
              {getTrackingOverlay(currentlyTrackedRider)}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
