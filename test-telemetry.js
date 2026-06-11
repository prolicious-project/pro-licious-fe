const { io } = require("socket.io-client");

const socket = io("http://localhost:5000", {
  transports: ["websocket"]
});

socket.on("connect", () => {
  console.log("🟢 Connected to Socket.IO server!");

  // 1. Emit a mock payment update event
  const mockPayment = {
    id: 99000 + Math.floor(Math.random() * 1000),
    orderId: 1, // Matches our seed order
    gateway: "RAZORPAY",
    paymentReference: "pay_live_" + Math.random().toString(36).substring(7),
    amount: "496.50",
    status: "SUCCESS",
    paymentMode: "UPI",
    createdAt: new Date().toISOString()
  };
  
  console.log("💸 Emitting mock payment status:", mockPayment);
  socket.emit("payment_status", mockPayment);

  // 2. Simulate rider location update path on the map (Hyderabad Gachibowli -> Jubilee Hills)
  let lat = 17.4483;
  let lng = 78.3488;
  let step = 0;

  console.log("🚴 Starting live rider location updates...");
  const interval = setInterval(() => {
    // Incrementally move towards customer coordinates (17.4325, 78.4071)
    lat += (17.4325 - 17.4483) / 10;
    lng += (78.4071 - 78.3488) / 10;

    console.log(`📍 Step ${step + 1}: Emitting lat=${lat.toFixed(6)}, lng=${lng.toFixed(6)}`);
    
    socket.emit("rider_location_update", {
      orderId: 1,
      riderId: 1,
      latitude: lat,
      longitude: lng
    });

    step++;
    if (step >= 10) {
      clearInterval(interval);
      console.log("✅ Simulation finished. Disconnecting in 1 second...");
      setTimeout(() => socket.disconnect(), 1000);
    }
  }, 1000);
});

socket.on("disconnect", () => {
  console.log("🔴 Disconnected from server.");
});
