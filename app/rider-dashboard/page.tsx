// "use client";

// import { useEffect, useState, useRef } from "react";
// import { useRouter } from "next/navigation";
// import { useSelector } from "react-redux";
// import { RootState } from "@/store/store";
// import { api } from "@/lib/axios";
// import { getSocket } from "@/lib/socket";
// import {
//   TrendingUp,
//   ClipboardList,
//   Clock,
//   Percent,
//   AlertCircle,
//   CheckCircle2,
//   Navigation,
//   ArrowRight,
//   TrendingDown,
//   Sparkles,
//   MapPin,
//   Store,
//   Compass,
// } from "lucide-react";
// import Link from "next/link";
// import LeafletMap from "@/components/LeafletMap";

// interface Order {
//   id: number;
//   orderId?: number;
//   orderNumber: string;
//   status: string;
//   vendor?: any;
//   customer?: any;
//   address?: any;
//   assignedAt: string;
//   totalAmount?: number;
// }

// interface Earnings {
//   totalEarnings: number;
//   count: number;
//   distance?: string;
// }

// export default function RiderDashboard() {
//   const router = useRouter();
//   const { isAuthenticated, user, token } = useSelector(
//     (state: RootState) => state.auth
//   );

//   const [activeOrder, setActiveOrder] = useState<Order | null>(null);
//   const [pendingOrders, setPendingOrders] = useState<any[]>([]);
//   const [recentDeliveries, setRecentDeliveries] = useState<Order[]>([]);
//   const [earnings, setEarnings] = useState<Earnings | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string>("");
//   const [timers, setTimers] = useState<{ [key: number]: number }>({});
//   const [riderCoords, setRiderCoords] = useState<[number, number] | null>(null);
  
//   const audioContextRef = useRef<AudioContext | null>(null);
//   const lastLocationSyncRef = useRef<number>(0);

//   const playNotificationSound = () => {
//     try {
//       if (!audioContextRef.current) {
//         audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
//       }
//       const ctx = audioContextRef.current;
//       if (ctx.state === "suspended") {
//         ctx.resume();
//       }
//       const osc = ctx.createOscillator();
//       const gain = ctx.createGain();
//       osc.type = "sine";
//       osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
//       gain.gain.setValueAtTime(0.1, ctx.currentTime);
//       gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
//       osc.connect(gain);
//       gain.connect(ctx.destination);
//       osc.start();
//       osc.stop(ctx.currentTime + 0.3);
//     } catch (err) {
//       console.warn("Sound blocked or failed to play:", err);
//     }
//   };

//   // Fetch rider dashboard data
//   const fetchRiderData = async () => {
//     try {
//       setLoading(true);
//       setError("");
//       const [ordersRes, earningsRes] = await Promise.all([
//         api.get("/api/rider/orders"),
//         api.get("/api/rider/earnings/summary"),
//       ]);

//       const orders: Order[] = ordersRes.data?.data || [];
//       const earningsData = earningsRes.data?.data || null;

//       setEarnings(earningsData);

//       // Pending orders: assignments with status ASSIGNED (waiting for rider to accept)
//       const pending = orders.filter((o) => o.status === "ASSIGNED");
//       if (pending.length > 0) {
//         const normalizedPending = pending.map((o) => ({
//           id: o.orderId || o.id,
//           orderNumber: o.orderNumber || String(o.orderId || o.id),
//           vendor: o.vendor || {},
//           address: o.address || {},
//           totalAmount: o.totalAmount || 120,
//         }));
//         setPendingOrders((prev) => {
//           // Merge: keep existing, add new ones
//           const existingIds = new Set(prev.map((p) => p.id));
//           const newOnes = normalizedPending.filter((p) => !existingIds.has(p.id));
//           return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
//         });
//         setTimers((prev) => {
//           const next = { ...prev };
//           normalizedPending.forEach((o) => {
//             if (!(o.id in next)) next[o.id] = 30;
//           });
//           return next;
//         });
//       }

//       // Active order: ACCEPTED assignments (rider already accepted, delivery in progress)
//       const active = orders.find(
//         (o) => o.status === "ACCEPTED"
//       );
//       setActiveOrder(active || null);

//       // Filter recent deliveries
//       const delivered = orders
//         .filter((o) => o.status === "COMPLETED" || o.status === "DELIVERED")
//         .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())
//         .slice(0, 5);
//       setRecentDeliveries(delivered);

//     } catch (err: any) {
//       console.error("Dashboard data load error:", err);
//       setError("Unable to update summary details");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Setup geolocation tracking on dashboard mount
//   useEffect(() => {
//     if (!isAuthenticated) return;

//     if (navigator.geolocation) {
//       navigator.geolocation.getCurrentPosition(
//         (pos) => {
//           setRiderCoords([pos.coords.latitude, pos.coords.longitude]);
//         },
//         (err) => console.warn("Initial geolocation fetch failed:", err),
//         { enableHighAccuracy: true }
//       );

//       const watchId = navigator.geolocation.watchPosition(
//         (pos) => {
//           const { latitude, longitude } = pos.coords;
//           setRiderCoords([latitude, longitude]);
//           // Throttle: sync location to backend at most once every 15 seconds
//           const now = Date.now();
//           if (now - lastLocationSyncRef.current >= 15000) {
//             lastLocationSyncRef.current = now;
//             api.post("/api/rider/location", { latitude, longitude }).catch((e) => {
//               console.warn("Failed to sync location to backend from dashboard:", e);
//             });
//           }
//         },
//         (err) => console.warn("Watch position error on dashboard:", err),
//         { enableHighAccuracy: true, timeout: 10000 }
//       );

//       return () => navigator.geolocation.clearWatch(watchId);
//     }
//   }, [isAuthenticated]);

//   // Initialize socket and load data
//   useEffect(() => {
//     if (!isAuthenticated) return;
//     fetchRiderData();

//     const interval = setInterval(fetchRiderData, 30000);

//     const socket = getSocket(token || "");
//     socket.connect();

//     // Listen for new assignments
//     socket.on("new_order_assigned", (data: any) => {
//       console.log("New order assigned:", data);
//       if (!data || !data.orderId) return;
//       playNotificationSound();
      
//       const normalizedItem = {
//         id: data.orderId,
//         orderNumber: data.order?.orderNumber || String(data.orderId),
//         vendor: data.order?.vendor || {},
//         address: data.order?.address || {},
//         totalAmount: data.order?.totalAmount || 120,
//       };

//       // Add order to pending queue
//       setPendingOrders((prev) => {
//         if (prev.some((o) => o.id === normalizedItem.id)) return prev;
//         return [normalizedItem, ...prev];
//       });

//       // Set timer to 30s
//       setTimers((prev) => ({
//         ...prev,
//         [normalizedItem.id]: 30,
//       }));
//     });

//     socket.on("pending_assignments", (data: any) => {
//       console.log("Pending assignments:", data);
//       const assignmentsList = data?.assignments || [];
//       if (assignmentsList.length > 0) {
//         playNotificationSound();
//         const normalizedList = assignmentsList.map((item: any) => ({
//           id: item.orderId,
//           orderNumber: item.orderNumber || String(item.orderId),
//           vendor: item.vendor || {},
//           address: item.address || {},
//           totalAmount: item.totalAmount || 120,
//         }));

//         setPendingOrders(normalizedList);
        
//         setTimers((prev) => {
//           const newTimers = { ...prev };
//           normalizedList.forEach((order: any) => {
//             if (!newTimers[order.id]) {
//               newTimers[order.id] = 30;
//             }
//           });
//           return newTimers;
//         });
//       }
//     });

//     socket.on("order_status_changed", () => {
//       fetchRiderData();
//     });

//     socket.on("delivery_confirmed", () => {
//       fetchRiderData();
//     });

//     return () => {
//       clearInterval(interval);
//       socket.disconnect();
//     };
//   }, [isAuthenticated, token]);

//   // Timers handler for countdowns
//   useEffect(() => {
//     const timerInterval = setInterval(() => {
//       setTimers((prev) => {
//         const next = { ...prev };
//         let hasChanges = false;
        
//         Object.keys(next).forEach((key) => {
//           const id = Number(key);
//           if (next[id] > 0) {
//             next[id] -= 1;
//             hasChanges = true;
//             if (next[id] === 0) {
//               // Auto-reject order when countdown finishes
//               handleRejectOrder(id);
//             }
//           }
//         });

//         return hasChanges ? next : prev;
//       });
//     }, 1000);

//     return () => clearInterval(timerInterval);
//   }, [pendingOrders]);

//   const handleAcceptOrder = async (orderId: number) => {
//     try {
//       await api.patch(`/api/rider/orders/${orderId}/accept`);
//       setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
//       fetchRiderData();
//       router.push(`/rider-dashboard/track/${orderId}`);
//     } catch (err) {
//       console.error("Failed to accept order:", err);
//       alert("Error accepting order. Maybe it was already assigned or cancelled.");
//     }
//   };

//   const handleRejectOrder = async (orderId: number) => {
//     try {
//       await api.patch(`/api/rider/orders/${orderId}/reject`);
//     } catch (err) {
//       console.error("Failed to reject order:", err);
//     } finally {
//       setPendingOrders((prev) => prev.filter((o) => o.id !== orderId));
//       setTimers((prev) => {
//         const next = { ...prev };
//         delete next[orderId];
//         return next;
//       });
//     }
//   };

//   // Mock online hours and acceptance rate since it might not be in API
//   const stats = [
//     {
//       name: "Today's Earnings",
//       value: `₹${earnings?.totalEarnings || 0}`,
//       desc: "+12.5% from yesterday",
//       icon: TrendingUp,
//       bg: "from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/10 dark:to-teal-500/5",
//       border: "border-emerald-500/20 dark:border-emerald-500/20",
//       textColor: "text-emerald-600 dark:text-emerald-400",
//     },
//     {
//       name: "Today's Deliveries",
//       value: `${earnings?.count || 0}`,
//       desc: "Target: 10 deliveries",
//       icon: ClipboardList,
//       bg: "from-blue-500/10 to-indigo-500/5 dark:from-blue-500/10 dark:to-indigo-500/5",
//       border: "border-blue-500/20 dark:border-blue-500/20",
//       textColor: "text-blue-600 dark:text-blue-400",
//     },
//     {
//       name: "Online Hours",
//       value: "6.8 hrs",
//       desc: "Active shift",
//       icon: Clock,
//       bg: "from-purple-500/10 to-pink-500/5 dark:from-purple-500/10 dark:to-pink-500/5",
//       border: "border-purple-500/20 dark:border-purple-500/20",
//       textColor: "text-purple-600 dark:text-purple-400",
//     },
//     {
//       name: "Acceptance Rate",
//       value: "96.4%",
//       desc: "Excellent rating",
//       icon: Percent,
//       bg: "from-amber-500/10 to-orange-500/5 dark:from-amber-500/10 dark:to-orange-500/5",
//       border: "border-amber-500/20 dark:border-amber-500/20",
//       textColor: "text-amber-600 dark:text-amber-400",
//     },
//   ];

//   return (
//     <div className="space-y-8 max-w-7xl mx-auto">
//       {/* Top Welcome Alert */}
//       <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors duration-200 shadow-sm">
//         <div className="relative z-10 space-y-1">
//           <h2 className="text-2xl font-black text-gray-950 dark:text-white tracking-tight flex items-center gap-2">
//             Welcome back, {user?.name}! <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
//           </h2>
//           <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
//             You're currently connected. Keep the screen active to receive order alerts instantly.
//           </p>
//         </div>
//         <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs font-bold self-start md:self-auto uppercase tracking-wider animate-pulse">
//           <span className="w-2.5 h-2.5 bg-green-500 rounded-full inline-block" /> Live Server Connected
//         </div>
//       </div>

//       {/* Stats Section */}
//       <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
//         {stats.map((stat) => (
//           <div
//             key={stat.name}
//             className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl shadow-sm transition-transform duration-200 hover:-translate-y-1`}
//           >
//             <div className="flex justify-between items-start">
//               <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
//                 {stat.name}
//               </span>
//               <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
//             </div>
//             <div className="mt-4 space-y-1">
//               <h3 className="text-3xl font-black text-gray-950 dark:text-white">{stat.value}</h3>
//               <p className="text-xs text-gray-500 dark:text-gray-500 font-semibold">{stat.desc}</p>
//             </div>
//           </div>
//         ))}
//       </section>

//       {/* Incoming Orders Section (Phase 1 Grid) */}
//       <section className="space-y-4">
//         <div className="flex items-center gap-3">
//           <div className="relative flex h-3 w-3">
//             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
//             <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
//           </div>
//           <h2 className="text-xl font-extrabold text-gray-950 dark:text-white tracking-tight">
//             Incoming Orders ({pendingOrders.length})
//           </h2>
//         </div>

//         {pendingOrders.length === 0 ? (
//           <div className="bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
//             <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/30 flex items-center justify-center text-gray-400 dark:text-gray-500">
//               <Compass className="w-8 h-8 animate-spin" />
//             </div>
//             <div className="space-y-1 max-w-sm">
//               <h3 className="font-bold text-gray-900 dark:text-white text-base">Scanning for Orders</h3>
//               <p className="text-xs text-gray-605 dark:text-gray-500 font-medium">
//                 Wait times vary based on demand. Live notifications will sound automatically.
//               </p>
//             </div>
//           </div>
//         ) : (
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//             {pendingOrders.map((order) => {
//               const secondsLeft = timers[order.id] ?? 30;
//               const isCrit = secondsLeft < 10;
//               return (
//                 <div
//                   key={order.id}
//                   className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md dark:hover:border-red-950/40 relative overflow-hidden"
//                 >
//                   {/* Circular countdown visualization */}
//                   <div className="absolute top-4 right-4 flex items-center gap-2 bg-gray-50 dark:bg-gray-950 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-800">
//                     <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
//                       Expires in:
//                     </span>
//                     <span className={`text-xs font-black ${isCrit ? "text-red-500 animate-pulse" : "text-amber-600 dark:text-amber-400"}`}>
//                       {secondsLeft}s
//                     </span>
//                   </div>

//                   <div className="space-y-3">
//                     <div>
//                       <span className="text-[10px] text-red-650 dark:text-red-500 font-extrabold tracking-widest uppercase bg-red-100 dark:bg-red-950/30 px-2 py-0.5 rounded-md">
//                         NEW ORDER
//                       </span>
//                       <h4 className="text-base font-extrabold text-gray-905 dark:text-white mt-2">
//                         Order #{order.orderNumber}
//                       </h4>
//                     </div>

//                     <div className="space-y-2.5 pt-1 border-t border-gray-100 dark:border-gray-800/60">
//                       <div className="flex items-start gap-2.5">
//                         <Store className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
//                         <div>
//                           <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Vendor</p>
//                           <p className="text-[11px] text-gray-500 line-clamp-1">
//                             {order.vendor?.name || "Pro-Licious Vendor"}
//                           </p>
//                         </div>
//                       </div>

//                       <div className="flex items-start gap-2.5">
//                         <MapPin className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
//                         <div>
//                           <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Customer Location</p>
//                           <p className="text-[11px] text-gray-500 line-clamp-1">
//                             {order.address?.city || order.address?.area || "Local Area"}
//                           </p>
//                         </div>
//                       </div>
//                     </div>
//                   </div>

//                   <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
//                     <div>
//                       <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Payout</p>
//                       <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">₹{order.totalAmount || 120}</p>
//                     </div>

//                     <div className="flex gap-2 flex-1 max-w-[180px]">
//                       <button
//                         onClick={() => handleRejectOrder(order.id)}
//                         className="flex-1 py-2 px-3 border border-gray-200 dark:border-gray-800 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-200 dark:hover:border-red-900/30 text-gray-600 dark:text-gray-400 hover:text-red-650 dark:hover:text-red-400 font-bold text-xs rounded-xl transition duration-150"
//                       >
//                         Pass
//                       </button>
//                       <button
//                         onClick={() => handleAcceptOrder(order.id)}
//                         className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl transition duration-150 shadow-sm"
//                       >
//                         Accept
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </section>

//       {/* Bottom Main Content Panel (Active Order + History) */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
//         {/* Left Column: Active Order & Status */}
//         <section className="lg:col-span-2 space-y-4">
//           <h2 className="text-xl font-extrabold text-gray-955 dark:text-white tracking-tight">Active Delivery</h2>
          
//           {activeOrder ? (
//             <div className="bg-white dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm relative overflow-hidden">
//               <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-gray-100 dark:border-gray-800">
//                 <div className="space-y-1">
//                   <div className="flex items-center gap-2">
//                     <span className="text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded uppercase tracking-wider">
//                       {activeOrder.status}
//                     </span>
//                     <span className="text-xs text-gray-500 font-medium">
//                       Assigned {new Date(activeOrder.assignedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
//                     </span>
//                   </div>
//                   <h3 className="text-lg font-black text-gray-950 dark:text-white">Order #{activeOrder.orderNumber}</h3>
//                 </div>

//                 <Link
//                   href={`/rider-dashboard/track/${activeOrder.id}`}
//                   className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl transition duration-150 shadow-sm"
//                 >
//                   Open Live Tracking
//                   <Navigation className="w-3.5 h-3.5" />
//                 </Link>
//               </div>

//               {/* Progress Stepper representation */}
//               <div className="pt-6 space-y-4">
//                 <div className="flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-400">
//                   <span>Delivery Stage</span>
//                   <span className="text-red-500 font-extrabold">In Progress</span>
//                 </div>
//                 <div className="w-full bg-gray-200 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
//                   <div
//                     className="h-full bg-red-600 rounded-full transition-all duration-300"
//                     style={{
//                       width:
//                         activeOrder.status === "RIDER_ASSIGNED" || activeOrder.status === "ACCEPTED"
//                           ? "20%"
//                           : activeOrder.status === "ARRIVED_VENDOR"
//                           ? "45%"
//                           : activeOrder.status === "PICKED_UP"
//                           ? "70%"
//                           : "90%",
//                     }}
//                   />
//                 </div>
//                 <div className="grid grid-cols-4 text-[9px] font-bold text-gray-500 text-center uppercase tracking-widest">
//                   <span>Assigned</span>
//                   <span>Pickup</span>
//                   <span>Transit</span>
//                   <span>Deliver</span>
//                 </div>
//               </div>
//             </div>
//           ) : (
//             <div className="space-y-4">
//               <div className="h-[350px] relative rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm bg-gray-50 dark:bg-gray-900/20">
//                 <LeafletMap
//                   riderPosition={riderCoords}
//                   vendorPosition={null}
//                   customerPosition={null}
//                   className="w-full h-full absolute inset-0"
//                 />
                
//                 {/* Floating overlay on the dashboard map */}
//                 <div className="absolute bottom-4 left-4 right-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-gray-200 dark:border-gray-800 p-4 rounded-xl flex items-center justify-between shadow-lg z-[1000]">
//                   <div>
//                     <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block">Rider Telemetry</span>
//                     <p className="text-sm font-extrabold text-gray-955 dark:text-white flex items-center gap-1.5 mt-0.5">
//                       <span className={`w-2 h-2 rounded-full inline-block ${riderCoords ? "bg-green-500 animate-pulse" : "bg-amber-500 animate-pulse"}`} />
//                       {riderCoords ? "Live GPS Connected" : "Acquiring GPS Signal..."}
//                     </p>
//                   </div>
//                   <div className="text-right">
//                     <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block">Status</span>
//                     <span className="text-xs font-extrabold text-gray-950 dark:text-white bg-gray-50 dark:bg-gray-850 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-800">
//                       Scanning for Orders
//                     </span>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}
//         </section>

//         {/* Right Column: Recent Deliveries */}
//         <section className="space-y-4">
//           <div className="flex justify-between items-center">
//             <h2 className="text-xl font-extrabold text-gray-955 dark:text-white tracking-tight">Recent Deliveries</h2>
//             <Link
//               href="/rider-dashboard/history"
//               className="text-xs font-extrabold text-red-500 hover:text-red-400 transition flex items-center gap-1"
//             >
//               See All <ArrowRight className="w-3.5 h-3.5" />
//             </Link>
//           </div>

//           <div className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 divide-y divide-gray-100 dark:divide-gray-850 shadow-sm">
//             {recentDeliveries.length === 0 ? (
//               <p className="text-xs text-gray-500 font-semibold text-center py-6">
//                 No orders delivered today yet.
//               </p>
//             ) : (
//               recentDeliveries.map((del) => (
//                 <div key={del.id || del.orderNumber} className="py-3.5 flex items-center justify-between first:pt-1 last:pb-1">
//                   <div className="space-y-1">
//                     <p className="text-xs font-black text-gray-900 dark:text-white">#{del.orderNumber}</p>
//                     <p className="text-[10px] text-gray-500 font-medium">
//                       {new Date(del.assignedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
//                     </p>
//                   </div>
//                   <div className="text-right">
//                     <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">₹{del.totalAmount || 120}</p>
//                     <span className="text-[9px] font-bold text-gray-650 dark:text-gray-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 px-1.5 py-0.5 rounded uppercase">
//                       Delivered
//                     </span>
//                   </div>
//                 </div>
//               ))
//             )}
//           </div>
//         </section>
//       </div>
//     </div>
//   );
// }

"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { api } from "@/lib/axios";
import { riderApi } from "@/services/api";
import { getSocket } from "@/lib/socket";
import {
  TrendingUp,
  ClipboardList,
  Clock,
  Percent,
  AlertCircle,
  CheckCircle2,
  Navigation,
  ArrowRight,
  TrendingDown,
  Sparkles,
  MapPin,
  Store,
  Compass,
  UserCircle,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

// Lazy load map
const LeafletMap = dynamic(() => import("@/components/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
      <Compass className="w-8 h-8 text-gray-400 animate-spin" />
    </div>
  ),
});

interface Order {
  // Assignment details
  assignmentId: number;
  riderId?: number;
  assignmentStatus?: string; // PENDING, ASSIGNED, ACCEPTED, REJECTED, COMPLETED
  assignedAt?: string;
  acceptedAt?: string;
  completedAt?: string;
  
  // Order details
  id?: number;
  orderId: number;
  orderNumber: string;
  customerId?: number;
  vendorId?: number;
  branchId?: number;
  orderRiderId?: number;
  addressId?: number;
  subtotal?: string | number;
  taxAmount?: string | number;
  deliveryFee?: string | number;
  platformFee?: string | number;
  discountAmount?: string | number;
  totalAmount?: string | number;
  orderStatus?: string; // PLACED, ACCEPTED, REJECTED, PICKED_UP, DELIVERED, COMPLETED, CANCELLED
  status?: string; // Fallback for backwards compatibility
  paymentMethod?: string;
  orderCreatedAt?: string;
  orderUpdatedAt?: string;
  
  // Related data
  items?: any[];
  address?: any;
  vendor?: any;
  customer?: any;
}

interface Earnings {
  totalEarnings?: number;
  today?: number;
  count?: number;
  distance?: string;
}

export default function RiderDashboard() {
  const router = useRouter();
  const { isAuthenticated, user, token } = useSelector(
    (state: RootState) => state.auth
  );

  // State management
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [recentDeliveries, setRecentDeliveries] = useState<Order[]>([]);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [isOnline, setIsOnline] = useState(false);
  const [timers, setTimers] = useState<{ [key: number]: number }>({});
  const [riderCoords, setRiderCoords] = useState<[number, number] | null>(null);
  
  const socketRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const lastLocationSyncRef = useRef<number>(0);
  const lastFetchRef = useRef<number>(0);

  // ============ SOUND NOTIFICATION ============
  const playNotificationSound = () => {
    try {
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      
      // Create three beeps
      const frequencies = [880, 1000, 1100];
      let startTime = ctx.currentTime;
      
      frequencies.forEach((freq, index) => {
        const time = startTime + index * 0.15;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.1);
      });
    } catch (err) {
      console.warn("Sound notification failed:", err);
    }
  };

  // ============ FETCH RIDER DATA ============
 const fetchRiderData = async (force = false, isInitial = false) => {
  try {
    const now = Date.now();

    if (!force && now - lastFetchRef.current < 10000) {
      console.log("Skipping fetch - throttled");
      return;
    }

    lastFetchRef.current = now;

    if (isInitial) {
      setLoading(true);
    }
    setError("");

    let ordersRes: any = null;
    let earningsRes: any = null;

    try {
      ordersRes = await api.get("/api/rider/orders");
    } catch (err) {
      console.error("Orders API Error:", err);
    }

    try {
      earningsRes = await api.get("/api/rider/earnings/summary");
    } catch (err) {
      console.error("Earnings API Error:", err);
    }

    // =========================
    // Orders Extraction
    // =========================
    let ordersData: Order[] = [];

    const ordersRaw = ordersRes?.data;

    if (Array.isArray(ordersRaw)) {
      ordersData = ordersRaw;
    } else if (Array.isArray(ordersRaw?.data)) {
      ordersData = ordersRaw.data;
    } else if (Array.isArray(ordersRaw?.orders)) {
      ordersData = ordersRaw.orders;
    } else if (Array.isArray(ordersRaw?.result)) {
      ordersData = ordersRaw.result;
    }

    console.log("Orders Data:", ordersData);

    // =========================
    // Deduplicate Orders
    // =========================
    const orderMap = new Map<number, Order>();

    for (const order of ordersData) {
      const key = order.orderId || order.id || 0;
      orderMap.set(key, order);
    }

    ordersData = Array.from(orderMap.values());

    // =========================
    // Earnings
    // =========================
    const earningsData =
      earningsRes?.data?.data ||
      earningsRes?.data ||
      {};

    setAllOrders(ordersData);
    setEarnings(earningsData);

    if (typeof earningsData.isOnline === "boolean") {
      setIsOnline(earningsData.isOnline);
    }

    // =========================
    // Pending Orders
    // =========================
    const pending = ordersData.filter((order) => {
      if (!order) return false;

      const assignmentStatus =
        order.assignmentStatus?.toUpperCase() || "";

      return (
        assignmentStatus === "ASSIGNED" ||
        assignmentStatus === "PENDING"
      );
    });

    console.log("Pending Orders:", pending);

    setPendingOrders(pending);

    if (pending.length > 0) {
      setTimers((prev) => {
        const next = { ...prev };

        pending.forEach((order) => {
          const id = order.orderId || order.id;

          if (id && !(id in next)) {
            next[id] = 30;
          }
        });

        return next;
      });
    }

    // =========================
    // Active Order
    // =========================
    const active = ordersData.find((order) => {
      if (!order) return false;

      const assignmentStatus =
        order.assignmentStatus?.toUpperCase() || "";

      const orderStatus =
        (
          order.orderStatus ||
          order.status ||
          ""
        ).toUpperCase();

      return (
        assignmentStatus === "ACCEPTED" &&
        ![
          "DELIVERED",
          "COMPLETED",
          "REJECTED",
          "CANCELLED",
        ].includes(orderStatus)
      );
    });

    console.log("Active Order:", active);

    setActiveOrder(active || null);

    // =========================
    // Recent Deliveries
    // =========================
    const seenOrderIds = new Set<number>();

    const delivered = ordersData
      .filter((order) => {
        if (!order) return false;

        const status =
          (
            order.orderStatus ||
            order.status ||
            ""
          ).toUpperCase();

        return (
          status === "DELIVERED" ||
          status === "COMPLETED"
        );
      })
      .sort(
        (a, b) =>
          new Date(b.assignedAt || 0).getTime() -
          new Date(a.assignedAt || 0).getTime()
      )
      .filter((order) => {
        const key =
          order.orderId ||
          order.id ||
          0;

        if (seenOrderIds.has(key)) {
          return false;
        }

        seenOrderIds.add(key);
        return true;
      })
      .slice(0, 5);

    console.log(
      "Recent Deliveries:",
      delivered
    );

    setRecentDeliveries(delivered);

  } catch (err: any) {
    console.error("Fetch Error:", err);

    const errorMsg =
      err?.response?.data?.message ||
      "Failed to load rider dashboard";

    setError(errorMsg);
  } finally {
    setLoading(false);
  }
};

  // ============ HANDLE TOGGLE AVAILABILITY ============
  const handleToggleAvailability = async () => {
    try {
      const nextOnline = !isOnline;
      await riderApi.toggleAvailability(nextOnline);
      setIsOnline(nextOnline);

      // Sync via Socket.io
      const socket = socketRef.current;
      if (socket && socket.connected) {
        if (nextOnline) {
          socket.emit("rider_go_online", { riderId: user?.id ? Number(user.id) : undefined });
        } else {
          socket.emit("rider_go_offline", { riderId: user?.id ? Number(user.id) : undefined });
        }
      }
    } catch (err: any) {
      console.error("Failed to toggle availability:", err);
      const msg = err.response?.data?.message || "Failed to update availability status.";
      alert(msg);
    }
  };

  // ============ INIT AND AUTO-REFRESH ============
  useEffect(() => {
    if (!isAuthenticated || !token) {
      router.push("/login");
      return;
    }

    // Initial fetch
    fetchRiderData(true, true);

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchRiderData();
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, token, router]);

  // ============ GEOLOCATION TRACKING ============
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    if (!navigator.geolocation) {
      console.warn("Geolocation not supported");
      return;
    }

    // Get initial location
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setRiderCoords([latitude, longitude]);
        console.log("Initial location:", latitude, longitude);
      },
      (err) => console.warn("Initial geolocation error:", err),
      { enableHighAccuracy: true }
    );

    // Watch location
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setRiderCoords([latitude, longitude]);

        // Sync to backend every 15 seconds
        const now = Date.now();
        if (now - lastLocationSyncRef.current >= 15000) {
          lastLocationSyncRef.current = now;
          api.post("/api/rider/location/update", { latitude, longitude }).catch((e) => {
            console.warn("Location sync failed:", e);
          });
        }
      },
      (err) => console.warn("Watch position error:", err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isAuthenticated, token]);

  // ============ SOCKET.IO SETUP ============
  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const socket = getSocket(token);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    // New order assigned to this rider
    socket.on("new_order_assigned", (data: any) => {
      console.log("New order assigned event:", data);
      playNotificationSound();
      fetchRiderData(true); // Force refresh
    });

    // Some backend implementations emit this event name when a rider is assigned
    socket.on("rider_assigned_to_order", (data: any) => {
      console.log("Rider assigned to order (alt event):", data);
      playNotificationSound();
      fetchRiderData(true);
    });

    // Older/other server variants may use a simpler event name
    socket.on("rider_assigned", (data: any) => {
      console.log("Rider assigned (fallback event):", data);
      playNotificationSound();
      fetchRiderData(true);
    });

    // Pending assignments on connection
    socket.on("pending_assignments", (data: any) => {
      console.log("Pending assignments:", data);
      if (data?.assignments?.length > 0) {
        playNotificationSound();
        fetchRiderData(true); // Force refresh
      }
    });

    // Order status changed
    socket.on("order_status_changed", (data: any) => {
      console.log("Order status changed:", data);
      fetchRiderData(true); // Force refresh
    });

    // Delivery confirmed
    socket.on("delivery_confirmed", (data: any) => {
      console.log("Delivery confirmed:", data);
      fetchRiderData(true); // Force refresh
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    socket.on("error", (err: any) => {
      console.error("Socket error:", err);
    });

    return () => {
      socket.off("new_order_assigned");
      socket.off("rider_assigned_to_order");
      socket.off("rider_assigned");
      socket.off("pending_assignments");
      socket.off("order_status_changed");
      socket.off("delivery_confirmed");
      socket.disconnect();
    };
  }, [isAuthenticated, token]);

  // ============ COUNTDOWN TIMERS ============
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setTimers((prev) => {
        const next = { ...prev };
        let anyUpdated = false;

        Object.keys(next).forEach((key) => {
          const id = Number(key);
          if (next[id] > 0) {
            next[id] -= 1;
            anyUpdated = true;

            // Auto-reject when timer hits 0
            if (next[id] === 0) {
              handleRejectOrder(id);
              delete next[id];
            }
          }
        });

        return anyUpdated ? next : prev;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, []);

  // ============ HANDLE ACCEPT ORDER ============
  // ============ HANDLE ACCEPT ORDER ============
  const handleAcceptOrder = async (orderId: number) => {
    try {
      await riderApi.acceptOrder(orderId);
      console.log("Accept order successful");

      // Remove from pending
      setPendingOrders((prev) => prev.filter((o) => (o.orderId || o.id) !== orderId));
      setTimers((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });

      // Fetch fresh data to get the updated order
      await fetchRiderData(true);

      // Redirect to tracking page with order ID
      setTimeout(() => {
        router.push(`/rider-dashboard/track/${orderId}`);
      }, 500);
    } catch (err: any) {
      console.error("Accept order error:", err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to accept order. Please try again.";
      setError(msg);
      alert(msg);
    }
  };

  // ============ HANDLE REJECT ORDER ============
  const handleRejectOrder = async (orderId: number) => {
    try {
      await riderApi.rejectOrder(orderId);
      console.log("Reject order successful");

      // Remove from pending
      setPendingOrders((prev) => prev.filter((o) => (o.orderId || o.id) !== orderId));
      setTimers((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    } catch (err: any) {
      console.error("Reject order error:", err);
      const httpStatus = err.response?.status;
      // If endpoint missing (404) or other recoverable error, refresh rider data
      if (httpStatus === 404) {
        // Backend may not support explicit reject; refresh to clear stale pending
        await fetchRiderData(true);
        setPendingOrders((prev) => prev.filter((o) => (o.orderId || o.id) !== orderId));
        setTimers((prev) => {
          const next = { ...prev };
          delete next[orderId];
          return next;
        });
        alert("Action not available on server; refreshed orders.");
        return;
      }

      const msg = err.response?.data?.message || err.message || "Failed to reject order.";
      alert(msg);
    }
  };

  // ============ STATS DATA ============
  const stats = [
    {
      name: "Today's Earnings",
      value: `₹${earnings?.today || earnings?.totalEarnings || 0}`,
      desc: earnings?.today ? "Updated now" : "No earnings yet",
      icon: TrendingUp,
    },
    {
      name: "Today's Deliveries",
      value: `${earnings?.count || 0}`,
      desc: "Orders completed",
      icon: ClipboardList,
    },
    {
      name: "Status",
      value: isOnline ? "ONLINE" : "OFFLINE",
      desc: isOnline ? "Ready for orders" : "Go online to receive orders",
      icon: Clock,
    },
    {
      name: "Acceptance Rate",
      value: "96%",
      desc: "Excellent rating",
      icon: Percent,
    },
  ];

  // ============ LOADING STATE ============
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin">
            <Compass className="w-12 h-12 text-red-600" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  // ============ RENDER ============
  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-6">
      {/* Welcome Alert */}
      <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-950 dark:text-white flex items-center gap-2">
            Welcome back, {user?.name}!{" "}
            <Sparkles className="w-5 h-5 text-amber-500" />
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            Keep the screen active to receive order alerts instantly.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={handleToggleAvailability}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold uppercase transition-all flex items-center gap-2 border shadow-sm cursor-pointer ${
              isOnline
                ? "bg-emerald-600 border-emerald-500 hover:bg-emerald-700 text-white"
                : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-white animate-pulse" : "bg-gray-400 dark:bg-gray-600"}`} />
            {isOnline ? "Go Offline" : "Go Online"}
          </button>
          
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs font-bold uppercase">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
            Live Connected
          </div>

          <Link
            href="/rider-dashboard/profile"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold transition-colors"
          >
            <UserCircle className="w-4 h-4" />
            My Profile
          </Link>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300 font-medium">
            {error}
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-xl shadow-sm hover:shadow-md transition"
          >
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                {stat.name}
              </span>
              <stat.icon className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-3xl font-bold text-gray-950 dark:text-white mb-1">
              {stat.value}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              {stat.desc}
            </p>
          </div>
        ))}
      </section>

      {/* Pending Orders Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-950 dark:text-white">
            Incoming Orders ({pendingOrders.length})
          </h2>
        </div>

        {pendingOrders.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
            <Compass className="w-12 h-12 text-gray-400  animate-spin" />
            <div className="space-y-1">
              <h3 className="font-bold text-gray-900 dark:text-white">
                No Orders Yet
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 max-w-sm">
                Turn on your availability and wait for incoming orders. You'll
                receive notifications instantly.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingOrders.map((order, idx) => {
              const secondsLeft = timers[order.orderId || order.assignmentId] ?? 30;
              const isCrit = secondsLeft < 10;

              return (
                <div
                  key={`pending-${order.assignmentId || order.orderId || idx}-${idx}`}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md transition flex flex-col"
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                    <div>
                      <p className="text-xs font-bold text-red-600 uppercase">
                        NEW ORDER
                      </p>
                      <h4 className="text-base font-bold text-gray-900 dark:text-white mt-1">
                        #{order.orderNumber}
                      </h4>
                    </div>
                    <div
                      className={`text-xs font-bold ${
                        isCrit
                          ? "text-red-600 dark:text-red-400 animate-pulse"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {secondsLeft}s
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 mb-4 flex-grow">
                    <div className="flex items-start gap-2">
                      <Store className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-600 dark:text-gray-400 font-bold">
                          Vendor
                        </p>
                        <p className="text-xs text-gray-900 dark:text-white font-bold truncate">
                          {order.vendor?.name || "Restaurant"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-600 dark:text-gray-400 font-bold">
                          Customer
                        </p>
                        <p className="text-xs text-gray-900 dark:text-white font-bold truncate">
                          {order.address?.city || "Local Area"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-bold">
                        Payout
                      </p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">
                        ₹{order.totalAmount || 120}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-1">
                      <button
                        onClick={() => handleRejectOrder(order.orderId)}
                        className="flex-1 py-2 px-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-lg transition"
                      >
                        Pass
                      </button>
                      <button
                        onClick={() => handleAcceptOrder(order.orderId)}
                        className="flex-1 py-2 px-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Order */}
        <section className="lg:col-span-2">
          <h2 className="text-xl font-bold text-gray-950 dark:text-white mb-4">
            Active Delivery
          </h2>

          {activeOrder ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800 mb-4">
                <div>
                  <span className="text-xs font-bold bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 px-2 py-1 rounded uppercase">
                    {activeOrder.orderStatus || activeOrder.status}
                  </span>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-2">
                    Order #{activeOrder.orderNumber}
                  </h3>
                </div>
                <Link
                  href={`/rider-dashboard/track/${activeOrder.orderId || activeOrder.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-lg transition"
                >
                  Live Tracking
                  <Navigation className="w-4 h-4" />
                </Link>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                    Delivery Progress
                  </span>
                  <span className="text-xs font-bold text-red-600 dark:text-red-400">
                    In Progress
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-600 transition-all"
                    style={{
                      width:
                        (activeOrder.orderStatus || activeOrder.status) === "PICKED_UP" ? "60%" : "40%",
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="h-96 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm relative">
              {riderCoords ? (
                <LeafletMap
                  riderPosition={riderCoords}
                  vendorPosition={null}
                  customerPosition={null}
                />
              ) : (
                <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Compass className="w-8 h-8 text-gray-400 animate-spin" />
                </div>
              )}

              <div className="absolute bottom-4 left-4 right-4 bg-white dark:bg-gray-900 rounded-lg p-3 shadow-lg border border-gray-200 dark:border-gray-800 z-10">
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase">
                  Status
                </p>
                <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Waiting for orders...
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Recent Deliveries */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-950 dark:text-white">
              Recent Deliveries
            </h2>
            <Link
              href="/rider-dashboard/history"
              className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
            >
              View All →
            </Link>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
            {recentDeliveries.length === 0 ? (
              <p className="text-xs text-gray-600 dark:text-gray-400 text-center py-6 font-medium">
                No deliveries yet
              </p>
            ) : (
              <div className="space-y-3">
                {Array.from(new Map(recentDeliveries.map(o => [o.orderId || o.id, o])).values()).map((order, idx) => (
                  <div
                    key={`delivery-${order.orderId || order.id || idx}-${idx}`}
                    className="flex justify-between items-start pb-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0 last:pb-0"
                  >
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">
                        #{order.orderNumber}
                      </p>
                      <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">
                        {new Date(
                          order.assignedAt || order.orderCreatedAt || ""
                        ).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600 dark:text-green-400">
                        ₹{order.totalAmount || 120}
                      </p>
                      <p className="text-[10px] text-gray-600 dark:text-gray-400 font-bold uppercase mt-0.5">
                        Delivered
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}