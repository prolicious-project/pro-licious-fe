import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

let socket: Socket | null = null;

export const initSocket = (token?: string) => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      // allow polling fallback to ensure the initial handshake works in environments
      // where a direct websocket connection is blocked or requires upgrade
      transports: ["polling", "websocket"],
      autoConnect: false,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
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

