import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

let socket: Socket | null = null;

export const initSocket = (token?: string) => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["polling", "websocket"],
      autoConnect: false,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      extraHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    // Global connection handlers
    socket.on("connect", () => {
      console.log("✅ Socket.io connected:", socket?.id);
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket.io disconnected");
    });

    socket.on("connect_error", (error) => {
      console.error("🔴 Socket connection error:", error);
    });
  }
  return socket;
};

export const getSocket = (token?: string) => {
  if (!socket) {
    return initSocket(token);
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const reconnectSocket = (token?: string) => {
  disconnectSocket();
  return initSocket(token);
};

