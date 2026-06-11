const { io } = require('socket.io-client');
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
const socket = io(SOCKET_URL, { transports: ['polling', 'websocket'], autoConnect: true });

socket.on('connect', () => {
  console.log('Connected to socket server, id=', socket.id);
  const payload = { orderId: Number(process.env.ORDER_ID || 31), vendorId: 1, riderId: 2 };
  console.log('Emitting assign_rider_to_order with', payload);
  socket.emit('assign_rider_to_order', payload);
  setTimeout(() => {
    console.log('Done. Disconnecting.');
    socket.disconnect();
    process.exit(0);
  }, 1000);
});

socket.on('connect_error', (err) => {
  console.error('Connect error:', err);
  process.exit(1);
});

socket.on('rider_assigned_to_order', (data) => {
  console.log('Received rider_assigned_to_order event:', data);
});

socket.on('error', (err) => console.error('Socket error:', err));
